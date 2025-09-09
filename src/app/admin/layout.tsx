import { redirect } from 'next/navigation';
import { createReadOnlyServerSupabaseClient } from '../../lib/supabase';
import AdminNavigation from '../../components/admin/AdminNavigation';

async function getAdminUser() {
  const supabase = await createReadOnlyServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'staff'].includes(profile.role)) {
    return null;
  }

  return { ...user, role: profile.role, profileEmail: profile.email };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    redirect('/auth/signin?message=Admin access required');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Dashboard
              </h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {adminUser.role === 'owner' ? 'Owner' : 'Staff'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {adminUser.profileEmail}
              </span>
              <a
                href="/maps"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to App
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <AdminNavigation />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 