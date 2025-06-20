import { createBrowserSupabaseClient } from './supabase';

export interface SavedResidentialFacility {
  id?: number;
  user_id: string;
  facility_name: string;
  facility_id: string; // Unique identifier for the facility
  facility_data: any; // The complete facility JSON data
  search_term?: string; // What the user searched when they saved it
  created_at?: string;
  updated_at?: string;
}

export interface SavedResidentialFacilitiesResponse {
  facilities: SavedResidentialFacility[];
  count: number;
  hasReachedLimit: boolean;
}

// Save a residential facility to saved searches table
export async function saveResidentialFacility(
  userId: string, 
  facilityName: string,
  facilityId: string,
  facilityData: any,
  searchTerm?: string
): Promise<{ success: boolean; error?: string; atLimit?: boolean }> {
  try {
    console.log('Saving residential facility:', facilityName);


    const supabase = createBrowserSupabaseClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔧 DEBUG: Authentication check:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authError: authError ? { message: authError.message, code: authError.code } : null 
    });
    
          if (!user) {
        console.log('User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return { success: false, error: 'User not authenticated' };
    }
    
    if (user.id !== userId) {
      console.error('User ID mismatch:', { providedUserId: userId, actualUserId: user.id });
      return { success: false, error: 'User ID mismatch' };
    }
    
          // Test if table exists by doing a simple query

    const { data: testData, error: testError } = await supabase
      .from('saved_searches')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('🚨 DEBUG: Table test failed:', {
        message: testError.message,
        code: testError.code,
        details: testError.details,
        hint: testError.hint
      });
      
              console.error('Database table test failed:', testError.message);
      
      
      if (testError.message?.includes('relation "public.saved_searches" does not exist')) {
        return { success: false, error: 'Database table does not exist. Please create the saved_searches table in your Supabase database.' };
      }
      
      return { success: false, error: `Database error: ${testError.message}` };
    }
    
          console.log('Database table verified, proceeding with save...');

    
    // Check current count first
    const { count, error: countError } = await supabase
      .from('saved_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('search_type', 'facility');

    if (countError) {
      if (countError.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      console.error('Error checking saved facilities count:', countError);
      return { success: false, error: 'Failed to check facility count' };
    }

    // Check if at limit (using same 100 limit as searches)
    if (count && count >= 100) {
      return { success: false, error: 'You have reached the maximum of 100 saved facilities. Please delete some facilities first.', atLimit: true };
    }

    // Check if this facility already exists for this user
    const { data: existing, error: selectError } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', userId)
      .eq('search_term', facilityId) // Use facilityId as search_term for uniqueness
      .eq('search_type', 'facility')
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing saved facility:', selectError);
      return { success: false, error: 'Failed to check if facility already exists' };
    }

    if (existing) {
      return { success: false, error: 'This facility is already saved' };
    }

    // Prepare location data structure for facility
    const locationData = {
      id: facilityId,
      name: facilityName,
      type: 'facility' as const,
      facilityType: 'residential' as const,
      address: facilityData.formatted_address,
      state: facilityData.address_state,
      // Store complete facility data in a structured way
      facilityData: facilityData
    };

    // Insert new saved facility using the saved_searches table structure


          // Use throwOnError() to get detailed error messages
    try {
      await supabase
        .from('saved_searches')
        .insert({
          user_id: userId,
          search_term: facilityId, // Use facilityId as unique identifier
          search_display_name: facilityName,
          search_type: 'facility',
          location_data: JSON.stringify(locationData),
        })
        .throwOnError();
      
              // If we reach here, the insert succeeded
        console.log('Facility saved successfully');

      return { success: true };
      
          } catch (thrownError: any) {
        // This will give us the real error details
        console.error('Error saving facility:', thrownError);

      
      const realErrorInfo = {
        message: thrownError?.message || 'No message',
        code: thrownError?.code || 'No code',
        details: thrownError?.details || 'No details',
        hint: thrownError?.hint || 'No hint',
        name: thrownError?.name || 'No name',
        stack: thrownError?.stack || 'No stack',
        thrownErrorString: JSON.stringify(thrownError),
        thrownErrorKeys: Object.keys(thrownError || {}),
      };
      
              console.error('Detailed error analysis:', realErrorInfo);
      
      // Handle specific error types
      if (thrownError?.message?.includes('relation "public.saved_searches" does not exist')) {
        return { success: false, error: 'Database table does not exist. Please create the saved_searches table in your Supabase database.' };
      }
      if (thrownError?.message?.includes('Maximum of 100 saved searches')) {
        return { success: false, error: 'You have reached the maximum of 100 saved facilities. Please delete some facilities first.', atLimit: true };
      }
      
      // Return the real error message
      const errorMessage = thrownError?.message || thrownError?.code || 'Unknown database error';
      return { success: false, error: `Failed to save facility: ${errorMessage}` };
    }
      } catch (error) {
      console.error('Unexpected error saving residential facility:', error);

    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get user's saved residential facilities
export async function getUserSavedResidentialFacilities(userId: string): Promise<SavedResidentialFacilitiesResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error, count } = await supabase
      .from('saved_searches')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('search_type', 'facility')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist') || 
          error.code === 'PGRST116') {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { facilities: [], count: 0, hasReachedLimit: false };
      }
      console.error('Error fetching saved facilities:', error);
      return { facilities: [], count: 0, hasReachedLimit: false };
    }

    const facilities = (data || []).map(item => {
      const locationData = item.location_data ? 
        (typeof item.location_data === 'string' ? JSON.parse(item.location_data) : item.location_data) : 
        {};

      return {
        id: item.id,
        user_id: item.user_id,
        facility_name: item.search_display_name || 'Unknown Facility',
        facility_id: item.search_term,
        facility_data: locationData.facilityData || {},
        search_term: locationData.searchTerm,
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });

    return {
      facilities,
      count: count || 0,
      hasReachedLimit: (count || 0) >= 100
    };
  } catch (error) {
    console.error('Error fetching saved residential facilities:', error);
    return { facilities: [], count: 0, hasReachedLimit: false };
  }
}

// Delete a saved residential facility
export async function deleteSavedResidentialFacility(userId: string, facilityId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('user_id', userId)
      .eq('id', facilityId)
      .eq('search_type', 'facility');
    
    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      console.error('Error deleting saved facility:', error);
      return { success: false, error: 'Failed to delete facility' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting saved residential facility:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Check if a residential facility is already saved
export async function isResidentialFacilitySaved(userId: string, facilityId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', userId)
      .eq('search_term', facilityId)
      .eq('search_type', 'facility')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if facility is saved:', error);
      return false;
    }

    return !!(data && data.length > 0);
  } catch (error) {
    console.error('Error checking if facility is saved:', error);
    return false;
  }
}

// Clear all user's saved residential facilities
export async function clearUserSavedResidentialFacilities(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('user_id', userId)
      .eq('search_type', 'facility');
    
    if (error) {
      if (error.message?.includes('relation "public.saved_searches" does not exist')) {
        console.warn('Saved searches table not found. Please run the database setup script.');
        return { success: false, error: 'Database not initialized' };
      }
      console.error('Error clearing saved facilities:', error);
      return { success: false, error: 'Failed to clear facilities' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing saved residential facilities:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
} 