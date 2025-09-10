import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/adminAuth';
import { generateSecurePassword } from '@/lib/adminAuth';
import { sendUserInvitationEmail } from '@/lib/emailService';

// PUT - Update a user (e.g. update company)
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Get params with await in Next.js 15+ (this is critical)
    const { id: userId } = await Promise.resolve(context.params);
    const body = await request.json();
    const { company } = body;

    // Basic validation
    if (typeof company !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if company with this name already exists
    let companyId: string | null = null;

    if (company) {
      try {
        // Try to find company by name
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', company)
          .single();

        if (existingCompany) {
          // Use existing company
          companyId = existingCompany.id;
        } else {
          // Create new company - simplified to avoid schema cache issues
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: company,
              // Omit created_by to avoid schema cache issues
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (companyError) {
            console.error('Failed to create company:', companyError);
            return NextResponse.json(
              { error: `Failed to create company: ${companyError.message}` },
              { status: 500 }
            );
          }

          if (!newCompany) {
            return NextResponse.json(
              { error: 'Failed to create company: No company returned from database' },
              { status: 500 }
            );
          }

          companyId = newCompany.id;
        }
      } catch (error) {
        console.error('Company lookup/creation error:', error);
        return NextResponse.json(
          { error: `Failed to handle company: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Update user's company_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        company_id: companyId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update user: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${user.email} updated successfully`,
      company: company,
      companyId: companyId
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Get params with await in Next.js 15+
    const { id: userId } = await Promise.resolve(context.params);
    const supabase = await createServerSupabaseClient();

    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete the user
    await supabase.auth.admin.deleteUser(userId);

    // The profile should be deleted by cascade, but ensure it's gone
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      message: `User ${user.email} deleted successfully`
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 