import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    // Use existing admin auth system
    const admin = await requireAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const page = Number(req.nextUrl.searchParams.get('page') ?? '1')
    const perPage = Number(req.nextUrl.searchParams.get('perPage') ?? '50')

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    
    if (error) {
      console.error('Supabase listUsers error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    console.log(`Found ${data.users?.length || 0} auth users for admin ${admin.email}`)
    return NextResponse.json({ users: data.users ?? [] })
  } catch (err) {
    console.error('Unexpected error in auth-users/list:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 