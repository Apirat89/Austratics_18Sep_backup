import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, canAccessResource } from '@/lib/adminAuth';

// GET /api/admin/users/[id] - Get user details
export async function GET(
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
    const supabase = await createServerSupabaseClient();

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        status,
        company_id,
        last_login_at,
        last_seen_ip,
        created_at,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
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

    // Get auth user details
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    // Get usage statistics
    const [
      { count: apiCalls30d },
      { count: apiCalls7d },
      { count: apiCallsErrors },
      { data: recentApiCalls },
      { count: savedItemsCount },
      { count: searchHistoryCount },
      { count: conversationsCount }
    ] = await Promise.all([
      // API calls last 30 days
      supabase
        .from('api_calls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('ts', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // API calls last 7 days
      supabase
        .from('api_calls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('ts', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // API errors
      supabase
        .from('api_calls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('status_code', 400),
      
      // Recent API calls
      supabase
        .from('api_calls')
        .select('ts, endpoint, status_code, latency_ms, ip')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(10),
      
      // Saved items count
      supabase
        .from('saved_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Search history count
      supabase
        .from('search_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Conversations count
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);

    // Get saved data details
    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('item_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentSearches } = await supabase
      .from('search_history')
      .select('query, surface, ts')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(5);

    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('id, created_at, closed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate average latency
    const { data: latencyData } = await supabase
      .from('api_calls')
      .select('latency_ms')
      .eq('user_id', userId)
      .not('latency_ms', 'is', null);

    const avgLatency = latencyData && latencyData.length > 0
      ? Math.round(latencyData.reduce((sum, call) => sum + call.latency_ms, 0) / latencyData.length)
      : 0;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        companyId: user.company_id,
        companyName: user.companies?.[0]?.name || 'No Company',
        lastLoginAt: user.last_login_at,
        lastSeenIp: user.last_seen_ip,
        createdAt: user.created_at,
        emailVerified: !!authUser?.user?.email_confirmed_at,
        emailVerifiedAt: authUser?.user?.email_confirmed_at
      },
      usageStats: {
        apiCalls7d: apiCalls7d || 0,
        apiCalls30d: apiCalls30d || 0,
        errors: apiCallsErrors || 0,
        avgLatency
      },
      savedDataStats: {
        savedItems: savedItemsCount || 0,
        searchHistory: searchHistoryCount || 0,
        conversations: conversationsCount || 0
      },
      recentActivity: {
        apiCalls: recentApiCalls?.map(call => ({
          timestamp: call.ts,
          endpoint: call.endpoint,
          statusCode: call.status_code,
          latency: call.latency_ms,
          ip: call.ip
        })) || [],
        savedItems: savedItems?.map(item => ({
          type: item.item_type,
          createdAt: item.created_at
        })) || [],
        searches: recentSearches?.map(search => ({
          query: search.query,
          surface: search.surface,
          timestamp: search.ts
        })) || [],
        conversations: recentConversations?.map(conv => ({
          id: conv.id,
          createdAt: conv.created_at,
          closedAt: conv.closed_at
        })) || []
      }
    });

  } catch (error) {
    console.error('User detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
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
    const { role, status, companyId } = body;

    const supabase = await createServerSupabaseClient();

    // Get current user to check access
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check access to this user
    if (!canAccessResource(authResult.user, userId, currentUser.company_id)) {
      return NextResponse.json(
        { error: 'Access denied to this user' },
        { status: 403 }
      );
    }

    // Validation
    if (role && !['user', 'staff', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be user, staff, or owner' },
        { status: 400 }
      );
    }

    if (status && !['active', 'suspended', 'deleted'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be active, suspended, or deleted' },
        { status: 400 }
      );
    }

    // Only owners can change roles to owner or change company assignments
    if ((role === 'owner' || companyId) && authResult.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Owner privileges required for this operation' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (companyId !== undefined) updateData.company_id = companyId;

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        email,
        role,
        status,
        company_id,
        companies:company_id (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('User update error:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'user.update',
      resource_type: 'user',
      resource_id: userId,
      details: { updateData }
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        companyId: updatedUser.company_id,
        companyName: updatedUser.companies?.[0]?.name || 'No Company'
      }
    });

  } catch (error) {
    console.error('User update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
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

    // Only owners can delete users
    if (authResult.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Owner privileges required to delete users' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'soft'; // 'soft' or 'hard'

    const supabase = await createServerSupabaseClient();

    // Get user to check existence and get details
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

    if (mode === 'soft') {
      // Soft delete: mark as deleted, anonymize email
      const anonymizedEmail = `deleted+${userId}@example.invalid`;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'deleted',
          email: anonymizedEmail
        })
        .eq('id', userId);

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json(
          { error: 'Failed to soft delete user' },
          { status: 500 }
        );
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: authResult.user.id,
        action: 'user.soft_delete',
        resource_type: 'user',
        resource_id: userId,
        details: { originalEmail: user.email, mode: 'soft' }
      });

      return NextResponse.json({
        message: 'User soft deleted successfully',
        mode: 'soft'
      });

    } else if (mode === 'hard') {
      // Hard delete: remove all data
      try {
        // Delete in correct order due to foreign key constraints
        await supabase.from('search_history').delete().eq('user_id', userId);
        await supabase.from('saved_items').delete().eq('user_id', userId);
        await supabase.from('conversations').delete().eq('user_id', userId);
        await supabase.from('api_calls').delete().eq('user_id', userId);
        
        // Delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) {
          console.error('Auth user deletion error:', authError);
        }

        // Delete profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('Profile deletion error:', profileError);
          return NextResponse.json(
            { error: 'Failed to hard delete user' },
            { status: 500 }
          );
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
          user_id: authResult.user.id,
          action: 'user.hard_delete',
          resource_type: 'user',
          resource_id: userId,
          details: { originalEmail: user.email, mode: 'hard' }
        });

        return NextResponse.json({
          message: 'User hard deleted successfully',
          mode: 'hard'
        });

      } catch (deleteError) {
        console.error('Hard delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to hard delete user' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid delete mode' },
      { status: 400 }
    );

  } catch (error) {
    console.error('User deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 