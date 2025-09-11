'use client'

import React, { useEffect, useState } from 'react';
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
  email?: string | null;
  user_metadata?: any;
}

export default function UserManagementTab({ currentAdmin }: UserManagementTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Load users on component mount
  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching users from /api/admin/auth-users/list');
      const response = await fetch('/api/admin/auth-users/list', { 
        cache: 'no-store',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Users fetched:', data);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !name) {
      alert('Name and email are required');
      return;
    }

    setAdding(true);
    setMsg(null);

    try {
      const response = await fetch('/api/admin/auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      setName('');
      setEmail('');
      setCompany('');
      setShowAddForm(false);
      setMsg('Invite sent.');
      
      refresh();
    } catch (error) {
      console.error('Failed to add user:', error);
      setMsg(error instanceof Error ? error.message : 'Failed to add user');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteUser(uid: string, userEmail: string) {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;
    
    try {
      const response = await fetch(`/api/admin/auth-users?id=${uid}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      refresh();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete');
    }
  }

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
          onClick={refresh}
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
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">
                  Company (optional)
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>Create & Send Invite</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setName('');
                    setEmail('');
                    setCompany('');
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
              
              {msg && (
                <div className={`text-sm mt-2 ${msg.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </div>
              )}
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
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Name</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Company</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.email}</td>
                  <td className="px-6 py-4 text-slate-600">{user.user_metadata?.full_name ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{user.user_metadata?.company ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email || '')}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        title="Delete user"
                      >
                        Delete
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