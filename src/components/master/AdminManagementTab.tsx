'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminUser {
  id: string;
  email: string;
  isMaster: boolean;
  status: string;
  lastActive?: string;
  isOnline?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminManagementTabProps {
  currentAdmin: AdminUser;
}

export default function AdminManagementTab({ currentAdmin }: AdminManagementTabProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adding, setAdding] = useState(false);

  // Load admin users
  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin-auth/users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin users');
      }

      const data = await response.json();
      setAdminUsers(data.adminUsers || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      setError('Failed to load admin users');
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail) {
      alert('Email is required');
      return;
    }

    setAdding(true);

    try {
      const response = await fetch('/api/admin-auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: newAdminEmail
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add admin user');
      }

      // Success - refresh the list
      await fetchAdminUsers();
      setNewAdminEmail('');
      setShowAddForm(false);
      alert('Admin user created successfully! An invitation email has been sent.');

    } catch (error) {
      console.error('Failed to add admin user:', error);
      alert(error instanceof Error ? error.message : 'Failed to add admin user');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    // Confirm deletion
    const confirmMessage = adminEmail === currentAdmin.email 
      ? 'Are you sure you want to delete your own admin account? You will be logged out immediately.'
      : `Are you sure you want to delete admin access for ${adminEmail}?`;
      
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin-auth/users?id=${adminId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete admin user');
      }

      // If deleting own account, redirect to home
      if (adminEmail === currentAdmin.email) {
        alert('Your admin account has been deleted. You will be redirected to the home page.');
        window.location.href = '/';
        return;
      }

      // Refresh the list
      await fetchAdminUsers();
      alert('Admin user deleted successfully');

    } catch (error) {
      console.error('Failed to delete admin user:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete admin user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-slate-600">Loading admin users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium mb-2">Error Loading Admin Users</p>
        <p className="text-slate-600 text-sm mb-4">{error}</p>
        <button
          onClick={fetchAdminUsers}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Administrator Accounts</h3>
          <p className="text-sm text-slate-600">
            {adminUsers.length} admin user{adminUsers.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        
        {currentAdmin.isMaster && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Add Admin</span>
          </button>
        )}
      </div>

      {/* Add Admin Form */}
      {showAddForm && currentAdmin.isMaster && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg text-indigo-800">Add New Administrator</CardTitle>
            <CardDescription className="text-indigo-600">
              Enter the email address of the new administrator. They will receive an invitation email with login instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                >
                  {adding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>🔑</span>
                      <span>Activate and Reset Password</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAdminEmail('');
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Email</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Role</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {adminUsers.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${admin.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{admin.email}</div>
                        <div className="text-sm text-slate-500">
                          {admin.isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <Badge
                      variant={admin.status === 'active' ? 'default' : admin.status === 'pending' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {admin.status}
                    </Badge>
                  </td>
                  
                  <td className="px-6 py-4">
                    <Badge
                      variant={admin.isMaster ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {admin.isMaster ? 'Master Admin' : 'Admin'}
                    </Badge>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {/* Delete Button Logic */}
                      {admin.email === 'apirat.kongchanagul@gmail.com' ? (
                        // Master admin can delete their own account if they are the current user
                        currentAdmin.email === 'apirat.kongchanagul@gmail.com' ? (
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-200 hover:border-red-300 rounded"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-slate-400 text-sm px-3 py-1 border border-slate-200 rounded cursor-not-allowed">
                            Protected
                          </span>
                        )
                      ) : (
                        // For non-master admins
                        (currentAdmin.isMaster || admin.email === currentAdmin.email) ? (
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-200 hover:border-red-300 rounded"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-slate-400 text-sm px-3 py-1 border border-slate-200 rounded cursor-not-allowed">
                            No Access
                          </span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {adminUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 text-4xl mb-4">👥</div>
              <p className="text-slate-600 font-medium">No administrators found</p>
              <p className="text-slate-500 text-sm">Add your first administrator to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Permission Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">🔒 Admin Permission Rules</h4>
        <ul className="text-sm text-blue-800 space-y-1">
                          <li><strong>Master Admin:</strong> Can add, remove, and manage all admin accounts including their own</li>
          <li><strong>Regular Admins:</strong> Can only delete their own admin account</li>
          <li><strong>Account Creation:</strong> Only master admin can create new admin accounts</li>
          <li><strong>Email Invitations:</strong> New admins receive secure activation emails with temporary passwords</li>
        </ul>
      </div>
    </div>
  );
} 