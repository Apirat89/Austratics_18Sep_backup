'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminManagementTab from '@/components/master/AdminManagementTab';
import UserManagementTab from '@/components/master/UserManagementTab';
import UsageAnalyticsTab from '@/components/master/UsageAnalyticsTab';

interface AdminUser {
  id: string;
  email: string;
  isMaster: boolean;
  status: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MasterAdminPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check admin authentication on component mount
  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin-auth/session', {
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.authenticated || !data.admin) {
        // Redirect to admin login if not authenticated
        router.push('/auth/admin-signin?redirect=/master');
        return;
      }

      // Check if user is actually an admin
      if (!data.admin.isMaster && data.admin.status !== 'active') {
        setError('Access denied. Master admin privileges required.');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      setCurrentAdmin(data.admin);
      setLoading(false);

    } catch (error) {
      console.error('Admin auth check failed:', error);
      setError('Authentication failed. Redirecting...');
      setTimeout(() => router.push('/auth/signin'), 2000);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin-auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force redirect anyway
      router.push('/');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">You will be redirected shortly...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <span className="text-3xl mr-3">⚡</span>
                Master Administration
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Comprehensive system administration and oversight
              </p>
            </div>
            
            {/* Admin User Info & Sign Out */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={currentAdmin?.isMaster ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {currentAdmin?.isMaster ? 'Master Admin' : 'Admin'}
                  </Badge>
                  <span className="font-medium text-slate-700">
                    {currentAdmin?.email}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Last active: {currentAdmin?.lastActive 
                    ? new Date(currentAdmin.lastActive).toLocaleString()
                    : 'Now'
                  }
                </p>
              </div>
              
              <button
                onClick={handleSignOut}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="admin" className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-white shadow-sm">
            <TabsTrigger 
              value="admin" 
              className="flex items-center space-x-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <span>👥</span>
              <span>Admin</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="flex items-center space-x-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <span>👤</span>
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="usage"
              className="flex items-center space-x-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <span>📊</span>
              <span>Usage</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {/* Admin Management Tab */}
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl">👥</span>
                    <span>Administrator Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage administrator accounts, permissions, and access levels. 
                    Only master administrators can add or remove admin users.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminManagementTab currentAdmin={currentAdmin!} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl">👤</span>
                    <span>User Management</span>
                  </CardTitle>
                  <CardDescription>
                    View and manage all platform users, companies, and their access permissions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagementTab currentAdmin={currentAdmin!} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage Analytics Tab */}
            <TabsContent value="usage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl">📊</span>
                    <span>Usage Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Monitor platform usage, performance metrics, and system health.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UsageAnalyticsTab currentAdmin={currentAdmin!} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-slate-500">
            <p>🔐 Master Administration Interface</p>
            <p className="mt-1">
              Aged Care Analytics Platform • Secure Administrative Access
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 