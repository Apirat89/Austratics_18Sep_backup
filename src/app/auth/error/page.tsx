'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error') || null
  
  let errorMessage = 'An authentication error occurred'
  let errorDescription = 'Please try again or contact support if the problem persists.'
  
  if (error) {
    switch (error) {
      case 'Missing token_hash or type':
        errorMessage = 'Invalid or Expired Link'
        errorDescription = 'The invitation link is invalid or has expired. Please request a new invitation from your administrator.'
        break
      case 'access_denied':
        errorMessage = 'Access Denied'
        errorDescription = 'The invitation link has been denied or is no longer valid.'
        break
      default:
        errorMessage = error
        break
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{errorMessage}</h1>
        
        <p className="text-gray-600 mb-6">{errorDescription}</p>
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Go to Home
          </button>
          
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition-colors"
          >
            Sign In
          </button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Need help? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
} 