import { createAdminServiceRoleClient } from './supabase-admin';

// Use admin client for direct DB access
const supabase = createAdminServiceRoleClient();

export type UsageEvent = {
  user_id: string;
  page?: string;
  service: string;
  action?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  duration_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  meta?: Record<string, any>;
  user_agent?: string;
  client_ip?: string;
};

interface ServiceRecord {
  service: string;
}

export type UserServiceUsage = {
  user_id: string;
  email: string;
  supabase: number;
  maptiler: number;
  gemini: number;
  news: number;
  other: number;
  total: number;
};

/**
 * Log an API usage event to the database
 */
export async function logUsage(e: UsageEvent) {
  return supabase.from('api_usage_events').insert(e);
}

/**
 * Get summary of API usage for a specific user across multiple time windows
 */
export async function summarizeUsage(userId: string, windows = [7, 15, 30, 60, 90]) {
  console.log(`Summarizing usage for user ${userId} across windows:`, windows);
  
  // Return counts by service for each window
  const now = new Date().toISOString();
  const results: Record<string, Record<number, number>> = {}; // service -> window -> count

  // For each time window, get the count of events by service
  await Promise.all(windows.map(async (days) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log(`Checking window: ${days} days, from ${startDate.toISOString()}`);
    
    // First get all distinct services for this user in this time window
    const { data: services, error: servicesError } = await supabase
      .from('api_usage_events')
      .select('service')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());
      
    if (servicesError) {
      console.error(`Error getting services for window ${days}:`, servicesError);
      return;
    }
    
    console.log(`Found ${services?.length || 0} service records for window ${days}`);
    
    // Extract unique services
    const uniqueServices = Array.from(
      new Set(services?.map(item => item.service) || [])
    );
    
    console.log(`Unique services for window ${days}:`, uniqueServices);
    
    // Then for each service, get the count
    if (uniqueServices.length > 0) {
      await Promise.all(uniqueServices.map(async (service) => {
        const { count, error: countError } = await supabase
          .from('api_usage_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('service', service)
          .gte('created_at', startDate.toISOString());
          
        if (countError) {
          console.error(`Error getting count for service ${service} in window ${days}:`, countError);
          return;
        }
        
        console.log(`Service ${service}, window ${days}: count = ${count}`);
        
        results[service] = results[service] || {};
        results[service][days] = count || 0;
      }));
    }
  }));

  // Calculate totals for each window
  const totals: Record<number, number> = {};
  windows.forEach(days => {
    totals[days] = Object.values(results).reduce((sum, serviceData) => {
      return sum + (serviceData[days] || 0);
    }, 0);
  });

  console.log('Usage summary results:', { perService: results, totals });

  return { 
    windows, 
    perService: results, 
    totals, 
    generatedAt: now 
  };
}

/**
 * Get a tabular summary of all users' API usage within a specific time window
 */
export async function summarizeAllUsersUsage(days: number = 30) {
  console.log(`Summarizing usage for all users for the last ${days} days`);
  
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  
  try {
    // Get all unique users who have API usage events in the time period
    const { data: users, error: usersError } = await supabase
      .from('api_usage_events')
      .select('user_id')
      .gte('created_at', startDate.toISOString())
      .order('user_id')
      .limit(1000);
    
    if (usersError) {
      console.error('Error getting unique users:', usersError);
      return { success: false, error: 'Failed to retrieve user list' };
    }
    
    // Get unique user IDs
    const uniqueUserIds = Array.from(new Set(users?.map(item => item.user_id) || []));
    console.log(`Found ${uniqueUserIds.length} unique users with API usage`);
    
    if (uniqueUserIds.length === 0) {
      return { success: true, users: [], generatedAt: now.toISOString() };
    }
    
    // Get emails for these users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (authError) {
      console.error('Error fetching user emails:', authError);
      // Continue without emails
    }
    
    // Create email lookup map
    const emailMap: Record<string, string> = {};
    if (authUsers?.users) {
      authUsers.users.forEach(user => {
        emailMap[user.id] = user.email || 'Unknown';
      });
    }
    
    // Get counts by service for each user
    const results: UserServiceUsage[] = [];
    
    await Promise.all(uniqueUserIds.map(async (userId) => {
      // Get count for each main service type
      const servicePromises = ['supabase', 'maptiler', 'gemini', 'news'].map(async (service) => {
        const { count, error: countError } = await supabase
          .from('api_usage_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('service', service)
          .gte('created_at', startDate.toISOString());
          
        if (countError) {
          console.error(`Error getting ${service} count for user ${userId}:`, countError);
          return 0;
        }
        
        return count || 0;
      });
      
      // Get count for "other" services
      const otherPromise = supabase
        .from('api_usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('service', 'in', '("supabase","maptiler","gemini","news")')
        .gte('created_at', startDate.toISOString())
        .then(({ count, error }) => {
          if (error) {
            console.error(`Error getting other services count for user ${userId}:`, error);
            return 0;
          }
          return count || 0;
        });
      
      // Wait for all counts
      const [supabaseCount, maptilerCount, geminiCount, newsCount, otherCount] = 
        await Promise.all([...servicePromises, otherPromise]);
      
      const total = supabaseCount + maptilerCount + geminiCount + newsCount + otherCount;
      
      results.push({
        user_id: userId,
        email: emailMap[userId] || 'Unknown',
        supabase: supabaseCount,
        maptiler: maptilerCount,
        gemini: geminiCount,
        news: newsCount,
        other: otherCount,
        total
      });
    }));
    
    // Sort by total usage (highest first)
    results.sort((a, b) => b.total - a.total);
    
    return { 
      success: true, 
      users: results, 
      generatedAt: now.toISOString(),
      daysPeriod: days
    };
  } catch (error) {
    console.error('Error in summarizeAllUsersUsage:', error);
    return { success: false, error: 'Failed to generate usage summary' };
  }
}

/**
 * Check if a user's API usage exceeds thresholds
 */
export async function checkForAbuse(userId: string, thresholds = { sevenDay: 1000, daily: 200 }) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get daily count
  const { count: dailyCount, error: dailyError } = await supabase
    .from('api_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', yesterday.toISOString());

  if (dailyError) {
    console.error('Error checking daily usage:', dailyError);
    return { isAbusing: false, error: true };
  }

  // Get 7-day count
  const { count: weeklyCount, error: weeklyError } = await supabase
    .from('api_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (weeklyError) {
    console.error('Error checking weekly usage:', weeklyError);
    return { isAbusing: false, error: true };
  }

  return {
    isAbusing: (dailyCount || 0) > thresholds.daily || (weeklyCount || 0) > thresholds.sevenDay,
    metrics: {
      daily: dailyCount || 0,
      weekly: weeklyCount || 0
    },
    thresholds
  };
} 