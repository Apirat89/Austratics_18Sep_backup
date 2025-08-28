import { createBrowserSupabaseClient } from './supabase';

export interface SavedSearchItem {
  id?: number;
  user_id: string;
  search_term: string;
  search_display_name?: string;
  search_type?: 'location' | 'facility' | 'general';
  location_data?: LocationData;
  created_at?: string;
  updated_at?: string;
}

export interface LocationData {
  id?: string;          // Stable unique identifier
  name: string;
  area?: string;        // Human-readable area description
  code?: string;
  type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality' | 'facility';
  state?: string;
  center?: [number, number];
  bounds?: [number, number, number, number];
  score?: number; // Make optional for compatibility
  // Facility-specific properties
  address?: string;
  careType?: string;
  facilityType?: 'residential' | 'multipurpose_others' | 'home' | 'retirement';
}

export interface SavedSearchesResponse {
  searches: SavedSearchItem[];
  count: number;
  hasReachedLimit: boolean;
}

// Function to ensure saved_searches table exists
export async function initializeSavedSearchesTable() {
  const supabase = createBrowserSupabaseClient();
  
  const { error } = await supabase.rpc('create_saved_searches_table_if_not_exists');
  
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating saved_searches table:', error);
  }
}

// Save a search to saved searches
export async function saveSearchToSavedSearches(
  userId: string, 
  searchTerm: string, 
  locationData?: LocationData,
  searchType: 'location' | 'facility' | 'general' = 'location'
): Promise<{ success: boolean; error?: string; atLimit?: boolean; skipped?: boolean }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // ✅ Initialize table if needed (handles first-time setup)
    await initializeSavedSearchesTable();
    
    // Check current count first
    const { count, error: countError } = await supabase
      .from('saved_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      if (countError.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      console.error('Error checking saved searches count:', countError);
      return { success: false, error: 'Failed to check search count' };
    }

    // Check if at limit
    if (count && count >= 100) {
      return { success: false, error: 'You have reached the maximum of 100 saved searches. Please delete some searches first.', atLimit: true };
    }

    // Check if this search already exists for this user
    const { data: existing, error: selectError } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing saved search:', selectError);
      return { success: false, error: 'Failed to check if search already exists' };
    }

    if (existing) {
      return { success: false, error: 'This search is already saved' };
    }

    // Generate display name if not provided
    const displayName = locationData?.name || searchTerm;

    // Insert new saved search
    const { error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        search_term: searchTerm,
        search_display_name: displayName,
        search_type: searchType,
        location_data: locationData ? JSON.stringify(locationData) : null,
      });
    
    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      if (error.message?.includes('Maximum of 100 saved searches')) {
        return { success: false, error: 'You have reached the maximum of 100 saved searches. Please delete some searches first.', atLimit: true };
      }
      
      // ✅ Handle duplicate key constraint gracefully  
      if (error.code === '23505' || error.message?.includes('duplicate key value violates unique constraint')) {
        console.log(`⏭️ Facility "${searchTerm}" already saved - skipping duplicate`);
        return { success: true, skipped: true }; // Return success to avoid error propagation
      }
      
      // ✅ Enhanced error logging for debugging
      console.error('Error inserting saved search - Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Attempted insert data:', {
        user_id: userId,
        search_term: searchTerm,
        search_display_name: displayName,
        search_type: searchType,
        location_data_length: locationData ? JSON.stringify(locationData).length : 0
      });
      
      return { success: false, error: `Database error: ${error.message || 'Unknown error'}` };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving search to saved searches:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get user's saved searches
export async function getUserSavedSearches(userId: string): Promise<SavedSearchesResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error, count } = await supabase
      .from('saved_searches')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist') || 
          error.code === 'PGRST116') {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { searches: [], count: 0, hasReachedLimit: false };
      }
      console.error('Error fetching saved searches:', error);
      return { searches: [], count: 0, hasReachedLimit: false };
    }

    const searches = (data || []).map(item => ({
      ...item,
      location_data: item.location_data ? (typeof item.location_data === 'string' ? JSON.parse(item.location_data) : item.location_data) : undefined
    }));

    return {
      searches,
      count: count || 0,
      hasReachedLimit: (count || 0) >= 100
    };
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return { searches: [], count: 0, hasReachedLimit: false };
  }
}

// Delete a saved search
export async function deleteSavedSearch(userId: string, searchId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('user_id', userId)
      .eq('id', searchId);
    
    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      console.error('Error deleting saved search:', error);
      return { success: false, error: 'Failed to delete search' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Clear all user's saved searches
export async function clearUserSavedSearches(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      console.error('Error clearing saved searches:', error);
      return { success: false, error: 'Failed to clear searches' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing saved searches:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Check if a search is already saved
export async function isSearchSaved(userId: string, searchTerm: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Check both search_term and search_display_name to handle cases where
    // the user might search with display names but we stored with different search terms
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', userId)
      .or(`search_term.eq.${searchTerm},search_display_name.eq.${searchTerm}`)
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if search is saved:', error);
      return false;
    }

    return !!(data && data.length > 0);
  } catch (error) {
    console.error('Error checking if search is saved:', error);
    return false;
  }
} 