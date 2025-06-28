import { createBrowserSupabaseClient } from './supabase';

// Interface for saved residential facility data
export interface SavedResidentialFacility {
  id: number;
  user_id: string;
  facility_name: string;
  facility_id: string;
  facility_data: any;
  created_at: string;
  updated_at: string;
}

// Response interface for getting saved facilities
export interface SavedResidentialFacilitiesResponse {
  facilities: SavedResidentialFacility[];
  count: number;
  hasReachedLimit: boolean;
}

// Save a residential facility to the dedicated table
export async function saveResidentialFacility(
  userId: string,
  facilityId: string,
  facilityName: string,
  facilityData: any
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    console.log('Saving residential facility:', facilityName);
    
    // Check current count first
    const { count, error: countError } = await supabase
      .from('residential_saved_facilities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error checking facility count:', countError);
      return { success: false, message: 'Error checking saved facilities count' };
    }

    if (count && count >= 100) {
      return { success: false, message: 'Cannot save more than 100 facilities' };
    }

    // Check if this facility already exists for this user
    const { data: existing, error: selectError } = await supabase
      .from('residential_saved_facilities')
      .select('id')
      .eq('user_id', userId)
      .eq('facility_id', facilityId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing facility:', selectError);
      return { success: false, message: 'Error checking if facility is already saved' };
    }

    if (existing) {
      return { success: false, message: 'Facility is already saved' };
    }

    // Insert the new facility
    const { data, error } = await supabase
      .from('residential_saved_facilities')
      .insert({
        user_id: userId,
        facility_id: facilityId,
        facility_name: facilityName,
        facility_data: facilityData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving facility:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Check if the table doesn't exist
      if (error.message?.includes('relation "public.residential_saved_facilities" does not exist') || 
          error.code === '42P01') {
        console.error('The residential_saved_facilities table does not exist. Please run the database setup script.');
        return { 
          success: false, 
          message: 'Database table not found. Please contact support to set up the saved facilities feature.' 
        };
      }
      
      return { success: false, message: 'Failed to save facility' };
    }

    console.log('Facility saved successfully');
    return { success: true, message: 'Facility saved successfully', data };

  } catch (error) {
    console.error('Unexpected error saving facility:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
}

// Get all saved residential facilities for a user
export async function getUserSavedResidentialFacilities(userId: string): Promise<SavedResidentialFacilitiesResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error, count } = await supabase
      .from('residential_saved_facilities')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation "public.residential_saved_facilities" does not exist') || 
          error.code === 'PGRST116') {
        console.warn('Residential saved facilities table not found. Please run the database setup script.');
        return { facilities: [], count: 0, hasReachedLimit: false };
      }
      console.error('Error fetching saved residential facilities:', error);
      return { facilities: [], count: 0, hasReachedLimit: false };
    }

    const facilities = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      facility_name: item.facility_name,
      facility_id: item.facility_id,
      facility_data: item.facility_data,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

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
export async function deleteSavedResidentialFacility(userId: string, facilityId: number): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_saved_facilities')
      .delete()
      .eq('user_id', userId)
      .eq('id', facilityId);

    if (error) {
      console.error('Error deleting saved facility:', error);
      return { success: false, message: 'Failed to delete facility' };
    }

    return { success: true, message: 'Facility deleted successfully' };
  } catch (error) {
    console.error('Unexpected error deleting facility:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
}

// Check if a residential facility is saved
export async function isResidentialFacilitySaved(userId: string, facilityId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('residential_saved_facilities')
      .select('id')
      .eq('user_id', userId)
      .eq('facility_id', facilityId)
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

// Clear all saved residential facilities for a user
export async function clearUserSavedResidentialFacilities(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_saved_facilities')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing saved facilities:', error);
      return { success: false, message: 'Failed to clear saved facilities' };
    }

    return { success: true, message: 'All saved facilities cleared successfully' };
  } catch (error) {
    console.error('Unexpected error clearing facilities:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
} 