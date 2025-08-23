import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  saveRegulationFeedback, 
  getFeedbackForMessage, 
  updateRegulationFeedback,
  deleteRegulationFeedback,
  getUserFeedbackHistory,
  getFeedbackAnalytics,
  getUserFeedbackSummary
} from '@/lib/regulationFeedback';

// Create Supabase client for server-side operations (currently unused but kept for future use)
const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/regulation/feedback
 * Submit feedback for a regulation chatbot response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_id, 
      message_id, 
      search_term, 
      response_preview, 
      feedback_type, 
      feedback_comment,
      processing_time,
      citations_count,
      document_types
    } = body;

    // Validate required fields
    if (!user_id || !message_id || !search_term || !feedback_type) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate feedback type
    if (!['positive', 'negative'].includes(feedback_type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Check if feedback already exists for this message
    const existingFeedback = await getFeedbackForMessage(user_id, message_id);
    
    if (existingFeedback.success && existingFeedback.data) {
      // Update existing feedback
      const result = await updateRegulationFeedback(user_id, message_id, {
        feedback_type,
        feedback_comment
      });
      
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } else {
      // Create new feedback
      const result = await saveRegulationFeedback(user_id, {
        message_id,
        search_term,
        response_preview,
        feedback_type,
        feedback_comment,
        processing_time,
        citations_count,
        document_types
      });
      
      return NextResponse.json(result, { status: result.success ? 201 : 400 });
    }
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/regulation/feedback?user_id=...&message_id=...
 * Get feedback for a specific message or user's feedback history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const message_id = searchParams.get('message_id');
    const action = searchParams.get('action'); // 'history', 'analytics', 'summary'
    const limit = parseInt(searchParams.get('limit') || '50');
    const days = parseInt(searchParams.get('days') || '30');

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'history':
        const historyResult = await getUserFeedbackHistory(user_id, limit);
        return NextResponse.json(historyResult, { status: historyResult.success ? 200 : 400 });
      
      case 'analytics':
        const analyticsResult = await getFeedbackAnalytics(days);
        return NextResponse.json(analyticsResult, { status: analyticsResult.success ? 200 : 400 });
      
      case 'summary':
        const summaryResult = await getUserFeedbackSummary(user_id);
        return NextResponse.json(summaryResult, { status: summaryResult.success ? 200 : 400 });
      
      default:
        if (message_id) {
          // Get feedback for specific message
          const result = await getFeedbackForMessage(user_id, message_id);
          return NextResponse.json(result, { status: result.success ? 200 : 400 });
        } else {
          // Get user's feedback history by default
          const historyResult = await getUserFeedbackHistory(user_id, limit);
          return NextResponse.json(historyResult, { status: historyResult.success ? 200 : 400 });
        }
    }
  } catch (error) {
    console.error('Error in feedback GET API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/regulation/feedback?user_id=...&message_id=...
 * Delete feedback for a specific message
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const message_id = searchParams.get('message_id');

    if (!user_id || !message_id) {
      return NextResponse.json(
        { success: false, message: 'User ID and Message ID are required' },
        { status: 400 }
      );
    }

    const result = await deleteRegulationFeedback(user_id, message_id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('Error in feedback DELETE API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 