import React from 'react';
import { Card } from '../ui/card';
import BackToMainButton from '../BackToMainButton';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface NewsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function NewsErrorState({ error, onRetry }: NewsErrorStateProps) {
  const getErrorDetails = (errorMessage: string) => {
    if (errorMessage.includes('fetch')) {
      return {
        title: 'Network Error',
        description: 'Unable to connect to news sources. Please check your internet connection.',
        suggestion: 'Try refreshing the page or check back later.',
      };
    }
    
    if (errorMessage.includes('404')) {
      return {
        title: 'Service Unavailable',
        description: 'The news service is temporarily unavailable.',
        suggestion: 'Our team has been notified. Please try again in a few minutes.',
      };
    }
    
    if (errorMessage.includes('timeout')) {
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete.',
        suggestion: 'The news sources might be experiencing high traffic. Please try again.',
      };
    }
    
    return {
      title: 'Error Loading News',
      description: errorMessage,
      suggestion: 'Please try refreshing the page. If the problem persists, contact support.',
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToMainButton />
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Aged Care News
            </h1>
            <p className="text-lg text-gray-600">
              Latest news from Australian health authorities and aged care industry
            </p>
          </div>
        </div>

        {/* Error Card */}
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {errorDetails.title}
              </h2>
              
              <p className="text-gray-600 mb-4">
                {errorDetails.description}
              </p>
              
              <p className="text-sm text-gray-500">
                {errorDetails.suggestion}
              </p>
            </div>

            {/* Error details (for debugging) */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Error Details:</h4>
              <code className="text-xs text-gray-600 break-all">
                {error}
              </code>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
              
              <a
                href="/main"
                className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Back to Main
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </Card>

          {/* Additional help */}
          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need Help?
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">Check Status</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Visit our status page to see if there are any known issues.
                </p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Service Status
                </button>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">Report Issue</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Let us know about this problem so we can fix it quickly.
                </p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Report Problem
                </button>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">Contact Support</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Get help from our support team if the issue persists.
                </p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Contact Us
                </button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 