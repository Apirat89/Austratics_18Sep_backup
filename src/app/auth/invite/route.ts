import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  console.log('Invite handler called with URL:', request.url)
  console.log('Search params:', Object.fromEntries(searchParams.entries()))
  
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/onboarding/set-password'
  
  console.log('Invite parameters:', { token, type, next })

  if (!token || !type) {
    console.log('Missing token or type in invite URL')
    return redirect(`/auth/error?error=${encodeURIComponent('Invalid invite link - missing authentication parameters')}`)
  }

  try {
    const supabase = await createServerSupabaseClient()
    
    // For invite type, we need to verify the OTP with the token as token_hash
    console.log('Verifying invite token...')
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any
    })
    
    if (error) {
      console.error('Invite verification failed:', error)
      let errorMessage = error.message
      
      if (error.message.includes('expired')) {
        errorMessage = 'Invitation link has expired. Please request a new invitation.'
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Invalid invitation link. Please request a new invitation.'  
      }
      
      return redirect(`/auth/error?error=${encodeURIComponent(errorMessage)}`)
    }

    console.log('Invite verification successful:', data)
    console.log('Redirecting to:', next)
    
    // Successful verification - redirect to password setup
    return redirect(next.startsWith('/') ? next : '/onboarding/set-password')
    
  } catch (err) {
    console.error('Unexpected error processing invite:', err)
    return redirect(`/auth/error?error=${encodeURIComponent('Failed to process invitation')}`)
  }
} 