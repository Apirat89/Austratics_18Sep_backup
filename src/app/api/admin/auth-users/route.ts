import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInviteLinkEmail } from '@/lib/emailService'
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

    // 1) Pre-create user with metadata
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      user_metadata: { full_name: name, company },
    })
    
    if (createErr) {
      console.error('Supabase create user error:', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    console.log('User created successfully:', createData.user?.id)

    // 2) Generate an invite link with proper redirect to our invite handler
    const redirectTo = `${origin}/auth/invite?next=${encodeURIComponent('/onboarding/set-password')}`
    console.log('Generating invite link with redirectTo:', redirectTo)
    
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: redirectTo,
      },
    })
    
    if (linkErr) {
      console.error('Supabase generate link error:', linkErr)
      return NextResponse.json({ error: linkErr.message }, { status: 400 })
    }

    console.log('Invite link generated successfully')
    console.log('Link data:', linkData)

    const actionLink = linkData.properties?.action_link
    if (!actionLink) {
      console.error('No action link in generated data:', linkData)
      return NextResponse.json({ error: 'No invite link generated' }, { status: 500 })
    }

    console.log('Action link:', actionLink)

    // 3) Send branded invite email using new email service function
    try {
      await sendInviteLinkEmail(email, actionLink, name);
      console.log(`Invitation email sent successfully to: ${email} by admin: ${admin.email}`);
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