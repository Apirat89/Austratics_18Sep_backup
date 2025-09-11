import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'
import { createResetToken } from '@/lib/auth-tokens'
import { requireAdminAuth } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  try {
    // Use existing admin auth system
    const admin = await requireAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const { name, email, company } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Missing name/email' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const origin = req.nextUrl.origin

    // Check if user already exists first
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (userExists) {
      return NextResponse.json({ 
        error: 'A user with this email address has already been registered' 
      }, { status: 400 })
    }

    console.log('Creating user with email:', email, 'from origin:', origin)

    // 1) Pre-create user with metadata and auto-confirm email
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      user_metadata: { full_name: name, company },
      email_confirm: true  // Auto-confirm email to avoid separate verification email
    })
    
    if (createErr) {
      console.error('Supabase create user error:', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    console.log('User created successfully:', createData.user?.id)

    // 2) Generate reset password token using working flow
    console.log('Generating reset password token for activation')
    const tokenResult = await createResetToken(email)
    
    if (!tokenResult.success || !tokenResult.token) {
      console.error('Failed to create reset token:', tokenResult.error)
      return NextResponse.json({ error: 'Failed to generate activation token' }, { status: 500 })
    }

    console.log('Reset token generated successfully')

    // 3) Create reset password URL
    const resetUrl = `${origin}/auth/reset-password?token=${tokenResult.token}`
    console.log('Reset URL:', resetUrl)

    // 4) Send reset password email for account activation
    try {
      const emailResult = await sendPasswordResetEmail({
        to: email,
        resetToken: tokenResult.token,
        resetUrl,
        userEmail: email
      })
      
      if (emailResult.success) {
        console.log(`Activation email sent successfully to: ${email} by admin: ${admin.email}`);
      } else {
        console.error("Email error:", emailResult.error);
        // We don't fail the request if email fails, just log it
      }
    } catch (emailErr) {
      console.error("Email error:", emailErr);
      // We don't fail the request if email fails, just log it
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Use existing admin auth system
    const admin = await requireAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    // Get user ID from query parameters
    const userId = req.nextUrl.searchParams.get('id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error('Supabase deleteUser error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    console.log(`Auth user ${userId} deleted by admin ${admin.email}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in auth-users delete:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 