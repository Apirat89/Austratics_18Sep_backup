import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, canAccessResource } from '@/lib/adminAuth';

// POST /api/admin/users/[id]/clear - Clear user data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = params.id;
    const body = await request.json();
    const { dataType, before } = body; // dataType: 'search-history', 'saved-items', 'conversations'

    const supabase = await createServerSupabaseClient();

    // Get user to check access and existence
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, company_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check access to this user
    if (!canAccessResource(authResult.user, userId, user.company_id)) {
      return NextResponse.json(
        { error: 'Access denied to this user' },
        { status: 403 }
      );
    }

    let result: any = {};
    const beforeDate = before ? new Date(before).toISOString() : null;

    switch (dataType) {
      case 'search-history': {
        // Get count before deletion for reporting
        let countQuery = supabase
          .from('search_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (beforeDate) {
          countQuery = countQuery.lt('ts', beforeDate);
        }

        const { count: beforeCount } = await countQuery;

        // Delete search history
        let deleteQuery = supabase
          .from('search_history')
          .delete()
          .eq('user_id', userId);

        if (beforeDate) {
          deleteQuery = deleteQuery.lt('ts', beforeDate);
        }

        const { error, count: deletedCount } = await deleteQuery;

        if (error) {
          console.error('Clear search history error:', error);
          return NextResponse.json(
            { error: 'Failed to clear search history' },
            { status: 500 }
          );
        }

        result = {
          message: `Search history cleared successfully`,
          itemsDeleted: beforeCount || 0,
          beforeDate: beforeDate || 'all',
          dataType: 'search-history'
        };
        break;
      }

      case 'saved-items': {
        const { itemType } = body; // Optional: specific item type to clear

        // Get count before deletion
        let countQuery = supabase
          .from('saved_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (itemType) {
          countQuery = countQuery.eq('item_type', itemType);
        }

        if (beforeDate) {
          countQuery = countQuery.lt('created_at', beforeDate);
        }

        const { count: beforeCount } = await countQuery;

        // Delete saved items
        let deleteQuery = supabase
          .from('saved_items')
          .delete()
          .eq('user_id', userId);

        if (itemType) {
          deleteQuery = deleteQuery.eq('item_type', itemType);
        }

        if (beforeDate) {
          deleteQuery = deleteQuery.lt('created_at', beforeDate);
        }

        const { error } = await deleteQuery;

        if (error) {
          console.error('Clear saved items error:', error);
          return NextResponse.json(
            { error: 'Failed to clear saved items' },
            { status: 500 }
          );
        }

        result = {
          message: `Saved items cleared successfully`,
          itemsDeleted: beforeCount || 0,
          itemType: itemType || 'all',
          beforeDate: beforeDate || 'all',
          dataType: 'saved-items'
        };
        break;
      }

      case 'conversations': {
        // Get count before deletion (including message counts)
        let countQuery = supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (beforeDate) {
          countQuery = countQuery.lt('created_at', beforeDate);
        }

        const { count: beforeCount } = await countQuery;

        // Get conversation IDs for message deletion
        let conversationQuery = supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId);

        if (beforeDate) {
          conversationQuery = conversationQuery.lt('created_at', beforeDate);
        }

        const { data: conversations } = await conversationQuery;

        // Delete associated messages first (if any)
        if (conversations && conversations.length > 0) {
          const conversationIds = conversations.map(c => c.id);
          
          // Delete messages from various message tables
          const messageDeletes = await Promise.allSettled([
            supabase.from('conversation_messages').delete().in('conversation_id', conversationIds),
            supabase.from('faq_messages').delete().in('conversation_id', conversationIds),
            supabase.from('regulation_messages').delete().in('conversation_id', conversationIds)
          ]);

          // Log any message deletion errors (non-critical)
          messageDeletes.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.warn(`Message deletion ${index} failed:`, result.reason);
            }
          });
        }

        // Delete conversations
        let deleteQuery = supabase
          .from('conversations')
          .delete()
          .eq('user_id', userId);

        if (beforeDate) {
          deleteQuery = deleteQuery.lt('created_at', beforeDate);
        }

        const { error } = await deleteQuery;

        if (error) {
          console.error('Clear conversations error:', error);
          return NextResponse.json(
            { error: 'Failed to clear conversations' },
            { status: 500 }
          );
        }

        result = {
          message: `Conversations cleared successfully`,
          itemsDeleted: beforeCount || 0,
          beforeDate: beforeDate || 'all',
          dataType: 'conversations'
        };
        break;
      }

      case 'all': {
        // Clear all user data
        const results = await Promise.allSettled([
          // Clear search history
          supabase.from('search_history').delete().eq('user_id', userId),
          // Clear saved items  
          supabase.from('saved_items').delete().eq('user_id', userId),
          // Clear conversations (messages will cascade delete)
          supabase.from('conversations').delete().eq('user_id', userId),
          // Clear API calls history
          supabase.from('api_calls').delete().eq('user_id', userId)
        ]);

        const errors = results.filter(r => r.status === 'rejected');
        
        if (errors.length > 0) {
          console.error('Clear all data errors:', errors);
          return NextResponse.json(
            { error: 'Failed to clear some user data' },
            { status: 500 }
          );
        }

        result = {
          message: 'All user data cleared successfully',
          dataType: 'all',
          clearedTypes: ['search-history', 'saved-items', 'conversations', 'api-calls']
        };
        break;
      }

      default: {
        return NextResponse.json(
          { error: `Unknown data type: ${dataType}` },
          { status: 400 }
        );
      }
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'user.clear_data',
      resource_type: 'user',
      resource_id: userId,
      details: {
        targetUser: user.email,
        dataType,
        beforeDate,
        result
      }
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Clear user data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 