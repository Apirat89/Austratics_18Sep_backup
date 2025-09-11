'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../../lib/supabase';

export default function ConfirmEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get both token_hash and type from URL - this comes from Supabase's verification email
        const token_hash = searchParams?.get('token_hash');
        const type = searchParams?.get('type');
        
        // If there's no token_hash or type, it might be an incorrect link
        if (!token_hash || !type) {
          console.log('Missing token_hash or type in params:', { token_hash, type });
          
          // Try the legacy token param as fallback
          const token = searchParams?.get('token');
          if (token) {
            console.log('Found legacy token param, attempting verification');
            const supabase = createBrowserSupabaseClient();
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'email',
            });
            
            if (!error) {
              setStatus('success');
              setMessage('Your email has been verified successfully! You can now sign in to your account.');
              return;
            }
          }
          
          setStatus('error');
          setMessage('Invalid verification link. The link might be expired or malformed.');
          return;
        }

        console.log('Verifying with token_hash and type:', { token_hash, type });
        
        // If we have token_hash and type, verify with Supabase
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) {
          console.error('Error verifying email:', error);
          setStatus('error');
          setMessage(
            error.message === 'Token has expired or is invalid'
              ? 'The verification link has expired or is invalid. Please request a new verification email.'
              : error.message || 'Failed to verify email. Please try again or request a new verification link.'
          );
          return;
        }

        // Email verified successfully
        setStatus('success');
        setMessage('Your email has been verified successfully! You can now sign in to your account.');
      } catch (error) {
        console.error('Unexpected error during email verification:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during verification. Please try again later.');
      }
    };

    confirmEmail();
  }, [searchParams]);

  const handleResendVerification = async () => {
    try {
      setStatus('loading');
      setMessage('Sending a new verification email...');
      
      // Get email from URL (for custom links) or prompt user
      let email = searchParams?.get('email');
      
      if (!email) {
        const emailInput = prompt('Please enter your email address to resend verification:');
        if (!emailInput) {
          setStatus('error');
          setMessage('Email is required to resend verification.');
          return;
        }
        email = emailInput.trim();
      }
      
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',  // This is correct for resending signup verification
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      
      if (error) {
        console.error('Error resending verification email:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to resend verification email. Please try again later.');
        return;
      }
      
      setStatus('success');
      setMessage('A new verification email has been sent. Please check your inbox and click the verification link.');
    } catch (error) {
      console.error('Unexpected error resending verification:', error);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Verifying your email...</h2>
            <p className="mt-2 text-gray-500">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="bg-green-100 text-green-700 p-4 rounded-full inline-block mb-4">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700">Email Verification</h2>
            <p className="mt-3 text-gray-500">{message}</p>
            <Link 
              href="/auth/signin" 
              className="mt-6 inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-red-100 text-red-700 p-4 rounded-full inline-block mb-4">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700">Verification Failed</h2>
            <p className="mt-3 text-gray-500">{message}</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={handleResendVerification}
                className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Resend Verification Email
              </button>
              <Link 
                href="/auth/signin" 
                className="block px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 