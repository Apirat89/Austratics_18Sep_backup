import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, canAccessCompany } from '@/lib/adminAuth';

// GET /api/admin/companies/[id] - Get company details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const companyId = params.id;

    // Check access to this company
    if (!canAccessCompany(authResult.user, companyId)) {
      return NextResponse.json(
        { error: 'Access denied to this company' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get company details
    const { data: company, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        primary_domains,
        created_at,
        updated_at
      `)
      .eq('id', companyId)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get email counts
    const { count: verifiedEmailCount } = await supabase
      .from('company_emails')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'verified');

    const { count: totalEmailCount } = await supabase
      .from('company_emails')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const { count: pendingEmailCount } = await supabase
      .from('company_emails')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending');

    const { count: blockedEmailCount } = await supabase
      .from('company_emails')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'blocked');

    // Get user counts
    const { count: activeUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active');

    const { count: totalUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get recent email additions
    const { data: recentEmails } = await supabase
      .from('company_emails')
      .select(`
        id,
        email,
        status,
        source,
        created_at,
        verified_at,
        profiles:added_by (
          email
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        primaryDomains: company.primary_domains,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      },
      emailStats: {
        verified: verifiedEmailCount || 0,
        pending: pendingEmailCount || 0,
        blocked: blockedEmailCount || 0,
        total: totalEmailCount || 0
      },
      userStats: {
        active: activeUserCount || 0,
        total: totalUserCount || 0
      },
      recentEmails: recentEmails?.map(email => ({
        id: email.id,
        email: email.email,
        status: email.status,
        source: email.source,
        createdAt: email.created_at,
        verifiedAt: email.verified_at,
        addedBy: email.profiles?.[0]?.email
      })) || []
    });

  } catch (error) {
    console.error('Company detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/companies/[id] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const companyId = params.id;

    // Check access to this company
    if (!canAccessCompany(authResult.user, companyId)) {
      return NextResponse.json(
        { error: 'Access denied to this company' },
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

    // Check for duplicate company name (excluding current company)
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name.trim())
      .neq('id', companyId)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'A company with this name already exists' },
        { status: 400 }
      );
    }

    // Update company
    const { data: company, error } = await supabase
      .from('companies')
      .update({
        name: name.trim(),
        primary_domains: primaryDomains || []
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Company update error:', error);
      return NextResponse.json(
        { error: 'Failed to update company' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'company.update',
      resource_type: 'company',
      resource_id: companyId,
      details: { 
        oldName: company.name,
        newName: name.trim(),
        primaryDomains: primaryDomains || []
      }
    });

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        primaryDomains: company.primary_domains,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      }
    });

  } catch (error) {
    console.error('Company update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/companies/[id] - Delete company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Only owners can delete companies
    if (authResult.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Owner privileges required to delete companies' },
        { status: 403 }
      );
    }

    const companyId = params.id;

    // Prevent deletion of default company
    if (companyId === '00000000-0000-0000-0000-000000000001') {
      return NextResponse.json(
        { error: 'Cannot delete the default organization' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if company exists and get details
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if company has users
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (userCount && userCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete company with ${userCount} active user(s). Please reassign users first.` },
        { status: 400 }
      );
    }

    // Delete company (cascade will handle company_emails)
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (deleteError) {
      console.error('Company deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete company' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'company.delete',
      resource_type: 'company',
      resource_id: companyId,
      details: { companyName: company.name }
    });

    return NextResponse.json({
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Company deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 