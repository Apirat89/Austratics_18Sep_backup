import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, canAccessCompany } from '@/lib/adminAuth';

// GET /api/admin/companies - List companies
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
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);
    const offset = (page - 1) * pageSize;

    const supabase = await createServerSupabaseClient();
    
    // Build query with company access filtering
    let companiesQuery = supabase
      .from('companies')
      .select(`
        id,
        name,
        primary_domains,
        created_at,
        updated_at,
        company_emails!inner(count),
        profiles!inner(count)
      `, { count: 'exact' });

    // Apply access control - owners see all, staff see only their company
    if (authResult.user.role === 'staff' && authResult.user.companyId) {
      companiesQuery = companiesQuery.eq('id', authResult.user.companyId);
    }

    // Apply search filter
    if (query) {
      companiesQuery = companiesQuery.or(`name.ilike.%${query}%,primary_domains.cs.{${query}}`);
    }

    // Apply pagination and ordering
    const { data: companies, error, count } = await companiesQuery
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Companies query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      );
    }

    // Get counts for each company
    const companiesWithCounts = await Promise.all(
      (companies || []).map(async (company) => {
        // Get verified email count
        const { count: verifiedEmailCount } = await supabase
          .from('company_emails')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'verified');

        // Get total email count
        const { count: totalEmailCount } = await supabase
          .from('company_emails')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        // Get user count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'active');

        return {
          id: company.id,
          name: company.name,
          primaryDomains: company.primary_domains,
          createdAt: company.created_at,
          updatedAt: company.updated_at,
          verifiedEmails: verifiedEmailCount || 0,
          totalEmails: totalEmailCount || 0,
          users: userCount || 0
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / pageSize);

    return NextResponse.json({
      companies: companiesWithCounts,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages
      }
    });

  } catch (error) {
    console.error('Companies API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/companies - Create new company
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

    // Only owners can create companies
    if (authResult.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Owner privileges required to create companies' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, primaryDomains } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    if (primaryDomains && (!Array.isArray(primaryDomains) || !primaryDomains.every(d => typeof d === 'string'))) {
      return NextResponse.json(
        { error: 'Primary domains must be an array of strings' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check for duplicate company name
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'A company with this name already exists' },
        { status: 400 }
      );
    }

    // Create company
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: name.trim(),
        primary_domains: primaryDomains || []
      })
      .select()
      .single();

    if (error) {
      console.error('Company creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'company.create',
      resource_type: 'company',
      resource_id: company.id,
      details: { companyName: company.name }
    });

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        primaryDomains: company.primary_domains,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
        verifiedEmails: 0,
        totalEmails: 0,
        users: 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Company creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 