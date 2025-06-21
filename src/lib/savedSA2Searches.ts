import { createBrowserSupabaseClient } from './supabase';

// Interface for saved SA2 search data
export interface SavedSA2Search {
  id: number;
  user_id: string;
  sa2_id: string;
  sa2_name: string;
  sa2_data: any;
  search_metadata: any;
  created_at: string;
  updated_at: string;
}

// Response interface for getting saved SA2 searches
export interface SavedSA2SearchesResponse {
  searches: SavedSA2Search[];
  count: number;
  hasReachedLimit: boolean;
}

// Save an SA2 search to the dedicated table
export async function saveSA2Search(
  userId: string,
  sa2Id: string,
  sa2Name: string,
  sa2Data: any,
  searchMetadata: any = {}
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    console.log('Saving SA2 search:', sa2Name);
    
    // Check current count first
    const { count, error: countError } = await supabase
      .from('sa2_saved_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error checking SA2 search count:', countError);
      return { success: false, message: 'Error checking saved searches count' };
    }

    if (count && count >= 100) {
      return { success: false, message: 'Cannot save more than 100 SA2 searches' };
    }

    // Check if this SA2 already exists for this user
    const { data: existing, error: selectError } = await supabase
      .from('sa2_saved_searches')
      .select('id')
      .eq('user_id', userId)
      .eq('sa2_id', sa2Id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing SA2 search:', selectError);
      return { success: false, message: 'Error checking if SA2 is already saved' };
    }

    if (existing) {
      return { success: false, message: 'SA2 region is already saved' };
    }

    // Insert the new SA2 search
    const { data, error } = await supabase
      .from('sa2_saved_searches')
      .insert({
        user_id: userId,
        sa2_id: sa2Id,
        sa2_name: sa2Name,
        sa2_data: sa2Data,
        search_metadata: searchMetadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving SA2 search:', error);
      
      // Check if it's a table doesn't exist error
      if (error.message?.includes('relation "public.sa2_saved_searches" does not exist') || 
          error.code === '42P01') {
        return { 
          success: false, 
          message: 'Database table not found. Please run the SQL setup script in Supabase first.' 
        };
      }
      
      // Check for duplicate constraint error
      if (error.message?.includes('sa2_saved_searches_user_sa2_unique') || 
          error.code === '23505') {
        return { 
          success: false, 
          message: 'This SA2 region is already saved to your account.' 
        };
      }
      
      return { 
        success: false, 
        message: `Database error: ${error.message || 'Failed to save SA2 search'}` 
      };
    }

    console.log('SA2 search saved successfully');
    return { success: true, message: 'SA2 search saved successfully', data };

  } catch (error) {
    console.error('Unexpected error saving SA2 search:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
}

// Get all saved SA2 searches for a user
export async function getUserSavedSA2Searches(userId: string): Promise<SavedSA2SearchesResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error, count } = await supabase
      .from('sa2_saved_searches')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation "public.sa2_saved_searches" does not exist') || 
          error.code === 'PGRST116') {
        console.warn('SA2 saved searches table not found. Please run the database setup script.');
        return { searches: [], count: 0, hasReachedLimit: false };
      }
      console.error('Error fetching saved SA2 searches:', error);
      return { searches: [], count: 0, hasReachedLimit: false };
    }

    const searches = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      sa2_id: item.sa2_id,
      sa2_name: item.sa2_name,
      sa2_data: item.sa2_data,
      search_metadata: item.search_metadata,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    return {
      searches,
      count: count || 0,
      hasReachedLimit: (count || 0) >= 100
    };
  } catch (error) {
    console.error('Error fetching saved SA2 searches:', error);
    return { searches: [], count: 0, hasReachedLimit: false };
  }
}

// Delete a saved SA2 search
export async function deleteSavedSA2Search(userId: string, searchId: number): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('sa2_saved_searches')
      .delete()
      .eq('user_id', userId)
      .eq('id', searchId);

    if (error) {
      console.error('Error deleting saved SA2 search:', error);
      return { success: false, message: 'Failed to delete SA2 search' };
    }

    return { success: true, message: 'SA2 search deleted successfully' };
  } catch (error) {
    console.error('Unexpected error deleting SA2 search:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
}

// Delete a saved SA2 search by SA2 ID
export async function deleteSavedSA2SearchBySA2Id(userId: string, sa2Id: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('sa2_saved_searches')
      .delete()
      .eq('user_id', userId)
      .eq('sa2_id', sa2Id);

    if (error) {
      console.error('Error deleting saved SA2 search by SA2 ID:', error);
      return { success: false, message: 'Failed to delete SA2 search' };
    }

    return { success: true, message: 'SA2 search deleted successfully' };
  } catch (error) {
    console.error('Unexpected error deleting SA2 search by SA2 ID:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
}

// Check if an SA2 search is saved
export async function isSA2SearchSaved(userId: string, sa2Id: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('sa2_saved_searches')
      .select('id')
      .eq('user_id', userId)
      .eq('sa2_id', sa2Id)
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if SA2 search is saved:', error);
      return false;
    }

    return !!(data && data.length > 0);
  } catch (error) {
    console.error('Error checking if SA2 search is saved:', error);
    return false;
  }
}

// Clear all saved SA2 searches for a user
export async function clearUserSavedSA2Searches(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('sa2_saved_searches')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing saved SA2 searches:', error);
      return { success: false, message: 'Failed to clear saved SA2 searches' };
    }

    return { success: true, message: 'All saved SA2 searches cleared successfully' };
  } catch (error) {
    console.error('Unexpected error clearing SA2 searches:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
} 