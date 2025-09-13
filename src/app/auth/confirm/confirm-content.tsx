'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../../lib/supabase';

export default function ConfirmPageContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Check for hash fragments (like #error=access_denied)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashError = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (hashError) {
            console.log('Hash error found:', hashError, errorDescription);
            const errorMsg = errorDescription || hashError;
            setError(errorMsg.replace(/\+/g, ' '));
            setLoading(false);
            return;
          }
        }

        // Check query parameters
        const code = searchParams?.get('code');
        const token_hash = searchParams?.get('token_hash');
        const type = searchParams?.get('type');
        const next = searchParams?.get('next') || '/dashboard';
        
        console.log('Auth confirm page params:', { code, token_hash, type, next });

        if (!code && !token_hash) {
          setError('Missing authentication parameters. Please request a new invitation link.');
          setLoading(false);
          return;
        }

        const supabase = createBrowserSupabaseClient();

        // Handle code-based flow
        if (code) {
          console.log('Processing code-based auth flow on client');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange failed:', exchangeError);
            setError(exchangeError.message);
            setLoading(false);
            return;
          }
          
          console.log('Code exchange successful, redirecting to:', next);
          router.replace(next.startsWith('/') ? next : '/dashboard');
          return;
        }

        // Handle token_hash flow
        if (token_hash && type) {
          console.log('Processing token_hash auth flow on client');
          const { error: verifyError } = await supabase.auth.verifyOtp({ 
            token_hash, 
            type: type as any 
          });
          
          if (verifyError) {
            console.error('Token verification failed:', verifyError);
            setError(verifyError.message);
            setLoading(false);
            return;
          }
          
          console.log('Token verification successful, redirecting to:', next);
          router.replace(next.startsWith('/') ? next : '/dashboard');
          return;
        }

      } catch (err) {
        console.error('Auth confirmation error:', err);
        setError('An unexpected error occurred during authentication.');
      } finally {
        setLoading(false);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900">Confirming your account...</h1>
          <p className="text-gray-600 mt-2">Please wait while we process your invitation.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Go to Home
            </button>
            
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition-colors"
            >
              Sign In
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>Need a new invitation? Contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h1 className="text-xl font-semibold text-gray-900">Success!</h1>
        <p className="text-gray-600 mt-2">Redirecting you now...</p>
      </div>
    </div>
  );
} 