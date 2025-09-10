'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface AdminUser {
  id: string;
  email: string;
  isMaster: boolean;
  status: string;
  lastActive?: string;
}

interface UserManagementTabProps {
  currentAdmin: AdminUser;
}

interface User {
  id: string;
  email: string;
  company: string;
  companyId?: string | null;
  status: 'active' | 'suspended' | 'deleted';
  role?: string;
  lastLogin?: string;
}

export default function UserManagementTab({ currentAdmin }: UserManagementTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{id: string, value: string} | null>(null);
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin-auth/regular-users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail) {
      alert('Email is required');
      return;
    }

    setAdding(true);

    try {
      const response = await fetch('/api/admin-auth/regular-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: newUserEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();
      
      // Refresh user list
      fetchUsers();
      
      setNewUserEmail('');
      setShowAddForm(false);
      alert('User created successfully! Login credentials have been sent.');
    } catch (error) {
      console.error('Failed to add user:', error);
      alert(error instanceof Error ? error.message : 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleCompanyChange = async (userId: string, companyName: string) => {
    // Set processing state for this user
    setProcessing(prev => ({ ...prev, [userId]: true }));
    
    try {
      const response = await fetch(`/api/admin-auth/regular-users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          company: companyName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Company update error response:', errorData);
        
        // Show more specific error message if available
        throw new Error(errorData.error || 'Failed to update company');
      }

      // Update user in local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, company: companyName } : user
      ));
      
      // Clear editing state
      setEditingCompany(null);
    } catch (error) {
      console.error('Failed to update company:', error);
      
      // Show a more detailed error message if possible
      let errorMessage = 'Failed to update company';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
      
      // If error occurred, revert back to viewing mode with original value
      const originalUser = users.find(user => user.id === userId);
      if (originalUser) {
        setEditingCompany(null);
      }
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      // Set processing state for this user
      setProcessing(prev => ({ ...prev, [userId]: true }));
      
      try {
        const response = await fetch(`/api/admin-auth/regular-users/${userId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete user');
        }

        // Remove user from local state
        setUsers(users.filter(user => user.id !== userId));
        alert('User deleted successfully');
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete user');
      } finally {
        setProcessing(prev => ({ ...prev, [userId]: false }));
      }
    }
  };

  const handleResetUser = async (userId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to reset all data for ${userEmail}? This will delete all saved searches, bookmarks, and conversation history.`)) {
      // Set processing state for this user
      setProcessing(prev => ({ ...prev, [userId]: true }));
      
      try {
        const response = await fetch(`/api/admin-auth/regular-users/${userId}/reset`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reset user data');
        }

        alert('User data reset successfully');
      } catch (error) {
        console.error('Failed to reset user data:', error);
        alert(error instanceof Error ? error.message : 'Failed to reset user data');
      } finally {
        setProcessing(prev => ({ ...prev, [userId]: false }));
      }
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to reset password for ${userEmail}? A new temporary password will be sent to their email.`)) {
      // Set processing state for this user
      setProcessing(prev => ({ ...prev, [userId]: true }));
      
      try {
        const response = await fetch(`/api/admin-auth/regular-users/${userId}/reset-password`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reset password');
        }

        alert('Password reset successfully. A temporary password has been sent to the user.');
      } catch (error) {
        console.error('Failed to reset password:', error);
        alert(error instanceof Error ? error.message : 'Failed to reset password');
      } finally {
        setProcessing(prev => ({ ...prev, [userId]: false }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-slate-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium mb-2">Error Loading Users</p>
        <p className="text-slate-600 text-sm mb-4">{error}</p>
        <button
          onClick={fetchUsers}
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
          <h3 className="text-lg font-semibold text-slate-900">User Management</h3>
          <p className="text-sm text-slate-600">
            {users.length} user{users.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="pt-6">
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-1 text-sm text-slate-500">
                  An email with login credentials will be sent to this address
                </p>
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
                      <span>✉️</span>
                      <span>Create & Send Credentials</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewUserEmail('');
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

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Email</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Company</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Last Login</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.email}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {editingCompany && editingCompany.id === user.id ? (
                      <input
                        type="text"
                        value={editingCompany.value}
                        onChange={(e) => setEditingCompany({...editingCompany, value: e.target.value})}
                        onBlur={() => handleCompanyChange(user.id, editingCompany.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCompanyChange(user.id, editingCompany.value)}
                        className="px-2 py-1 border border-slate-300 rounded w-full"
                        autoFocus
                        disabled={processing[user.id]}
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingCompany({id: user.id, value: user.company || ''})}
                        className="cursor-pointer hover:bg-slate-100 px-2 py-1 rounded -mx-2"
                      >
                        {user.company || <span className="text-slate-400 italic">Click to add</span>}
                        {processing[user.id] && <span className="ml-2 inline-block w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={
                        user.status === 'active' ? 'default' : 
                        user.status === 'suspended' ? 'secondary' : 'outline'
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        title="Delete user"
                        disabled={processing[user.id]}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleResetUser(user.id, user.email)}
                        className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                        title="Reset user data (clear saved searches, bookmarks, conversation history)"
                        disabled={processing[user.id]}
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id, user.email)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Reset password and send temporary password to user"
                        disabled={processing[user.id]}
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 text-4xl mb-4">👤</div>
              <p className="text-slate-600 font-medium">No users found</p>
              <p className="text-slate-500 text-sm">Add your first user to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 