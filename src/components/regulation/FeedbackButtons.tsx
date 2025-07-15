'use client';

import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Check, X } from 'lucide-react';
import { RegulationFeedback } from '@/lib/regulationFeedback';

interface FeedbackButtonsProps {
  messageId: string;
  searchTerm: string;
  responsePreview: string;
  processingTime?: number;
  citationsCount?: number;
  documentTypes?: string[];
  currentUser?: { id: string } | null;
  onFeedbackSubmitted?: (feedback: RegulationFeedback) => void;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
  messageId,
  searchTerm,
  responsePreview,
  processingTime,
  citationsCount,
  documentTypes,
  currentUser,
  onFeedbackSubmitted
}) => {
  const [currentFeedback, setCurrentFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load existing feedback when component mounts
  useEffect(() => {
    if (currentUser) {
      loadExistingFeedback();
    }
  }, [currentUser, messageId]);

  const loadExistingFeedback = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/regulation/feedback?user_id=${currentUser.id}&message_id=${messageId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setCurrentFeedback(result.data.feedback_type);
        setComment(result.data.feedback_comment || '');
      }
    } catch (error) {
      console.error('Error loading existing feedback:', error);
    }
  };

  const handleFeedbackClick = async (feedbackType: 'positive' | 'negative') => {
    if (!currentUser) {
      alert('Please sign in to provide feedback');
      return;
    }

    // If clicking the same button, remove feedback
    if (currentFeedback === feedbackType) {
      await removeFeedback();
      return;
    }

    // If it's negative feedback, show comment dialog
    if (feedbackType === 'negative') {
      setShowCommentDialog(true);
      return;
    }

    // For positive feedback, submit immediately
    await submitFeedback(feedbackType, '');
  };

  const submitFeedback = async (feedbackType: 'positive' | 'negative', feedbackComment: string = '') => {
    if (!currentUser) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/regulation/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          message_id: messageId,
          search_term: searchTerm,
          response_preview: responsePreview.slice(0, 200),
          feedback_type: feedbackType,
          feedback_comment: feedbackComment,
          processing_time: processingTime,
          citations_count: citationsCount,
          document_types: documentTypes
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentFeedback(feedbackType);
        setComment(feedbackComment);
        setShowCommentDialog(false);
        setShowSuccess(true);
        
        if (onFeedbackSubmitted && result.data) {
          onFeedbackSubmitted(result.data);
        }
        
        // Hide success message after 2 seconds
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        // Provide more helpful error message
        let errorMessage = 'Failed to submit feedback. ';
        if (result.message?.includes('relation') || result.message?.includes('table')) {
          errorMessage += 'Database not set up. Please run the SQL schema in Supabase first.';
        } else {
          errorMessage += result.message || 'Please try again.';
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('An error occurred while submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFeedback = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/regulation/feedback?user_id=${currentUser.id}&message_id=${messageId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentFeedback(null);
        setComment('');
        setShowSuccess(true);
        
        // Hide success message after 2 seconds
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        alert('Failed to remove feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error removing feedback:', error);
      alert('An error occurred while removing feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = () => {
    submitFeedback('negative', comment);
  };

  const handleCommentCancel = () => {
    setShowCommentDialog(false);
    setComment('');
  };

  if (!currentUser) {
    return null; // Don't show feedback buttons for unauthenticated users
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Thumbs Up Button */}
      <button
        onClick={() => handleFeedbackClick('positive')}
        disabled={isSubmitting}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          currentFeedback === 'positive'
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title="This response was helpful"
      >
        <ThumbsUp className="w-4 h-4" />
        <span className="hidden sm:inline">Helpful</span>
      </button>

      {/* Thumbs Down Button */}
      <button
        onClick={() => handleFeedbackClick('negative')}
        disabled={isSubmitting}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          currentFeedback === 'negative'
            ? 'bg-red-100 text-red-700 border border-red-300'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title="This response was not helpful"
      >
        <ThumbsDown className="w-4 h-4" />
        <span className="hidden sm:inline">Not helpful</span>
      </button>

      {/* Success indicator */}
      {showSuccess && (
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          <span>Feedback saved</span>
        </div>
      )}

      {/* Comment Dialog */}
      {showCommentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Help us improve</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              What went wrong with this response? Your feedback helps us improve the system.
            </p>
            
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what could be better..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              maxLength={500}
            />
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                {comment.length}/500 characters
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={handleCommentCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons; 