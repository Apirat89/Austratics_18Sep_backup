import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Log all parameters for debugging
  console.log('Auth confirm called with URL:', request.url)
  console.log('Search params:', Object.fromEntries(searchParams.entries()))
  
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | 'email_change' | null
  const next = searchParams.get('next')
  const nextPath = next?.startsWith('/') ? next : '/dashboard'
  
  // Also check for other possible Supabase parameters
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('Parameters found:', { token_hash, type, code, error, error_description, next })

  // Handle error cases first
  if (error) {
    console.log('Auth error received:', error, error_description)
    return redirect(`/auth/error?error=${encodeURIComponent(error_description || error)}`)
  }

  // Handle code-based flow (newer Supabase Auth)
  if (code) {
    console.log('Processing code-based auth flow')
    try {
      const supabase = await createServerSupabaseClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (!exchangeError) {
        console.log('Code exchange successful, redirecting to:', nextPath)
        return redirect(nextPath)
      }
      console.log('Code exchange failed:', exchangeError.message)
      return redirect(`/auth/error?error=${encodeURIComponent(exchangeError.message)}`)
    } catch (err) {
      console.error('Code exchange error:', err)
      return redirect(`/auth/error?error=${encodeURIComponent('Failed to process authentication code')}`)
    }
  }

  // Handle token_hash-based flow (older method)
  if (token_hash && type) {
    console.log('Processing token_hash-based auth flow')
    try {
      const supabase = await createServerSupabaseClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type })
      if (!verifyError) {
        console.log('Token verification successful, redirecting to:', nextPath)
        return redirect(nextPath)
      }
      console.log('Token verification failed:', verifyError.message)
      return redirect(`/auth/error?error=${encodeURIComponent(verifyError.message)}`)
    } catch (err) {
      console.error('Token verification error:', err)
      return redirect(`/auth/error?error=${encodeURIComponent('Failed to verify authentication token')}`)
    }
  }

  console.log('No valid auth parameters found')
  return redirect(`/auth/error?error=${encodeURIComponent('Missing authentication parameters - please request a new invitation link')}`)
} 