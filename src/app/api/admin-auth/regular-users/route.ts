import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { generateSecurePassword } from '@/lib/adminAuth';
import { sendUserInvitationEmail } from '@/lib/emailService';
import { createAdminServiceRoleClient } from '@/lib/supabase-admin';

// Interface for user profile with company
interface ProfileWithCompany {
  id: string;
  email: string;
  role: string;
  status: string;
  company_id: string | null;
  last_login_at: string | null;
  companies: { 
    id: string;
    name: string;
  } | null;
}

// GET: List all regular users (non-admin)
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  try {
    // Verify admin authentication
    const admin = await requireAdminAuth(supabase);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log the request
    console.log(`Regular users list requested by admin: ${admin.email}`);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';

    // Start building the query
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

    // Filter by role - only regular users (not admins)
    query = query.eq('role', 'user');

    // Apply search filter if provided
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching regular users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response
    const users = data.map((user: ProfileWithCompany) => ({
      id: user.id,
      email: user.email,
      status: user.status,
      company: user.companies ? user.companies.name : '',
      company_id: user.company_id,
      last_login_at: user.last_login_at
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error in regular users API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a new regular user
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    // Verify admin authentication
    const admin = await requireAdminAuth(supabase);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    
    // Create auth user using service role client to bypass permissions
    const adminClient = createAdminServiceRoleClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });

    if (authError) {
      console.error('Failed to create auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
      console.error('User creation returned no user data');
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Create a profile entry
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        role: 'user',
        status: 'active'
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      // Attempt to clean up the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Send invitation email with credentials
    const emailSent = await sendUserInvitationEmail(email, tempPassword);
    
    if (!emailSent) {
      console.warn(`Warning: Failed to send invitation email to ${email}`);
      // We don't fail the request, just log a warning
    }

    return NextResponse.json({ 
      id: authData.user.id,
      email: email,
      status: 'active',
      message: "User created and invitation sent" 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 