import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, getAccessibleCompanyIds } from '@/lib/adminAuth';

// GET /api/admin/users - List users
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '';
    const status = searchParams.get('status') || '';
    const verified = searchParams.get('verified') || '';
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);
    const offset = (page - 1) * pageSize;

    const supabase = await createServerSupabaseClient();

    // Build query with access control
    let usersQuery = supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        status,
        company_id,
        last_login_at,
        last_seen_ip,
        created_at,
        companies:company_id (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply company access control
    const accessibleCompanyIds = getAccessibleCompanyIds(authResult.user);
    if (accessibleCompanyIds.length > 0) {
      // Staff can only see users from their company
      usersQuery = usersQuery.in('company_id', accessibleCompanyIds);
    }

    // Apply filters
    if (companyId) {
      usersQuery = usersQuery.eq('company_id', companyId);
    }

    if (status) {
      usersQuery = usersQuery.eq('status', status);
    }

    if (verified === 'yes') {
      usersQuery = usersQuery.not('email_verified_at', 'is', null);
    } else if (verified === 'no') {
      usersQuery = usersQuery.is('email_verified_at', null);
    }

    if (query) {
      usersQuery = usersQuery.ilike('email', `%${query}%`);
    }

    // Apply pagination and ordering
    const { data: users, error, count } = await usersQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Users query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get additional data for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        // Get API calls count (last 30 days)
        const { count: apiCallsCount } = await supabase
          .from('api_calls')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('ts', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Get saved items count
        const { count: savedItemsCount } = await supabase
          .from('saved_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get search history count
        const { count: searchHistoryCount } = await supabase
          .from('search_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get conversations count
        const { count: conversationsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          companyId: user.company_id,
          companyName: user.companies?.[0]?.name || 'No Company',
          lastLoginAt: user.last_login_at,
          lastSeenIp: user.last_seen_ip,
          createdAt: user.created_at,
          stats: {
            apiCalls30d: apiCallsCount || 0,
            savedItems: savedItemsCount || 0,
            searchHistory: searchHistoryCount || 0,
            conversations: conversationsCount || 0
          }
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / pageSize);

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages
      }
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user (if needed for admin purposes)
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Only owners can create users directly
    if (authResult.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Owner privileges required to create users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role, companyId, status } = body;

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (role && !['user', 'staff', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be user, staff, or owner' },
        { status: 400 }
      );
    }

    if (status && !['active', 'suspended', 'deleted'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be active, suspended, or deleted' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // For admin-created users, we need to work with auth.users
    // This is typically done through Supabase Admin API or invite flow
    return NextResponse.json(
      { error: 'Direct user creation not implemented. Use invite flow instead.' },
      { status: 501 }
    );

  } catch (error) {
    console.error('User creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 