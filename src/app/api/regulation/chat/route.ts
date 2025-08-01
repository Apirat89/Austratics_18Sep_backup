import { NextRequest, NextResponse } from 'next/server';
import { RegulationChatService } from '@/lib/regulationChat';
import { createServerSupabaseClient } from '@/lib/supabase';

// Initialize the chat service
const chatService = new RegulationChatService();

export async function POST(request: NextRequest) {
  console.log('=====================================');
  console.log('🚀 REGULATION CHAT API ENDPOINT HIT');
  console.log('=====================================');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Time:', new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log('📦 Request body received:');
    console.log('  - Question:', body.question);
    console.log('  - Conversation ID:', body.conversation_id);
    console.log('  - Action:', body.action);
    console.log('  - History items:', body.conversation_history?.length || 0);
    console.log('=====================================');
    
    const { question, action, conversation_id, conversation_history } = body;

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('🔐 Authentication check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (authError || !user) {
      console.log('❌ Authentication failed, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle different actions
    if (action === 'create-conversation') {
      const { title, first_message } = body;
      
      if (!first_message || typeof first_message !== 'string') {
        return NextResponse.json(
          { error: 'First message is required for creating a conversation' },
          { status: 400 }
        );
      }

      const conversationId = await chatService.createConversation({
        user_id: user.id,
        title,
        first_message
      });

      return NextResponse.json({
        success: true,
        data: { conversation_id: conversationId }
      });
    }

    if (action === 'get-conversations') {
      const { limit = 20 } = body;
      
      const conversations = await chatService.getUserConversations(user.id, limit);
      
      return NextResponse.json({
        success: true,
        data: conversations
      });
    }

    if (action === 'get-conversation-history') {
      const { conversation_id: convId } = body;
      
      if (!convId) {
        return NextResponse.json(
          { error: 'Conversation ID is required' },
          { status: 400 }
        );
      }

      const history = await chatService.getConversationHistory(convId, user.id);
      
      return NextResponse.json({
        success: true,
        data: history
      });
    }

    // Default action: process conversational query
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate question length
    if (question.length > 1000) {
      return NextResponse.json(
        { error: 'Question is too long. Please keep it under 1000 characters.' },
        { status: 400 }
      );
    }

    console.log(`📝 Processing conversational question: "${question.substring(0, 100)}..."`);
    console.log(`📚 Conversation context: ID=${conversation_id}, History=${conversation_history?.length || 0} messages`);

    // Process the conversational query using the enhanced RAG service
    const response = await chatService.processConversationalQuery(question, {
      conversation_id,
      user_id: user.id,
      conversation_history: conversation_history || [],
      max_context_messages: 5
    });

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in regulation chat API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again.',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'document-types') {
      // Get available document types for filtering
      const documentTypes = await chatService.getDocumentTypes();
      
      return NextResponse.json({
        success: true,
        data: documentTypes
      });
    }

    if (action === 'conversations') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const limit = parseInt(searchParams.get('limit') || '20');
      const conversations = await chatService.getUserConversations(user.id, limit);
      
      return NextResponse.json({
        success: true,
        data: conversations
      });
    }

    if (action === 'conversation-history') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const conversationId = searchParams.get('conversation_id');
      if (!conversationId) {
        return NextResponse.json(
          { error: 'Conversation ID is required' },
          { status: 400 }
        );
      }

      const history = await chatService.getConversationHistory(parseInt(conversationId), user.id);
      
      return NextResponse.json({
        success: true,
        data: history
      });
    }

    // Handle individual message deletion
    if (action === 'delete-message') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const messageId = searchParams.get('message_id');
      if (!messageId) {
        return NextResponse.json(
          { error: 'Message ID is required' },
          { status: 400 }
        );
      }

      const success = await chatService.deleteMessage(parseInt(messageId), user.id);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Message deleted successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to delete message or message not found' },
          { status: 404 }
        );
      }
    }

    // Handle message bookmarking
    if (action === 'bookmark-message') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const messageId = searchParams.get('message_id');
      const bookmarked = searchParams.get('bookmarked') === 'true';
      
      if (!messageId) {
        return NextResponse.json(
          { error: 'Message ID is required' },
          { status: 400 }
        );
      }

      const success = await chatService.bookmarkMessage(parseInt(messageId), user.id, bookmarked);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: bookmarked ? 'Message bookmarked successfully' : 'Message bookmark removed successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to update message bookmark or message not found' },
          { status: 404 }
        );
      }
    }

    // Handle conversation bookmarking
    if (action === 'bookmark-conversation') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const conversationId = searchParams.get('conversation_id');
      const bookmarked = searchParams.get('bookmarked') === 'true';
      
      if (!conversationId) {
        return NextResponse.json(
          { error: 'Conversation ID is required' },
          { status: 400 }
        );
      }

      const success = await chatService.bookmarkConversation(parseInt(conversationId), user.id, bookmarked);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: bookmarked ? 'Conversation bookmarked successfully' : 'Conversation bookmark removed successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to update conversation bookmark or conversation not found' },
          { status: 404 }
        );
      }
    }

    // Handle conversation deletion
    if (action === 'delete-conversation') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const conversationId = searchParams.get('conversation_id');
      if (!conversationId) {
        return NextResponse.json(
          { error: 'Conversation ID is required' },
          { status: 400 }
        );
      }

      const success = await chatService.deleteConversation(parseInt(conversationId), user.id);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Conversation deleted successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to delete conversation or conversation not found' },
          { status: 404 }
        );
      }
    }

    // Handle unified bookmarks retrieval
    if (action === 'bookmarks') {
      // Get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const type = searchParams.get('type') || 'unified';
      const limit = parseInt(searchParams.get('limit') || '20');

      try {
        let bookmarks;
        
        switch (type) {
          case 'messages':
            bookmarks = await chatService.getBookmarkedMessages(user.id, limit);
            break;
          case 'conversations':
            bookmarks = await chatService.getBookmarkedConversations(user.id, limit);
            break;
          case 'unified':
          default:
            bookmarks = await chatService.getUnifiedBookmarks(user.id, limit);
            break;
        }

        return NextResponse.json({
          success: true,
          data: bookmarks,
          type: type
        });
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return NextResponse.json(
          { error: 'Failed to fetch bookmarks' },
          { status: 500 }
        );
      }
    }

    // Default GET response with API info
    return NextResponse.json({
      success: true,
      message: 'Regulation Chat API - Enhanced for Conversations',
      endpoints: {
        'POST /': 'Send a question to get an AI response with citations',
        'POST / (action: create-conversation)': 'Create a new conversation',
        'POST / (action: get-conversations)': 'Get user conversations',
        'POST / (action: get-conversation-history)': 'Get conversation history',
        'GET /?action=document-types': 'Get available document types for filtering',
        'GET /?action=conversations': 'Get user conversations',
        'GET /?action=conversation-history&conversation_id=X': 'Get conversation history',
        'GET /?action=delete-message&message_id=X': 'Delete a specific message',
        'GET /?action=bookmark-message&message_id=X&bookmarked=true/false': 'Bookmark/unbookmark a message',
        'GET /?action=bookmark-conversation&conversation_id=X&bookmarked=true/false': 'Bookmark/unbookmark a conversation',
        'GET /?action=delete-conversation&conversation_id=X': 'Delete a conversation',
        'GET /?action=bookmarks&type=unified/messages/conversations': 'Get user bookmarks'
      },
      usage: {
        'POST body (chat)': {
          question: 'string (required, max 1000 chars)',
          conversation_id: 'number (optional, for continuing conversation)',
          conversation_history: 'ChatMessage[] (optional, for context)',
          documentType: 'string (optional, filter by document type)'
        },
        'POST body (create-conversation)': {
          action: '"create-conversation"',
          title: 'string (optional)',
          first_message: 'string (required)'
        },
        'POST body (get-conversations)': {
          action: '"get-conversations"',
          limit: 'number (optional, default 20)'
        },
        'POST body (get-conversation-history)': {
          action: '"get-conversation-history"',
          conversation_id: 'number (required)'
        }
      }
    });

  } catch (error) {
    console.error('Error in regulation chat API GET:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
} 