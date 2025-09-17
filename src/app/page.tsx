'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PasswordInput from '../components/PasswordInput';
import { useSearchParams } from 'next/navigation';
import { getImageUrl } from '../lib/publicUrl';

// Background images - filenames must match what's in Supabase
const BACKGROUND_IMAGES = [
  'australian-koala-in-its-natural-habitat-of-gumtree-2024-11-27-16-51-33-utc.jpg',
  'australian-aerial-photography-2024-09-18-02-10-16-utc.jpg',
  'aerial-view-of-scarborough-beach-perth-western-a-2025-02-09-00-32-40-utc.jpg'
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerificationError, setIsVerificationError] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const [backgroundImage, setBackgroundImage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoaded, setLogoLoaded] = useState(false);
  const didInit = React.useRef(false);
  
  // Set random background photo on client-side only
  useEffect(() => {
    // Prevent React Strict Mode double-mounting in development
    if (didInit.current) return;
    didInit.current = true;
    
    // Check if there's an error message in the URL params
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      
      // Check if it's a verification error
      if (errorParam.includes('verification') || 
          errorParam.includes('email not confirmed') || 
          errorParam.includes('not verified')) {
        setIsVerificationError(true);
      }
    }
    
    // Load the logo first
    const logoImageUrl = getImageUrl('Austratics Logo.png');
    if (logoImageUrl) {
             const img = new Image();
       img.onload = () => {
         console.log('✅ Logo loaded successfully:', logoImageUrl);
         setLogoUrl(logoImageUrl);
         setLogoLoaded(true);
       };
       img.onerror = (e) => {
         console.error('❌ Logo failed to load:', logoImageUrl, e);
         setLogoLoaded(true); // Allow text to show as fallback
       };
      img.src = logoImageUrl;
    } else {
      setLogoLoaded(true); // Allow text to show as fallback
    }
    
    // Choose a random background image from the list
    const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    const filename = BACKGROUND_IMAGES[randomIndex];
    
    // Generate direct Supabase CDN URL using the public bucket
    try {
      console.log('Attempting to load background image:', filename);
      
      // Use the new client-safe helper function
      const imageUrl = getImageUrl(filename);
      console.log('Generated background image URL:', imageUrl);
      
      if (imageUrl) {
        // Pre-load the background image to ensure it works
        const bgImg = new Image();
        bgImg.onload = () => {
          console.log('✅ Background image loaded successfully:', imageUrl);
          setBackgroundImage(imageUrl);
        };
        bgImg.onerror = (e) => {
          console.error('❌ Background image failed to load:', imageUrl, e);
          // Try direct fallback
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
            const directUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/images/${encodeURIComponent(filename)}`;
            console.log('🔄 Trying direct fallback URL:', directUrl);
            setBackgroundImage(directUrl);
          }
        };
        bgImg.src = imageUrl;
      }
    } catch (error) {
      console.error('Failed to generate image URL:', error);
      // No fallback - all images should be in Supabase storage
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setIsVerificationError(false);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if this is a verification error
        if (data.code === 'email_not_verified') {
          setIsVerificationError(true);
        }
        setError(data.error || 'Something went wrong');
        return;
      }

      // Redirect to main page after successful signin
      router.push('/main');

    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to resend verification email
  const handleResendVerification = async () => {
    if (isResendingVerification || !formData.email) return;
    
    setIsResendingVerification(true);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend verification email');
        return;
      }

      // Show success message
      setError('Verification email has been sent. Please check your inbox.');
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background layer behind everything */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="h-full w-full bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined,
            opacity: backgroundImage ? 1 : 0
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Centered Sign In Form */}
      <div 
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div style={{ width: '100%', maxWidth: '28rem' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            {/* Show logo if loaded, otherwise show text only after logo loading is complete */}
            {logoUrl ? (
              <div style={{ marginBottom: '1rem' }}>
                <img 
                  src={logoUrl} 
                  alt="Austratics Logo" 
                  style={{
                    height: '7rem', // Bigger as requested
                    maxWidth: '18rem', // Increased proportionally
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.7))', // Enhanced shadow
                    margin: '0 auto',
                    display: 'block'
                  }}
                  onError={(e) => {
                    console.error('Logo failed to display:', logoUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : logoLoaded ? (
              <h1 style={{ 
                color: 'white', 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)'
              }}>
                Austratics
              </h1>
            ) : (
              // Reserve space while loading (prevents flash)
              <div style={{ height: '7rem', marginBottom: '1rem' }}></div>
            )}
            
            <p style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '1.125rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              Sign in to your account
            </p>
          </div>

          {/* Sign In Card */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {/* Error Message */}
            {error && (
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '0.75rem', 
                backgroundColor: isVerificationError ? '#fef3c7' : '#fee2e2', 
                border: `1px solid ${isVerificationError ? '#fde68a' : '#fecaca'}`, 
                color: isVerificationError ? '#92400e' : '#dc2626', 
                borderRadius: '0.5rem' 
              }}>
                <p>{error}</p>
                
                {isVerificationError && (
                  <button 
                    type="button"
                    disabled={isResendingVerification || !formData.email}
                    onClick={handleResendVerification}
                    style={{
                      marginTop: '0.75rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      cursor: isResendingVerification ? 'not-allowed' : 'pointer',
                      opacity: isResendingVerification ? 0.7 : 1
                    }}
                  >
                    {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                )}
              </div>
            )}

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleSubmit}>
              {/* Email Input */}
              <div>
                <label style={{ color: '#0d141c', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  style={{
                    width: '100%',
                    height: '3.5rem',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #d1d5db',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                  required
                />
              </div>

              {/* Password Input */}
              <PasswordInput
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                label="Password"
                required
              />

              {/* Sign In Button - moved up, closer to password */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '3.5rem',
                  backgroundColor: isLoading ? '#93c5fd' : '#3B82F6',
                  color: 'white',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Forgot Password - moved below, centered */}
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Link href="/auth/forgot-password" style={{ fontSize: '0.875rem', color: '#3B82F6', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
            </form>

            {/* Create Account Link */}
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Don't have an account? Reach out to hello@austratrics.com
            </p>
          </div>

          {/* Security Info */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.9)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              borderRadius: '9999px',
              padding: '0.5rem 1rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#60a5fa', borderRadius: '50%' }}></div>
              <span>Secure sign-in • Powered by Austratics</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-blue-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-white">Loading...</h1>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
