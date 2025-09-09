'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Settings, Save, Database, Clock, Users, Bell, Shield, AlertTriangle } from 'lucide-react';

interface AppConfig {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: string;
}

interface SystemStats {
  total_users: number;
  total_events: number;
  total_conversations: number;
  total_searches: number;
  total_saved_items: number;
  database_size: string;
  oldest_event: string;
  newest_event: string;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchConfigs();
    fetchSystemStats();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/settings/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: changes })
      });

      if (response.ok) {
        setConfigs(configs.map(config => ({
          ...config,
          value: changes[config.key] !== undefined ? changes[config.key] : config.value
        })));
        setChanges({});
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCleanupOldData = async () => {
    try {
      const response = await fetch('/api/admin/settings/cleanup', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Cleanup completed: ${data.message}`);
        fetchSystemStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to cleanup data:', error);
    }
  };

  const getCurrentValue = (config: AppConfig) => {
    return changes[config.key] !== undefined ? changes[config.key] : config.value;
  };

  const hasChanges = Object.keys(changes).length > 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfigIcon = (key: string) => {
    if (key.includes('retention')) return Clock;
    if (key.includes('max')) return Users;
    if (key.includes('notification')) return Bell;
    return Settings;
  };

  const getConfigColor = (key: string) => {
    if (key.includes('retention')) return 'text-orange-500';
    if (key.includes('max')) return 'text-blue-500';
    if (key.includes('notification')) return 'text-green-500';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">Configure application behavior and data management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">
            {configs.length} configuration options
          </span>
        </div>
      </div>

      {/* System Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_users.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_events.toLocaleString()}</p>
                </div>
                <Database className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversations</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_conversations.toLocaleString()}</p>
                </div>
                <Database className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Saved Items</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_saved_items.toLocaleString()}</p>
                </div>
                <Database className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Settings
              </CardTitle>
              {hasChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {configs.map((config) => {
                const Icon = getConfigIcon(config.key);
                const iconColor = getConfigColor(config.key);
                const currentValue = getCurrentValue(config);
                const hasChange = changes[config.key] !== undefined;

                return (
                  <div key={config.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                      <label className="text-sm font-medium text-gray-900">
                        {config.key.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </label>
                      {hasChange && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-800">
                          Modified
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      {config.description}
                    </p>

                    {config.key.includes('enabled') ? (
                      <select
                        value={currentValue}
                        onChange={(e) => handleConfigChange(config.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <input
                        type={config.key.includes('days') ? 'number' : 'text'}
                        value={currentValue}
                        onChange={(e) => handleConfigChange(config.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        min={config.key.includes('days') ? '1' : undefined}
                      />
                    )}

                    <div className="text-xs text-gray-400">
                      Last updated: {formatDate(config.updated_at)} by {config.updated_by}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Information and Actions */}
        <div className="space-y-6">
          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Database Size</span>
                      <span className="text-sm font-medium text-gray-900">{stats.database_size}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Oldest Event</span>
                      <span className="text-sm font-medium text-gray-900">
                        {stats.oldest_event ? formatDate(stats.oldest_event) : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Newest Event</span>
                      <span className="text-sm font-medium text-gray-900">
                        {stats.newest_event ? formatDate(stats.newest_event) : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Total Searches</span>
                      <span className="text-sm font-medium text-gray-900">{stats.total_searches.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Data Cleanup</h4>
                      <p className="text-xs text-yellow-700 mt-1">
                        Remove old data based on retention settings. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCleanupOldData}
                    className="mt-3 w-full px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    Run Data Cleanup
                  </button>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Export Data</h4>
                      <p className="text-xs text-blue-700 mt-1">
                        Export system data for backup or analysis purposes.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      // TODO: Implement data export
                      alert('Export functionality will be implemented in a future update');
                    }}
                  >
                    Export System Data
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              You have unsaved changes
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 