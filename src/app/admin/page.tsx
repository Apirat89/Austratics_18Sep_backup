'use client';

import React, { useState, useEffect } from 'react';
import { Building, Users, BarChart3 } from 'lucide-react';
import { isAuthenticated, isAdmin, getCurrentUserProfile, UserProfile } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// Import admin components directly
import DataTable from '@/components/admin/DataTable';
import FilterBar from '@/components/admin/FilterBar';
import BulkActions from '@/components/admin/BulkActions';
import { DetailModal } from '@/components/admin/Modal';

// Companies Tab with full functionality
const CompaniesTab = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    createdAfter: '',
    createdBefore: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0
  });

  // Fetch companies data
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filters.search && { q: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.createdAfter && { createdAfter: filters.createdAfter }),
        ...(filters.createdBefore && { createdBefore: filters.createdBefore })
      });

      const response = await fetch(`/api/admin/companies?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies on mount and filter changes
  useEffect(() => {
    fetchCompanies();
  }, [pagination.page, pagination.pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchCompanies();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      search: '',
      status: '',
      createdAfter: '',
      createdBefore: ''
    });
  };

  const handleBulkAction = async (actionKey: string) => {
    console.log(`Bulk action ${actionKey} on`, selectedCompanies);
    // Implement bulk actions here
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams({
        format,
        ...(filters.search && { q: filters.search }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/admin/companies?${queryParams}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `companies.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Components are now imported statically

  const filterConfigs = [
    {
      key: 'search',
      label: 'Search',
      type: 'text' as const,
      placeholder: 'Search companies...'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' }
      ]
    },
    {
      key: 'dateRange',
      label: 'Created Date',
      type: 'daterange' as const
    }
  ];

  const columns = [
    {
      key: 'name',
      header: 'Company Name',
      accessor: (company: any) => (
        <div>
          <div className="font-medium text-gray-900">{company.companyName}</div>
          <div className="text-sm text-gray-500">ID: {company.companyId}</div>
        </div>
      )
    },
    {
      key: 'domains',
      header: 'Primary Domains',
      accessor: (company: any) => (
        <div className="text-sm">
          {company.primaryDomains?.length > 0 ? (
            company.primaryDomains.join(', ')
          ) : (
            <span className="text-gray-400">No domains</span>
          )}
        </div>
      )
    },
    {
      key: 'users',
      header: 'Users',
      accessor: (company: any) => (
        <span className="text-sm font-medium">{company.users || 0}</span>
      )
    },
    {
      key: 'emails',
      header: 'Verified Emails',
      accessor: (company: any) => (
        <span className="text-sm font-medium">{company.verifiedEmails || 0}</span>
      )
    },
    {
      key: 'created',
      header: 'Created',
      accessor: (company: any) => (
        <span className="text-sm text-gray-500">
          {new Date(company.createdAt).toLocaleDateString()}
        </span>
      )
    }
  ];

  // Components are loaded statically, no need for loading check

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Companies</h2>
        <p className="text-gray-600">Manage company accounts and verified email lists</p>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
        compactMode
      />

      {selectedCompanies.length > 0 && (
        <BulkActions
          selectedCount={selectedCompanies.length}
          totalCount={companies.length}
          actions={[
            {
              key: 'export-emails',
              label: 'Export Emails',
              icon: ({ className }: { className?: string }) => <BarChart3 className={className} />,
              variant: 'primary' as const
            },
            {
              key: 'suspend',
              label: 'Suspend',
              icon: ({ className }: { className?: string }) => <Users className={className} />,
              variant: 'warning' as const,
              confirmationRequired: true
            }
          ]}
          onAction={handleBulkAction}
          onSelectAll={() => setSelectedCompanies(companies)}
          onClearSelection={() => setSelectedCompanies([])}
        />
      )}

      <DataTable
        data={companies}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
        onPageSizeChange={(pageSize: number) => setPagination(prev => ({ ...prev, pageSize }))}
        selectable
        selectedItems={selectedCompanies}
        onSelectionChange={setSelectedCompanies}
        onExport={handleExport}
        getRowId={(company: any) => company.companyId}
        emptyMessage="No companies found"
      />
    </div>
  );
};

// Users Tab with comprehensive user management
const UsersTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    companyId: '',
    status: '',
    verified: '',
    createdAfter: '',
    createdBefore: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0
  });

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filters.search && { q: filters.search }),
        ...(filters.companyId && { companyId: filters.companyId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.verified && { verified: filters.verified }),
        ...(filters.createdAfter && { createdAfter: filters.createdAfter }),
        ...(filters.createdBefore && { createdBefore: filters.createdBefore })
      });

      const response = await fetch(`/api/admin/users?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // User actions
  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      // Refresh users list
      await fetchUsers();
      
      alert(`User ${action} successful`);
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      alert(`Failed to ${action} user`);
    }
  };

  const handleClearUserData = async (userId: string, dataType: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataType })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear ${dataType}`);
      }

      alert(`${dataType} cleared successfully`);
    } catch (error) {
      console.error(`Error clearing ${dataType}:`, error);
      alert(`Failed to clear ${dataType}`);
    }
  };

  const handleDeleteUser = async (userId: string, mode: 'soft' | 'hard' = 'soft') => {
    if (!confirm(`Are you sure you want to ${mode} delete this user? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers();
      alert(`User ${mode} deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  // Load users on mount and filter changes
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchUsers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      search: '',
      companyId: '',
      status: '',
      verified: '',
      createdAfter: '',
      createdBefore: ''
    });
  };

  const handleBulkAction = async (actionKey: string) => {
    if (!selectedUsers.length) return;

    switch (actionKey) {
      case 'suspend':
        for (const user of selectedUsers) {
          await handleUserAction(user.id, 'suspend');
        }
        break;
      case 'reactivate':
        for (const user of selectedUsers) {
          await handleUserAction(user.id, 'reactivate');
        }
        break;
      case 'reset-password':
        for (const user of selectedUsers) {
          await handleUserAction(user.id, 'reset-password');
        }
        break;
      case 'force-logout':
        for (const user of selectedUsers) {
          await handleUserAction(user.id, 'force-logout');
        }
        break;
    }
    
    setSelectedUsers([]);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams({
        format,
        ...(filters.search && { q: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.companyId && { companyId: filters.companyId })
      });

      const response = await fetch(`/api/admin/users?${queryParams}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Components are now imported statically

  const filterConfigs = [
    {
      key: 'search',
      label: 'Search',
      type: 'text' as const,
      placeholder: 'Search users by email...'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'deleted', label: 'Deleted' }
      ]
    },
    {
      key: 'verified',
      label: 'Email Verified',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Verified' },
        { value: 'false', label: 'Unverified' }
      ]
    },
    {
      key: 'dateRange',
      label: 'Created Date',
      type: 'daterange' as const
    }
  ];

  const columns = [
    {
      key: 'email',
      header: 'User',
      accessor: (user: any) => (
        <div>
          <div className="font-medium text-gray-900">{user.email}</div>
          <div className="text-sm text-gray-500">
            Role: <span className="capitalize">{user.role}</span>
            {user.companyName && (
              <span className="ml-2">• {user.companyName}</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (user: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.status === 'active' 
            ? 'bg-green-100 text-green-800'
            : user.status === 'suspended'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.status}
        </span>
      )
    },
    {
      key: 'verified',
      header: 'Verified',
      accessor: (user: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.emailVerified 
            ? 'bg-blue-100 text-blue-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {user.emailVerified ? 'Verified' : 'Pending'}
        </span>
      )
    },
    {
      key: 'activity',
      header: 'Activity (30d)',
      accessor: (user: any) => (
        <div className="text-sm">
          <div>API: {user.apiCalls30d || 0}</div>
          <div className="text-gray-500">
            Saved: {user.savedItems || 0} | 
            History: {user.searchHistory || 0}
          </div>
        </div>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      accessor: (user: any) => (
        <span className="text-sm text-gray-500">
          {user.lastLoginAt 
            ? new Date(user.lastLoginAt).toLocaleDateString()
            : 'Never'
          }
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (user: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowUserModal(true);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View
          </button>
          <button
            onClick={() => handleUserAction(user.id, user.status === 'active' ? 'suspend' : 'reactivate')}
            className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
          >
            {user.status === 'active' ? 'Suspend' : 'Reactivate'}
          </button>
          <button
            onClick={() => handleDeleteUser(user.id, 'soft')}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  // Components are loaded statically, no need for loading check

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Users</h2>
        <p className="text-gray-600">Manage user accounts and saved data</p>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
        compactMode
      />

      {selectedUsers.length > 0 && (
        <BulkActions
          selectedCount={selectedUsers.length}
          totalCount={users.length}
          actions={[
            {
              key: 'suspend',
              label: 'Suspend Users',
              icon: ({ className }: { className?: string }) => <Users className={className} />,
              variant: 'warning' as const,
              confirmationRequired: true,
              confirmationMessage: `Are you sure you want to suspend ${selectedUsers.length} users?`
            },
            {
              key: 'reactivate',
              label: 'Reactivate Users',
              icon: ({ className }: { className?: string }) => <Users className={className} />,
              variant: 'primary' as const
            },
            {
              key: 'reset-password',
              label: 'Reset Passwords',
              icon: ({ className }: { className?: string }) => <Users className={className} />,
              variant: 'primary' as const,
              confirmationRequired: true
            },
            {
              key: 'force-logout',
              label: 'Force Logout',
              icon: ({ className }: { className?: string }) => <Users className={className} />,
              variant: 'warning' as const,
              confirmationRequired: true
            }
          ]}
          onAction={handleBulkAction}
          onSelectAll={() => setSelectedUsers(users)}
          onClearSelection={() => setSelectedUsers([])}
        />
      )}

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
        onPageSizeChange={(pageSize: number) => setPagination(prev => ({ ...prev, pageSize }))}
        selectable
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        onExport={handleExport}
        getRowId={(user: any) => user.id}
        emptyMessage="No users found"
      />

      {/* User Detail Modal */}
      {selectedUser && (
        <DetailModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          title={`User Details: ${selectedUser.email}`}
          data={selectedUser}
          fields={[
            { key: 'id', label: 'User ID' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'companyName', label: 'Company' },
            { key: 'emailVerified', label: 'Email Verified', render: (value: boolean) => value ? 'Yes' : 'No' },
            { key: 'lastLoginAt', label: 'Last Login', render: (value: string) => value ? new Date(value).toLocaleString() : 'Never' },
            { key: 'createdAt', label: 'Created', render: (value: string) => new Date(value).toLocaleString() },
            { key: 'apiCalls30d', label: 'API Calls (30d)' },
            { key: 'savedItems', label: 'Saved Items' },
            { key: 'searchHistory', label: 'Search History' },
            { key: 'conversations', label: 'Conversations' }
          ]}
          actions={
            <div className="flex space-x-3">
              <button
                onClick={() => handleUserAction(selectedUser.id, 'reset-password')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Reset Password
              </button>
              <button
                onClick={() => handleClearUserData(selectedUser.id, 'all')}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Clear All Data
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUser.id, 'soft')}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          }
        />
      )}
    </div>
  );
};

// Usage Tab with comprehensive analytics
const UsageTab = () => {
  const [activeView, setActiveView] = useState('company');
  const [companyUsage, setCompanyUsage] = useState<any[]>([]);
  const [userUsage, setUserUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    companyId: '',
    userId: '',
    from: '',
    to: '',
    endpoint: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  });

  // Fetch company usage data
  const fetchCompanyUsage = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        groupBy: 'summary',
        ...(filters.companyId && { companyId: filters.companyId }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.endpoint && { endpoint: filters.endpoint }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/admin/usage/company?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company usage');
      }

      const data = await response.json();
      setCompanyUsage(data.data || []);
    } catch (error) {
      console.error('Error fetching company usage:', error);
      setCompanyUsage([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user usage data
  const fetchUserUsage = async () => {
    if (!filters.userId) {
      setUserUsage([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        userId: filters.userId,
        view: 'calls',
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.endpoint && { endpoint: filters.endpoint }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/admin/usage/user?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user usage');
      }

      const data = await response.json();
      setUserUsage(data.calls || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching user usage:', error);
      setUserUsage([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on view change and filter changes
  useEffect(() => {
    if (activeView === 'company') {
      fetchCompanyUsage();
    } else {
      fetchUserUsage();
    }
  }, [activeView, filters, pagination.page, pagination.pageSize]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  const handleFilterReset = () => {
    setFilters({
      companyId: '',
      userId: '',
      from: '',
      to: '',
      endpoint: '',
      status: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const endpoint = activeView === 'company' ? '/api/admin/usage/company' : '/api/admin/usage/user';
      const queryParams = new URLSearchParams({
        format,
        ...(activeView === 'company' ? { groupBy: 'summary' } : { view: 'calls' }),
        ...(filters.companyId && { companyId: filters.companyId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.endpoint && { endpoint: filters.endpoint }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`${endpoint}?${queryParams}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeView}-usage.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Components are now imported statically

  // Filter configurations based on active view
  const getFilterConfigs = () => {
    const baseFilters = [
      {
        key: 'from',
        label: 'From Date',
        type: 'date' as const
      },
      {
        key: 'to', 
        label: 'To Date',
        type: 'date' as const
      },
      {
        key: 'endpoint',
        label: 'Endpoint',
        type: 'text' as const,
        placeholder: 'Filter by endpoint...'
      },
      {
        key: 'status',
        label: 'Status Code',
        type: 'select' as const,
        options: [
          { value: '200', label: '200 - Success' },
          { value: '400', label: '400 - Bad Request' },
          { value: '401', label: '401 - Unauthorized' },
          { value: '403', label: '403 - Forbidden' },
          { value: '404', label: '404 - Not Found' },
          { value: '500', label: '500 - Server Error' }
        ]
      }
    ];

    if (activeView === 'company') {
      return [
        {
          key: 'companyId',
          label: 'Company ID',
          type: 'text' as const,
          placeholder: 'Enter company ID...'
        },
        ...baseFilters
      ];
    } else {
      return [
        {
          key: 'userId',
          label: 'User ID',
          type: 'text' as const,
          placeholder: 'Enter user ID...'
        },
        ...baseFilters
      ];
    }
  };

  // Column definitions for company view
  const companyColumns = [
    {
      key: 'companyId',
      header: 'Company ID',
      accessor: (item: any) => (
        <span className="font-mono text-sm">{item.company_id}</span>
      )
    },
    {
      key: 'companyName',
      header: 'Company Name',
      accessor: (item: any) => (
        <span className="font-medium">{item.company_name}</span>
      )
    },
    {
      key: 'totalCalls',
      header: 'Total Calls',
      accessor: (item: any) => (
        <span className="font-medium">{item.total_calls || 0}</span>
      )
    },
    {
      key: 'uniqueUsers',
      header: 'Unique Users',
      accessor: (item: any) => (
        <span>{item.unique_users || 0}</span>
      )
    },
    {
      key: 'avgLatency',
      header: 'Avg Latency (ms)',
      accessor: (item: any) => (
        <span>{item.avg_latency ? Math.round(item.avg_latency) : 0}</span>
      )
    },
    {
      key: 'errorRate',
      header: 'Error Rate',
      accessor: (item: any) => (
        <span className={`${item.error_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
          {item.error_rate ? `${item.error_rate.toFixed(1)}%` : '0%'}
        </span>
      )
    }
  ];

  // Column definitions for user view
  const userColumns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      accessor: (item: any) => (
        <span className="text-sm text-gray-600">
          {new Date(item.timestamp).toLocaleString()}
        </span>
      )
    },
    {
      key: 'endpoint',
      header: 'Endpoint',
      accessor: (item: any) => (
        <span className="font-mono text-sm">{item.endpoint}</span>
      )
    },
    {
      key: 'method',
      header: 'Method',
      accessor: (item: any) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          item.method === 'GET' ? 'bg-blue-100 text-blue-800' :
          item.method === 'POST' ? 'bg-green-100 text-green-800' :
          item.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
          item.method === 'DELETE' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.method}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (item: any) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          item.status_code >= 200 && item.status_code < 300 
            ? 'bg-green-100 text-green-800'
            : item.status_code >= 400 && item.status_code < 500
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {item.status_code}
        </span>
      )
    },
    {
      key: 'latency',
      header: 'Latency (ms)',
      accessor: (item: any) => (
        <span className={`${item.latency_ms > 1000 ? 'text-red-600' : 'text-gray-900'}`}>
          {item.latency_ms}
        </span>
      )
    },
    {
      key: 'ip',
      header: 'IP Address',
      accessor: (item: any) => (
        <span className="font-mono text-sm text-gray-600">{item.ip_address}</span>
      )
    }
  ];

  // Components are loaded statically, no need for loading check

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Usage Analytics</h2>
        <p className="text-gray-600">Monitor API calls and system usage</p>
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveView('company')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeView === 'company'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Company Usage
          </button>
          <button
            onClick={() => setActiveView('user')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeView === 'user'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            User Usage
          </button>
        </div>
      </div>

      <FilterBar
        filters={getFilterConfigs()}
        values={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
        compactMode={false}
      />

      <DataTable
        data={activeView === 'company' ? companyUsage : userUsage}
        columns={activeView === 'company' ? companyColumns : userColumns}
        loading={loading}
        pagination={activeView === 'user' ? pagination : undefined}
        onPageChange={activeView === 'user' ? (page: number) => setPagination(prev => ({ ...prev, page })) : undefined}
        onPageSizeChange={activeView === 'user' ? (pageSize: number) => setPagination(prev => ({ ...prev, pageSize })) : undefined}
        onExport={handleExport}
        getRowId={(item: any, index: number) => `${activeView}-${item.id || index}`}
        emptyMessage={`No ${activeView} usage data found`}
      />
    </div>
  );
};

interface Tab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const tabs: Tab[] = [
  {
    id: 'companies',
    name: 'Companies',
    icon: Building,
    component: CompaniesTab
  },
  {
    id: 'users', 
    name: 'Users',
    icon: Users,
    component: UsersTab
  },
  {
    id: 'usage',
    name: 'Usage',
    icon: BarChart3,
    component: UsageTab
  }
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('companies');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if user is authenticated
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          router.push('/auth/signin?redirect=/admin');
          return;
        }

        // Get user profile with role information
        const profile = await getCurrentUserProfile();
        if (!profile) {
          router.push('/auth/signin?redirect=/admin');
          return;
        }

        // Check if user has admin privileges (owner or staff)
        if (profile.role !== 'owner' && profile.role !== 'staff') {
          setError('Access denied. Admin privileges required.');
          return;
        }

        // Check if account is active
        if (profile.status !== 'active') {
          setError(`Account is ${profile.status}. Please contact support.`);
          return;
        }

        setUserProfile(profile);
      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Failed to authenticate. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <p className="font-bold">Access Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || CompaniesTab;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage companies, users, and monitor system usage
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{userProfile.email}</span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {userProfile.role}
                </span>
                {userProfile.companyName && (
                  <span className="ml-2 text-gray-500">
                    • {userProfile.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveTabComponent />
      </div>
    </div>
  );
} 