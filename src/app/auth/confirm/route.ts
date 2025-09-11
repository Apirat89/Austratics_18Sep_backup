import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | 'email_change' | null
  const next = searchParams.get('next')
  const nextPath = next?.startsWith('/') ? next : '/dashboard'

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return redirect(nextPath)
    return redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }
  return redirect(`/auth/error?error=${encodeURIComponent('Missing token_hash or type')}`)
} 