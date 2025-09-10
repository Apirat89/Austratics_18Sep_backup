import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/adminAuth';
import { generateSecurePassword } from '@/lib/adminAuth';
import { sendUserInvitationEmail } from '@/lib/emailService';
import bcrypt from 'bcryptjs';

interface ProfileWithCompany {
  id: string;
  email: string;
  role: string;
  status: string;
  company_id: string | null;
  last_login_at: string | null;
  companies?: { name: string } | null;
}

// GET - List all regular users
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    console.log(`Regular users list requested by admin: ${admin.email}`);
    
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    
    // Get users from profiles table
    const supabase = await createServerSupabaseClient();
    
    let query = supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        role,
        status,
        company_id,
        last_login_at,
        companies:company_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });
    
    // Add filters if provided
    if (searchQuery) {
      query = query.ilike('email', `%${searchQuery}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Format response
    const formattedUsers = users?.map((user: any) => ({
      id: user.id,
      email: user.email,
      company: user.companies?.name || '',
      companyId: user.company_id,
      status: user.status,
      role: user.role,
      lastLogin: user.last_login_at,
    })) || [];

    return NextResponse.json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new regular user
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = body;

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user with email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Generate a secure password
    const tempPassword = generateSecurePassword(10);
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });

    if (authError || !authData.user) {
      console.error('Failed to create auth user:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create profile for the user
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        role: 'user',
        status: 'active',
        created_by: admin.id
      })
      .select()
      .single();

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      // Try to cleanup the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Send email with login credentials
    try {
      await sendUserInvitationEmail(email, tempPassword);
      console.log(`User invitation email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send user invitation email:', emailError);
      // Continue - user is created but email failed
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profileData.id,
        email: profileData.email,
        status: profileData.status,
        role: profileData.role
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 