import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { faqChatService, ChatResponse } from '../../../../lib/faqChat';

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit) {
    rateLimitMap.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  // Reset count if window has passed
  if (now - userLimit.lastRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  // Check if under limit
  if (userLimit.count < RATE_LIMIT_MAX_REQUESTS) {
    userLimit.count += 1;
    userLimit.lastRequest = now;
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, question, conversation_id, user_message, conversation_history } = body;

    // DEBUG: Log the received body to debug 400 errors
    console.log(`🔍 FAQ API DEBUG - Received body:`, JSON.stringify(body, null, 2));

    if (!action) {
      console.log(`❌ FAQ API ERROR: No action provided`);
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Create Supabase client for server-side operations
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required for FAQ chat' }, { status: 401 });
    }

    // Rate limiting check
    const rateLimitKey = `faq_${user.id}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait before sending more messages.',
        rateLimitExceeded: true
      }, { status: 429 });
    }

    console.log(`📝 FAQ API: Processing ${action} action for user ${user.id}`);

    let response: ChatResponse;

    switch (action) {
      case 'create-conversation':
        // Create a lightweight FAQ conversation (DB-only operation)
        const { title, first_message } = body;
        
        console.log(`🔍 CREATE-CONVERSATION DEBUG (Lightweight):`);
        console.log(`- title: "${title}" (type: ${typeof title})`);
        console.log(`- first_message: "${first_message}" (type: ${typeof first_message})`);
        
        // No validation required - make optional for flexibility
        console.log(`💬 FAQ Create lightweight conversation`);
        
        // Create conversation using direct service call (DB-only)
        const conversationId = await faqChatService.createConversation({
          user_id: user.id,
          title: typeof title === 'string' && title.trim() ? title.trim() : 'New FAQ Chat',
          // Use first_message only for auto-generating title if title wasn't provided
          first_message: typeof first_message === 'string' ? first_message : ''
        });

        console.log(`✅ FAQ Conversation created (DB-only): ${conversationId}`);

        return NextResponse.json({
          success: true,
          data: { conversation_id: conversationId }
        });

      case 'ask':
        // Handle single FAQ question
        if (!question) {
          return NextResponse.json({ error: 'Question is required for ask action' }, { status: 400 });
        }

        console.log(`❓ FAQ Ask: "${question}"`);
        
        response = await faqChatService.processConversationalQuery(question, {
          user_id: user.id,
          conversation_id,
          conversation_history: conversation_history || []
        });
        
        console.log(`✅ FAQ Ask completed in ${response.processing_time}ms`);
        
        // Ensure no citations are ever returned to clients
        response.citations = [];
        
        return NextResponse.json({
          success: true,
          data: response
        });



      case 'add_message':
        // Add message to existing FAQ conversation
        if (!conversation_id || !user_message) {
          return NextResponse.json({ 
            error: 'Conversation ID and user message are required for add_message action' 
          }, { status: 400 });
        }

        console.log(`📩 FAQ Add Message to conversation ${conversation_id}: "${user_message}"`);
        
        response = await faqChatService.processConversationalQuery(user_message, {
          user_id: user.id,
          conversation_id,
          conversation_history: conversation_history || []
        });
        
        console.log(`✅ FAQ Message added in ${response.processing_time}ms`);
        
        // Ensure no citations are ever returned to clients  
        response.citations = [];
        
        return NextResponse.json({
          success: true,
          data: response
        });

      case 'get_conversations':
        // Get user's FAQ conversations
        console.log(`📋 FAQ Get conversations for user ${user.id}`);
        
        try {
          const conversations = await faqChatService.getUserConversations(user.id);
          return NextResponse.json({
            success: true,
            data: conversations
          });
        } catch (error) {
          console.error('❌ FAQ Error getting conversations:', error);
          return NextResponse.json({ error: 'Failed to retrieve FAQ conversations' }, { status: 500 });
        }

      case 'bookmark_message':
        // Bookmark a FAQ message
        const { message_id, bookmark_note } = body;
        
        if (!message_id) {
          return NextResponse.json({ error: 'Message ID is required for bookmarking' }, { status: 400 });
        }

        console.log(`🔖 FAQ Bookmark message ${message_id}`);
        
        try {
          // Insert bookmark into faq_bookmarks table
          const { data, error } = await supabase
            .from('faq_bookmarks')
            .insert({
              user_id: user.id,
              message_id,
              conversation_id,
              bookmark_note: bookmark_note || null
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          return NextResponse.json({ 
            success: true,
            bookmark: data,
            action: 'bookmark_message'
          });
        } catch (error) {
          console.error('❌ FAQ Error bookmarking message:', error);
          return NextResponse.json({ error: 'Failed to bookmark FAQ message' }, { status: 500 });
        }

      case 'submit_feedback':
        // Submit feedback on FAQ response
        const { feedback_type, feedback_text, response_helpful } = body;
        
        if (!message_id) {
          return NextResponse.json({ error: 'Message ID is required for feedback' }, { status: 400 });
        }

        console.log(`📝 FAQ Submit feedback for message ${message_id}: ${feedback_type}`);
        
        try {
          // Insert feedback into faq_feedback table
          const { data, error } = await supabase
            .from('faq_feedback')
            .insert({
              user_id: user.id,
              message_id,
              conversation_id,
              feedback_type,
              feedback_text: feedback_text || null,
              response_helpful: response_helpful || null
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          return NextResponse.json({ 
            success: true,
            feedback: data,
            action: 'submit_feedback'
          });
        } catch (error) {
          console.error('❌ FAQ Error submitting feedback:', error);
          return NextResponse.json({ error: 'Failed to submit FAQ feedback' }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ FAQ API Error:', error);
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : String(error));
    console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        console.log('🚫 Rate limit error detected');
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please try again later.',
          rateLimitExceeded: true 
        }, { status: 429 });
      }
      
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        console.log('🔐 Authentication error detected');
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error while processing FAQ request',
      success: false 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Handle GET requests for retrieving FAQ conversations or search history
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    switch (action) {
      case 'conversation-history':
        // Get conversation history (matching regulation API pattern)
        const conversationId = searchParams.get('conversation_id');
        if (!conversationId) {
          return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
        }

        console.log(`📖 FAQ Get conversation history for conversation ${conversationId}`);
        
        try {
          const history = await faqChatService.getConversationMessages(parseInt(conversationId));
          
          // Strip citations from all historical messages  
          const citationFreeHistory = history.map(message => ({
            ...message,
            citations: [] // Remove any stored citations from history
          }));
          
          return NextResponse.json({
            success: true,
            data: citationFreeHistory
          });
        } catch (error) {
          console.error('❌ FAQ Error getting conversation history:', error);
          return NextResponse.json({ error: 'Failed to retrieve FAQ conversation history' }, { status: 500 });
        }

      case 'get_search_history':
        console.log(`📋 FAQ Get search history for user ${user.id}`);
        
        try {
          const { data, error } = await supabase
            .from('faq_search_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            throw error;
          }

          return NextResponse.json({
            success: true,
            data: data || []
          });
        } catch (error) {
          console.error('❌ FAQ Error getting search history:', error);
          return NextResponse.json({ error: 'Failed to retrieve FAQ search history' }, { status: 500 });
        }

      case 'get_bookmarks':
        console.log(`🔖 FAQ Get bookmarks for user ${user.id}`);
        
        try {
          const { data, error } = await supabase
            .from('faq_bookmarks')
            .select(`
              *,
              faq_messages(
                id,
                content,
                role,
                created_at,
                citations
              ),
              faq_conversations(
                id,
                title,
                created_at
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            throw error;
          }

          return NextResponse.json({
            success: true,
            data: data || []
          });
        } catch (error) {
          console.error('❌ FAQ Error getting bookmarks:', error);
          return NextResponse.json({ error: 'Failed to retrieve FAQ bookmarks' }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ FAQ API GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 