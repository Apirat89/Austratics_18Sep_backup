'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PasswordInput from '../components/PasswordInput';
import { useSearchParams } from 'next/navigation';

function HomeContent() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerificationError, setIsVerificationError] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [backgroundPhoto, setBackgroundPhoto] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Array of beautiful Australian photos (all optimized under 3MB)
  const backgroundPhotos = [
    'aerial-view-of-scarborough-beach-perth-western-a-2025-02-09-00-32-40-utc.jpg',
    'australian-aerial-photography-2024-09-18-02-10-16-utc.jpg',
    'sydney-opera-house-and-harbour-bridge-2025-02-10-07-07-15-utc.jpg',
    'scenic-view-of-uluru-a-large-sandstone-formation-2025-02-08-19-46-10-utc.jpeg',
    'beautiful-view-of-12-apostles-great-ocean-road-du-2025-02-02-21-18-40-utc.jpg',
    'famous-st-xaviers-cathedral-in-adelaide-australia-2025-02-11-19-33-18-utc.jpeg',
    'high-angle-view-of-turquoise-great-barrier-reef-in-2025-04-03-04-20-53-utc.jpg',
    'hobart-cbd-and-waterfront-in-tasmania-australia-2025-03-09-14-14-33-utc.jpg',
    'parliament-of-australia-2025-03-05-16-19-04-utc.jpg',
    'story-bridge-and-brisbane-skyline-in-australia-2025-03-05-23-43-11-utc.jpg',
    // New photos added from Photos_signon folder
    'australian-koala-in-its-natural-habitat-of-gumtree-2024-11-27-16-51-33-utc.jpg',
    'bangkok-thailand-january-20-2022-australia-co-2025-02-24-12-30-26-utc.jpg',
    'deep-creek-kangaroo-8-2024-11-25-23-26-06-utc.jpg',
    'little-boy-with-australian-flag-near-the-ocean-au-2025-01-08-23-36-51-utc.jpg',
    'melbourne-city-2024-11-27-16-50-23-utc.jpg',
    'view-from-jubilee-point-in-sorrento-australia-2025-03-08-18-18-33-utc.jpg',
    'wildlife-of-australia-2025-02-12-00-09-47-utc.jpg',
    // Latest photos added
    'caring-interaction-in-a-geriatric-nursing-home-2025-03-08-13-28-06-utc.jpg',
    'grazing-cows-in-the-australian-outback-2025-03-05-14-33-00-utc.jpg',
    'happy-diverse-male-doctor-discussing-with-senior-m-2025-04-03-16-05-34-utc.jpg',
    'senior-people-looking-at-camera-in-retirement-home-2025-03-06-01-04-29-utc.jpg'
  ];

  // Set random background photo on client-side only
  useEffect(() => {
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

    const randomPhoto = backgroundPhotos[Math.floor(Math.random() * backgroundPhotos.length)];
    setBackgroundPhoto(randomPhoto);
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
    <div 
      className="min-h-screen"
      style={{
        fontFamily: '"Inter", "Public Sans", "Noto Sans", sans-serif',
        backgroundColor: '#3B82F6',
        backgroundImage: backgroundPhoto ? `url(/${backgroundPhoto})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 30% Grey Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1
        }}
      ></div>
      
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
            <h1 style={{ 
              color: 'white', 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}>
              Austratics
            </h1>
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

              {/* Remember Me & Forgot Password */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    style={{ 
                      width: '1.125rem', 
                      height: '1.125rem',
                      borderRadius: '0.25rem',
                      accentColor: '#3B82F6',
                      marginRight: '0.5rem'
                    }}
                  />
                  <label htmlFor="remember-me" style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                    Remember me
                  </label>
                </div>
                <Link href="/auth/forgot-password" style={{ fontSize: '0.875rem', color: '#3B82F6', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
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
