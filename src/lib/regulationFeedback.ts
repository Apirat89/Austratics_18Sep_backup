import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface RegulationFeedback {
  id?: number;
  user_id?: string;
  message_id: string;
  search_term: string;
  response_preview?: string;
  feedback_type: 'positive' | 'negative';
  feedback_comment?: string;
  processing_time?: number;
  citations_count?: number;
  document_types?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackAnalytics {
  feedback_date: string;
  feedback_type: 'positive' | 'negative';
  feedback_count: number;
  avg_processing_time: number;
  avg_citations_count: number;
}

export interface UserFeedbackSummary {
  user_id: string;
  total_feedback: number;
  positive_feedback: number;
  negative_feedback: number;
  positive_percentage: number;
}

/**
 * Save feedback for a regulation chatbot response
 */
export async function saveRegulationFeedback(
  userId: string,
  feedback: Omit<RegulationFeedback, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; message: string; data?: RegulationFeedback }> {
  try {
    const { data, error } = await supabase
      .from('regulation_feedback')
      .insert({
        user_id: userId,
        message_id: feedback.message_id,
        search_term: feedback.search_term,
        response_preview: feedback.response_preview,
        feedback_type: feedback.feedback_type,
        feedback_comment: feedback.feedback_comment,
        processing_time: feedback.processing_time,
        citations_count: feedback.citations_count,
        document_types: feedback.document_types
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving regulation feedback:', error);
      return { success: false, message: 'Failed to save feedback' };
    }

    return { 
      success: true, 
      message: 'Feedback saved successfully', 
      data: data as RegulationFeedback 
    };
  } catch (error) {
    console.error('Error saving regulation feedback:', error);
    return { success: false, message: 'An error occurred while saving feedback' };
  }
}

/**
 * Get feedback for a specific message
 */
export async function getFeedbackForMessage(
  userId: string,
  messageId: string
): Promise<{ success: boolean; data?: RegulationFeedback; message?: string }> {
  try {
    const { data, error } = await supabase
      .from('regulation_feedback')
      .select('*')
      .eq('user_id', userId)
      .eq('message_id', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No feedback found for this message
        return { success: true, data: undefined };
      }
      console.error('Error getting feedback for message:', error);
      return { success: false, message: 'Failed to get feedback' };
    }

    return { success: true, data: data as RegulationFeedback };
  } catch (error) {
    console.error('Error getting feedback for message:', error);
    return { success: false, message: 'An error occurred while getting feedback' };
  }
}

/**
 * Update existing feedback
 */
export async function updateRegulationFeedback(
  userId: string,
  messageId: string,
  updates: Partial<Pick<RegulationFeedback, 'feedback_type' | 'feedback_comment'>>
): Promise<{ success: boolean; message: string; data?: RegulationFeedback }> {
  try {
    const { data, error } = await supabase
      .from('regulation_feedback')
      .update(updates)
      .eq('user_id', userId)
      .eq('message_id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating regulation feedback:', error);
      return { success: false, message: 'Failed to update feedback' };
    }

    return { 
      success: true, 
      message: 'Feedback updated successfully', 
      data: data as RegulationFeedback 
    };
  } catch (error) {
    console.error('Error updating regulation feedback:', error);
    return { success: false, message: 'An error occurred while updating feedback' };
  }
}

/**
 * Delete feedback for a specific message
 */
export async function deleteRegulationFeedback(
  userId: string,
  messageId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('regulation_feedback')
      .delete()
      .eq('user_id', userId)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error deleting regulation feedback:', error);
      return { success: false, message: 'Failed to delete feedback' };
    }

    return { success: true, message: 'Feedback deleted successfully' };
  } catch (error) {
    console.error('Error deleting regulation feedback:', error);
    return { success: false, message: 'An error occurred while deleting feedback' };
  }
}

/**
 * Get user's feedback history
 */
export async function getUserFeedbackHistory(
  userId: string,
  limit: number = 50
): Promise<{ success: boolean; data?: RegulationFeedback[]; message?: string }> {
  try {
    const { data, error } = await supabase
      .from('regulation_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user feedback history:', error);
      return { success: false, message: 'Failed to get feedback history' };
    }

    return { success: true, data: data as RegulationFeedback[] };
  } catch (error) {
    console.error('Error getting user feedback history:', error);
    return { success: false, message: 'An error occurred while getting feedback history' };
  }
}

/**
 * Get feedback analytics (admin/analytics view)
 */
export async function getFeedbackAnalytics(
  days: number = 30
): Promise<{ success: boolean; data?: FeedbackAnalytics[]; message?: string }> {
  try {
    const { data, error } = await supabase
      .from('regulation_feedback_analytics')
      .select('*')
      .gte('feedback_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('feedback_date', { ascending: false });

    if (error) {
      console.error('Error getting feedback analytics:', error);
      return { success: false, message: 'Failed to get feedback analytics' };
    }

    return { success: true, data: data as FeedbackAnalytics[] };
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    return { success: false, message: 'An error occurred while getting feedback analytics' };
  }
}

/**
 * Get user feedback summary
 */
export async function getUserFeedbackSummary(
  userId: string
): Promise<{ success: boolean; data?: UserFeedbackSummary; message?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_feedback_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No feedback found for this user
        return { 
          success: true, 
          data: {
            user_id: userId,
            total_feedback: 0,
            positive_feedback: 0,
            negative_feedback: 0,
            positive_percentage: 0
          }
        };
      }
      console.error('Error getting user feedback summary:', error);
      return { success: false, message: 'Failed to get feedback summary' };
    }

    return { success: true, data: data as UserFeedbackSummary };
  } catch (error) {
    console.error('Error getting user feedback summary:', error);
    return { success: false, message: 'An error occurred while getting feedback summary' };
  }
}

/**
 * Clear old feedback (cleanup function)
 */
export async function clearOldFeedback(
  userId: string,
  olderThanDays: number = 90
): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('regulation_feedback')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Error clearing old feedback:', error);
      return { success: false, message: 'Failed to clear old feedback' };
    }

    return { 
      success: true, 
      message: 'Old feedback cleared successfully',
      deletedCount: data?.length || 0
    };
  } catch (error) {
    console.error('Error clearing old feedback:', error);
    return { success: false, message: 'An error occurred while clearing old feedback' };
  }
} 