'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backgroundPhoto, setBackgroundPhoto] = useState('');
  const router = useRouter();

  // Array of beautiful Australian photos
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
    const randomPhoto = backgroundPhotos[Math.floor(Math.random() * backgroundPhotos.length)];
    setBackgroundPhoto(randomPhoto);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess('Password reset email sent! Check your inbox for instructions.');
      
      // Redirect to signin page after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        fontFamily: '"Inter", "Public Sans", "Noto Sans", sans-serif',
        backgroundColor: '#3B82F6',
        backgroundImage: backgroundPhoto ? `url(https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/images/${backgroundPhoto})` : 'none',
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
      
      {/* Centered Form */}
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
        <div className="w-full max-w-md">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-white text-4xl font-bold leading-tight mb-2 drop-shadow-lg">
              Reset Password
            </h1>
            <p className="text-white/90 text-lg font-normal drop-shadow-md">
              Enter your email to receive reset instructions
            </p>
          </div>

          {/* Reset Password Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
                {error.includes('contact hello@austratics.com') && (
                  <div className="mt-2 text-sm">
                    <a 
                      href={`mailto:hello@austratics.com?subject=Account%20Activation%20Request&body=I%20tried%20to%20reset%20my%20password%20for%20email:%20${encodeURIComponent(email)}`}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Email hello@austratics.com →
                    </a>
                  </div>
                )}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {success}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="flex flex-col">
                <label className="text-[#0d141c] text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full resize-none overflow-hidden rounded-xl text-[#0d141c] focus:outline-0 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border border-gray-200 bg-blue-50/30 focus:bg-white focus:border-blue-500 h-14 placeholder:text-[#49719c] p-4 text-base font-normal leading-normal transition-all duration-200"
                  required
                />
                <p className="text-sm text-gray-600 mt-2">
                  We'll send password reset instructions to this email address.
                </p>
              </div>

              {/* Send Reset Email Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-base font-bold leading-normal tracking-wide transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>

            {/* Back to Sign In */}
            <div className="text-center mt-6">
              <Link 
                href="/" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to Sign In
              </Link>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Need help?
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check your spam/junk folder if you don't see the email</li>
                <li>• Reset links expire after 1 day for security</li>
                <li>• Contact support if you continue having issues</li>
              </ul>
            </div>
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
              <span>Secure password reset process</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
} 