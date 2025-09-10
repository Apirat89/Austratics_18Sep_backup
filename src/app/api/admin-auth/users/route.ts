import { NextRequest, NextResponse } from 'next/server';
import { 
  requireAdminAuth, 
  requireMasterAdmin,
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
  isAdminOnline
} from '@/lib/adminAuth';

// GET - List all admin users (with permission check)
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

    console.log(`Admin user list requested by: ${admin.email} (isMaster: ${admin.isMaster})`);
    
    // Get admin users list
    const adminUsers = await getAdminUsers();

    console.log(`Returning ${adminUsers.length} admin users to ${admin.email}`);

    // Add online status for each admin
    const adminUsersWithStatus = await Promise.all(
      adminUsers.map(async (user) => ({
        ...user,
        isOnline: await isAdminOnline(user.id)
      }))
    );

    return NextResponse.json({
      success: true,
      adminUsers: adminUsersWithStatus
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new admin user (master admin only)
export async function POST(request: NextRequest) {
  try {
    // Require master admin authentication
    const admin = await requireMasterAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Master admin authentication required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create admin user
    const result = await createAdminUser({ email, password }, admin);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: result.admin
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete admin user (permission-based)
export async function DELETE(request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Delete admin user (permission checks handled in function)
    const success = await deleteAdminUser(adminId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete admin user or insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete admin user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 