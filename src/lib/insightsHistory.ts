import { createBrowserSupabaseClient } from './supabase';

// Interfaces for insights search history data
export interface InsightsSearchHistoryItem {
  id?: number;
  user_id: string;
  search_term: string;
  selected_location_name?: string;
  selected_location_type?: string; // 'sa2', 'sa3', 'sa4', 'lga', 'postcode', 'locality'
  selected_location_code?: string; // SA2 code, postcode, etc.
  sa2_id?: string; // SA2 ID if an SA2 was ultimately selected
  sa2_name?: string; // SA2 name if an SA2 was ultimately selected
  results_count?: number;
  search_metadata?: any; // JSON data for additional search information
  created_at?: string;
  updated_at?: string;
}

// Response types
export interface InsightsSearchHistoryResponse {
  searches: InsightsSearchHistoryItem[];
  count: number;
}

// HELPER: Auto-cleanup function to maintain records within 30 days
async function cleanupOldInsightsSearchHistory(userId: string): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Delete records older than 30 days
    const { error } = await supabase
      .from('insights_search_history')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error cleaning up old insights search history:', error);
    }
  } catch (error) {
    console.error('Error in cleanup function:', error);
  }
}

/**
 * Save a search to insights search history
 */
export async function saveInsightsSearchToHistory(
  userId: string, 
  searchTerm: string,
  selectedLocationName?: string,
  selectedLocationType?: string,
  selectedLocationCode?: string,
  sa2Id?: string,
  sa2Name?: string,
  resultsCount?: number,
  searchMetadata?: any
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();

    // Cleanup old records before adding new one
    await cleanupOldInsightsSearchHistory(userId);

    // Prepare the search history item
    const historyItem: Omit<InsightsSearchHistoryItem, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      search_term: searchTerm.trim(),
      selected_location_name: selectedLocationName,
      selected_location_type: selectedLocationType,
      selected_location_code: selectedLocationCode,
      sa2_id: sa2Id,
      sa2_name: sa2Name,
      results_count: resultsCount || 0,
      search_metadata: searchMetadata
    };

    // Check for recent duplicate searches (same search term within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSearches, error: checkError } = await supabase
      .from('insights_search_history')
      .select('id')
      .eq('user_id', userId)
      .eq('search_term', searchTerm.trim())
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (checkError) {
      console.error('Error checking for recent duplicates:', checkError);
      return false;
    }

    // If found recent duplicate, don't save again
    if (recentSearches && recentSearches.length > 0) {
      console.log('Skipping duplicate search within last hour');
      return true; // Return true as it's not an error, just a duplicate
    }

    // Insert the new search history record
    const { error } = await supabase
      .from('insights_search_history')
      .insert([historyItem]);

    if (error) {
      console.error('Error saving insights search history:', error);
      return false;
    }

    console.log('Insights search history saved successfully');
    return true;

  } catch (error) {
    console.error('Error in saveInsightsSearchToHistory:', error);
    return false;
  }
}

/**
 * Get user's insights search history (most recent first)
 */
export async function getInsightsSearchHistory(
  userId: string, 
  limit: number = 20
): Promise<InsightsSearchHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from('insights_search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching insights search history:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Error in getInsightsSearchHistory:', error);
    return [];
  }
}

/**
 * Delete a specific insights search history item
 */
export async function deleteInsightsSearchHistoryItem(
  userId: string, 
  itemId: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from('insights_search_history')
      .delete()
      .eq('user_id', userId)
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting insights search history item:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error in deleteInsightsSearchHistoryItem:', error);
    return false;
  }
}

/**
 * Clear all insights search history for a user
 */
export async function clearInsightsSearchHistory(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from('insights_search_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing insights search history:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error in clearInsightsSearchHistory:', error);
    return false;
  }
}

/**
 * Get insights search history count for a user
 */
export async function getInsightsSearchHistoryCount(userId: string): Promise<number> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { count, error } = await supabase
      .from('insights_search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting insights search history count:', error);
      return 0;
    }

    return count || 0;

  } catch (error) {
    console.error('Error in getInsightsSearchHistoryCount:', error);
    return 0;
  }
}

/**
 * Get popular search terms for a user (most searched)
 */
export async function getPopularInsightsSearchTerms(
  userId: string, 
  limit: number = 5
): Promise<Array<{ search_term: string; count: number; last_searched: string }>> {
  try {
    const supabase = createBrowserSupabaseClient();

    // This would require a more complex query, for now we'll get recent unique searches
    const { data, error } = await supabase
      .from('insights_search_history')
      .select('search_term, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Get recent searches to analyze

    if (error) {
      console.error('Error fetching insights search data for popularity analysis:', error);
      return [];
    }

    if (!data) return [];

    // Count occurrences of each search term
    const termCounts: Record<string, { count: number; lastSearched: string }> = {};
    
    data.forEach(item => {
      const term = item.search_term.toLowerCase().trim();
      if (!termCounts[term]) {
        termCounts[term] = { count: 0, lastSearched: item.created_at };
      }
      termCounts[term].count++;
      // Keep the most recent date
      if (item.created_at > termCounts[term].lastSearched) {
        termCounts[term].lastSearched = item.created_at;
      }
    });

    // Convert to array and sort by count, then by recency
    const popularTerms = Object.entries(termCounts)
      .map(([term, data]) => ({
        search_term: term,
        count: data.count,
        last_searched: data.lastSearched
      }))
      .sort((a, b) => {
        // Sort by count first, then by recency
        if (a.count !== b.count) {
          return b.count - a.count;
        }
        return new Date(b.last_searched).getTime() - new Date(a.last_searched).getTime();
      })
      .slice(0, limit);

    return popularTerms;

  } catch (error) {
    console.error('Error in getPopularInsightsSearchTerms:', error);
    return [];
  }
}

/**
 * Search insights history by term
 */
export async function searchInsightsHistory(
  userId: string,
  searchTerm: string,
  limit: number = 10
): Promise<InsightsSearchHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from('insights_search_history')
      .select('*')
      .eq('user_id', userId)
      .ilike('search_term', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching insights history:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Error in searchInsightsHistory:', error);
    return [];
  }
}

/**
 * Get recent SA2 searches (searches that resulted in SA2 selection)
 */
export async function getRecentSA2Searches(
  userId: string,
  limit: number = 10
): Promise<InsightsSearchHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from('insights_search_history')
      .select('*')
      .eq('user_id', userId)
      .not('sa2_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent SA2 searches:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Error in getRecentSA2Searches:', error);
    return [];
  }
} 