import { createReadOnlyServerSupabaseClient } from '../../lib/supabase';
import { Users, Activity, MessageSquare, Search, BarChart3 } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalConversations: number;
  totalSearches: number;
  activeFeatures: { feature: string; label: string; events: number }[];
  recentActivity: { 
    user_email: string; 
    feature: string; 
    action: string; 
    ts: string; 
    feature_label: string;
  }[];
}

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createReadOnlyServerSupabaseClient();

  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total events (last 30 days)
    const { count: totalEvents } = await supabase
      .from('user_events')
      .select('*', { count: 'exact', head: true })
      .gte('ts', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Get total searches (last 30 days)
    const { count: totalSearches } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .gte('ts', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get active features usage
    const { data: activeFeatures } = await supabase
      .from('user_events')
      .select(`
        feature,
        feature_dim!inner(label)
      `)
      .gte('ts', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Process active features
    const featureStats = activeFeatures?.reduce((acc: Record<string, { feature: string; label: string; events: number }>, event: any) => {
      const feature = event.feature;
      const label = event.feature_dim?.label || 'Unknown';
      acc[feature] = {
        feature,
        label,
        events: (acc[feature]?.events || 0) + 1
      };
      return acc;
    }, {} as Record<string, { feature: string; label: string; events: number }>) || {};

    const topFeatures = Object.values(featureStats)
      .sort((a: any, b: any) => b.events - a.events)
      .slice(0, 5) as { feature: string; label: string; events: number }[];

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('user_events')
      .select(`
        feature,
        action,
        ts,
        profiles!inner(email),
        feature_dim!inner(label)
      `)
      .order('ts', { ascending: false })
      .limit(10);

    const formattedActivity = recentActivity?.map((event: any) => ({
      user_email: event.profiles?.email || 'Unknown',
      feature: event.feature,
      action: event.action,
      ts: event.ts,
      feature_label: event.feature_dim?.label || 'Unknown'
    })) || [];

    return {
      totalUsers: totalUsers || 0,
      totalEvents: totalEvents || 0,
      totalConversations: totalConversations || 0,
      totalSearches: totalSearches || 0,
      activeFeatures: topFeatures,
      recentActivity: formattedActivity
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalUsers: 0,
      totalEvents: 0,
      totalConversations: 0,
      totalSearches: 0,
      activeFeatures: [],
      recentActivity: []
    };
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">
          System metrics and user activity summary
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Events (30d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Search className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Searches (30d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSearches}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Top Features (7 days)
            </h2>
          </div>
          <div className="p-6">
            {stats.activeFeatures.length > 0 ? (
              <div className="space-y-4">
                {stats.activeFeatures.map((feature) => (
                  <div key={feature.feature} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{feature.label}</p>
                      <p className="text-sm text-gray-500">{feature.feature}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {feature.events} events
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No activity data available
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900">
                        {activity.user_email}
                      </p>
                      <p className="text-gray-500">
                        {activity.action} in {activity.feature_label}
                      </p>
                    </div>
                    <div className="text-gray-400">
                      {new Date(activity.ts).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <a
            href="/admin/usage"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Usage Analytics
          </a>
          <a
            href="/admin/conversations"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Manage Conversations
          </a>
        </div>
      </div>
    </div>
  );
} 