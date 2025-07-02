import { createBrowserSupabaseClient } from './supabase';

// Interfaces for residential history data
export interface ResidentialSearchHistoryItem {
  id?: number;
  user_id: string;
  search_term: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResidentialComparisonHistoryItem {
  id?: number;
  user_id: string;
  comparison_name: string;
  facility_names: string[];
  created_at?: string;
  updated_at?: string;
}

// NEW: Interface for persistent comparison selections
export interface ResidentialComparisonSelection {
  id?: number;
  user_id: string;
  facility_id: string;
  facility_name: string;
  facility_data: any;
  created_at?: string;
  updated_at?: string;
}

// Response types
export interface ResidentialSearchHistoryResponse {
  searches: ResidentialSearchHistoryItem[];
  count: number;
}

export interface ResidentialComparisonHistoryResponse {
  comparisons: ResidentialComparisonHistoryItem[];
  count: number;
}

export interface ResidentialComparisonSelectionsResponse {
  selections: ResidentialComparisonSelection[];
  count: number;
}

// HELPER: Auto-cleanup function to maintain max 10 records
async function cleanupOldRecords(
  tableName: string, 
  userId: string, 
  maxRecords: number = 10
): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Get count of current records
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError || !count) return;

    // If we have more than maxRecords, delete the oldest ones
    if (count > maxRecords) {
      const deleteCount = count - maxRecords;
      
      // Get IDs of oldest records to delete
      const { data: oldRecords, error: selectError } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .limit(deleteCount);

      if (selectError || !oldRecords?.length) return;

      // Delete the oldest records
      const idsToDelete = oldRecords.map(record => record.id);
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', idsToDelete);

      if (!deleteError) {
        console.log(`Cleaned up ${deleteCount} old records from ${tableName}`);
      }
    }
  } catch (error) {
    console.error(`Error cleaning up old records from ${tableName}:`, error);
  }
}

// RESIDENTIAL SEARCH HISTORY FUNCTIONS

// Save search term to residential search history with auto-cleanup
export async function saveResidentialSearchToHistory(
  userId: string, 
  searchTerm: string
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Check if this search already exists for this user (to avoid duplicates)
    const { data: existing, error: selectError } = await supabase
      .from('residential_search_history')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // Handle case where table doesn't exist yet
      if (selectError.message?.includes('relation "public.residential_search_history" does not exist') || 
          selectError.message?.includes('does not exist')) {
        console.warn('Residential search history table not found. Search not saved. Please run the database setup script.');
        return false;
      }
      // Ignore "No rows found" error (PGRST116) as it's expected when no existing record
      if (selectError.code !== 'PGRST116') {
        console.error('Error checking existing residential search:', selectError.message || selectError);
        return false;
      }
    }

    if (existing) {
      // Update existing record's timestamp
      const { error: updateError } = await supabase
        .from('residential_search_history')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating residential search history:', updateError.message || updateError);
        return false;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('residential_search_history')
        .insert({
          user_id: userId,
          search_term: searchTerm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving residential search to history:', insertError.message || insertError);
        return false;
      }

      // Auto-cleanup old records (keep only 10 most recent)
      await cleanupOldRecords('residential_search_history', userId, 10);
    }

    console.log('Residential search saved to history:', searchTerm);
    return true;
  } catch (error) {
    console.error('Error saving residential search to history:', error);
    return false;
  }
}

// Get residential search history for a user
export async function getResidentialSearchHistory(
  userId: string, 
  limit: number = 10
): Promise<ResidentialSearchHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('residential_search_history')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message?.includes('relation "public.residential_search_history" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('Residential search history table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching residential search history:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching residential search history:', error);
    return [];
  }
}

// Delete individual residential search history item
export async function deleteResidentialSearchHistoryItem(
  userId: string, 
  itemId: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_search_history')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId); // Ensure user can only delete their own items

    if (error) {
      console.error('Error deleting residential search history item:', error.message || error);
      return false;
    }

    console.log('Residential search history item deleted:', itemId);
    return true;
  } catch (error) {
    console.error('Error deleting residential search history item:', error);
    return false;
  }
}

// Clear all residential search history for a user
export async function clearResidentialSearchHistory(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_search_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing residential search history:', error.message || error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing residential search history:', error);
    return false;
  }
}

// RESIDENTIAL COMPARISON HISTORY FUNCTIONS

// Save comparison to residential comparison history with auto-cleanup
export async function saveResidentialComparisonToHistory(
  userId: string, 
  comparisonName: string,
  facilityNames: string[]
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Check if this comparison already exists for this user (to avoid duplicates)
    const { data: existing, error: selectError } = await supabase
      .from('residential_comparison_history')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('comparison_name', comparisonName)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // Handle case where table doesn't exist yet
      if (selectError.message?.includes('relation "public.residential_comparison_history" does not exist') || 
          selectError.message?.includes('does not exist')) {
        console.warn('Residential comparison history table not found. Comparison not saved. Please run the database setup script.');
        return false;
      }
      // Ignore "No rows found" error (PGRST116) as it's expected when no existing record
      if (selectError.code !== 'PGRST116') {
        console.error('Error checking existing residential comparison:', selectError.message || selectError);
        return false;
      }
    }

    if (existing) {
      // Update existing record's timestamp
      const { error: updateError } = await supabase
        .from('residential_comparison_history')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating residential comparison history:', updateError.message || updateError);
        return false;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('residential_comparison_history')
        .insert({
          user_id: userId,
          comparison_name: comparisonName,
          facility_names: facilityNames,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving residential comparison to history:', insertError.message || insertError);
        return false;
      }

      // Auto-cleanup old records (keep only 10 most recent)
      await cleanupOldRecords('residential_comparison_history', userId, 10);
    }

    console.log('Residential comparison saved to history:', comparisonName);
    return true;
  } catch (error) {
    console.error('Error saving residential comparison to history:', error);
    return false;
  }
}

// Get residential comparison history for a user
export async function getResidentialComparisonHistory(
  userId: string, 
  limit: number = 10
): Promise<ResidentialComparisonHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('residential_comparison_history')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message?.includes('relation "public.residential_comparison_history" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('Residential comparison history table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching residential comparison history:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching residential comparison history:', error);
    return [];
  }
}

// Delete individual residential comparison history item
export async function deleteResidentialComparisonHistoryItem(
  userId: string, 
  itemId: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_comparison_history')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId); // Ensure user can only delete their own items

    if (error) {
      console.error('Error deleting residential comparison history item:', error.message || error);
      return false;
    }

    console.log('Residential comparison history item deleted:', itemId);
    return true;
  } catch (error) {
    console.error('Error deleting residential comparison history item:', error);
    return false;
  }
}

// Clear all residential comparison history for a user
export async function clearResidentialComparisonHistory(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_comparison_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing residential comparison history:', error.message || error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing residential comparison history:', error);
    return false;
  }
}

// RESIDENTIAL COMPARISON SELECTIONS FUNCTIONS (NEW - for persistent ticked facilities)

// Add facility to comparison selections (when user ticks checkbox)
export async function addResidentialComparisonSelection(
  userId: string,
  facilityId: string,
  facilityName: string,
  facilityData: any
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Check if this facility is already selected (avoid duplicates)
    const { data: existing, error: selectError } = await supabase
      .from('residential_comparison_selections')
      .select('id')
      .eq('user_id', userId)
      .eq('facility_id', facilityId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      if (selectError.message?.includes('relation "public.residential_comparison_selections" does not exist') || 
          selectError.message?.includes('does not exist')) {
        console.warn('Residential comparison selections table not found. Please run the database setup script.');
        return false;
      }
      if (selectError.code !== 'PGRST116') {
        console.error('Error checking existing residential selection:', selectError.message || selectError);
        return false;
      }
    }

    if (existing) {
      console.log('Facility already selected for comparison:', facilityName);
      return true; // Already selected, no need to add again
    }

    // Add new selection
    const { error: insertError } = await supabase
      .from('residential_comparison_selections')
      .insert({
        user_id: userId,
        facility_id: facilityId,
        facility_name: facilityName,
        facility_data: facilityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error adding residential comparison selection:', insertError.message || insertError);
      return false;
    }

    console.log('Added facility to comparison selections:', facilityName);
    return true;
  } catch (error) {
    console.error('Error adding residential comparison selection:', error);
    return false;
  }
}

// Remove facility from comparison selections (when user unticks checkbox)
export async function removeResidentialComparisonSelection(
  userId: string,
  facilityId: string
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_comparison_selections')
      .delete()
      .eq('user_id', userId)
      .eq('facility_id', facilityId);

    if (error) {
      console.error('Error removing residential comparison selection:', error.message || error);
      return false;
    }

    console.log('Removed facility from comparison selections:', facilityId);
    return true;
  } catch (error) {
    console.error('Error removing residential comparison selection:', error);
    return false;
  }
}

// Get all comparison selections for a user
export async function getResidentialComparisonSelections(
  userId: string
): Promise<ResidentialComparisonSelection[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('residential_comparison_selections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }); // Oldest first to maintain selection order

    if (error) {
      if (error.message?.includes('relation "public.residential_comparison_selections" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('Residential comparison selections table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching residential comparison selections:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching residential comparison selections:', error);
    return [];
  }
}

// Clear all comparison selections for a user
export async function clearResidentialComparisonSelections(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('residential_comparison_selections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing residential comparison selections:', error.message || error);
      return false;
    }

    console.log('Cleared all residential comparison selections');
    return true;
  } catch (error) {
    console.error('Error clearing residential comparison selections:', error);
    return false;
  }
}

// Check if a facility is currently selected for comparison
export async function isResidentialFacilitySelected(
  userId: string,
  facilityId: string
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('residential_comparison_selections')
      .select('id')
      .eq('user_id', userId)
      .eq('facility_id', facilityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // No rows found means not selected
      }
      console.error('Error checking residential facility selection:', error.message || error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking residential facility selection:', error);
    return false;
  }
} 