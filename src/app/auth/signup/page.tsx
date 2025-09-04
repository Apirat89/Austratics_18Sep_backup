'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PasswordStrengthIndicator from '../../../components/PasswordStrengthIndicator';
import PasswordInput from '../../../components/PasswordInput';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backgroundPhoto, setBackgroundPhoto] = useState('');
  const router = useRouter();

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
    const randomPhoto = backgroundPhotos[Math.floor(Math.random() * backgroundPhotos.length)];
    setBackgroundPhoto(randomPhoto);
  }, []);

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
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess('Account created successfully! Please check your email for verification.');
      
      // Redirect to signin page after successful signup
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);

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
        backgroundColor: '#3B82F6', // Blue fallback
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
      
      {/* Centered Sign Up Form */}
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
              Create Account
            </h1>
            <p className="text-white/90 text-lg font-normal drop-shadow-md">
              Join Aged Care Analytics today
            </p>
          </div>

          {/* Sign Up Card */}
          <div className="bg-white/75 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {success}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Full Name Input */}
              <div className="flex flex-col">
                <label className="text-[#0d141c] text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full resize-none overflow-hidden rounded-xl text-[#0d141c] focus:outline-0 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border border-gray-200 bg-blue-50/30 focus:bg-white focus:border-blue-500 h-14 placeholder:text-[#49719c] p-4 text-base font-normal leading-normal transition-all duration-200"
                  required
                />
              </div>

              {/* Email Input */}
              <div className="flex flex-col">
                <label className="text-[#0d141c] text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full resize-none overflow-hidden rounded-xl text-[#0d141c] focus:outline-0 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border border-gray-200 bg-blue-50/30 focus:bg-white focus:border-blue-500 h-14 placeholder:text-[#49719c] p-4 text-base font-normal leading-normal transition-all duration-200"
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
              <PasswordStrengthIndicator password={formData.password} />

              {/* Confirm Password Input */}
              <PasswordInput
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                label="Confirm Password"
                required
              />

              {/* Terms & Conditions */}
              <div className="flex items-start">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mt-1" 
                  required
                />
                <span className="ml-2 text-sm text-[#49719c] leading-5">
                  I agree to the{' '}
                  <Link href="/legal/terms" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/legal/privacy" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium">
                    Privacy Policy
                  </Link>
                </span>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-base font-bold leading-normal tracking-wide transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Sign In Link */}
            <p className="text-[#49719c] text-sm font-normal leading-normal pt-6 text-center">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800 font-semibold">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Australia Analytics Info */}
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
              <span>Secure platform for aged care professionals</span>
            </div>
          </div>

          {/* Back to Sign In */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link 
              href="/" 
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                textDecoration: 'none'
              }}
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
} 