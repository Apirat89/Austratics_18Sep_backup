'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../../../lib/supabase'

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setSaving(true)
    setError(null)
    
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) {
        setError(error.message)
        return
      }
      
      // Redirect to main dashboard
      router.replace('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Set Your Password</h1>
          <p className="text-gray-600 mt-2">Please create a secure password for your account.</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter a secure password"
              required
              minLength={8}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-indigo-300"
          >
            {saving ? 'Setting password...' : 'Save & Continue'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Your password should be at least 8 characters long and contain a mix of letters, numbers, and symbols.
        </p>
      </div>
    </div>
  )
} 