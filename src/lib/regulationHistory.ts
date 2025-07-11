import { createBrowserSupabaseClient } from './supabase';

// Interfaces for regulation history data
export interface RegulationSearchHistoryItem {
  id?: number;
  user_id: string;
  search_term: string;
  response_preview?: string;
  citations_count?: number;
  document_types?: string[];
  processing_time?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RegulationBookmark {
  id?: number;
  user_id: string;
  bookmark_name: string;
  search_term: string;
  description?: string;
  response_preview?: string;
  citations_count?: number;
  document_types?: string[];
  usage_count?: number;
  last_used_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Response types
export interface RegulationSearchHistoryResponse {
  searches: RegulationSearchHistoryItem[];
  count: number;
}

export interface RegulationBookmarksResponse {
  bookmarks: RegulationBookmark[];
  count: number;
}

// HELPER: Auto-cleanup function to maintain records within 2 weeks
async function cleanupOldSearchHistory(userId: string): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Delete records older than 2 weeks
    const { error } = await supabase
      .from('regulation_search_history')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error cleaning up old regulation search history:', error);
    } else {
      console.log('Cleaned up old regulation search history for user:', userId);
    }
  } catch (error) {
    console.error('Error cleaning up old regulation search history:', error);
  }
}

// REGULATION SEARCH HISTORY FUNCTIONS

// Save search term to regulation search history with metadata
export async function saveRegulationSearchToHistory(
  userId: string, 
  searchTerm: string,
  responsePreview?: string,
  citationsCount?: number,
  documentTypes?: string[],
  processingTime?: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Check if this search already exists for this user (to avoid duplicates)
    const { data: existing, error: selectError } = await supabase
      .from('regulation_search_history')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // Handle case where table doesn't exist yet
      if (selectError.message?.includes('relation "public.regulation_search_history" does not exist') || 
          selectError.message?.includes('does not exist')) {
        console.warn('Regulation search history table not found. Search not saved. Please run the database setup script.');
        return false;
      }
      // Ignore "No rows found" error (PGRST116) as it's expected when no existing record
      if (selectError.code !== 'PGRST116') {
        console.error('Error checking existing regulation search:', selectError.message || selectError);
        return false;
      }
    }

    if (existing) {
      // Update existing record with new metadata
      const { error: updateError } = await supabase
        .from('regulation_search_history')
        .update({ 
          updated_at: new Date().toISOString(),
          response_preview: responsePreview,
          citations_count: citationsCount,
          document_types: documentTypes,
          processing_time: processingTime
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating regulation search history:', updateError.message || updateError);
        return false;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('regulation_search_history')
        .insert({
          user_id: userId,
          search_term: searchTerm,
          response_preview: responsePreview,
          citations_count: citationsCount,
          document_types: documentTypes,
          processing_time: processingTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving regulation search to history:', insertError.message || insertError);
        return false;
      }

      // Auto-cleanup old records (keep only past 2 weeks)
      await cleanupOldSearchHistory(userId);
    }

    console.log('Regulation search saved to history:', searchTerm);
    return true;
  } catch (error) {
    console.error('Error saving regulation search to history:', error);
    return false;
  }
}

// Get regulation search history for a user (past 2 weeks)
export async function getRegulationSearchHistory(
  userId: string, 
  limit: number = 20
): Promise<RegulationSearchHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Get searches from past 2 weeks
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('regulation_search_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twoWeeksAgo)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message?.includes('relation "public.regulation_search_history" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('Regulation search history table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching regulation search history:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching regulation search history:', error);
    return [];
  }
}

// Delete individual regulation search history item
export async function deleteRegulationSearchHistoryItem(
  userId: string, 
  itemId: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('regulation_search_history')
      .delete()
      .eq('user_id', userId)
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting regulation search history item:', error.message || error);
      return false;
    }

    console.log('Regulation search history item deleted:', itemId);
    return true;
  } catch (error) {
    console.error('Error deleting regulation search history item:', error);
    return false;
  }
}

// Clear all regulation search history for a user
export async function clearRegulationSearchHistory(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('regulation_search_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing regulation search history:', error.message || error);
      return false;
    }

    console.log('Regulation search history cleared for user:', userId);
    return true;
  } catch (error) {
    console.error('Error clearing regulation search history:', error);
    return false;
  }
}

// REGULATION BOOKMARKS FUNCTIONS

// Save regulation search as bookmark
export async function saveRegulationBookmark(
  userId: string,
  bookmarkName: string,
  searchTerm: string,
  description?: string,
  responsePreview?: string,
  citationsCount?: number,
  documentTypes?: string[]
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Create new bookmark
    const { error: insertError } = await supabase
      .from('regulation_bookmarks')
      .insert({
        user_id: userId,
        bookmark_name: bookmarkName,
        search_term: searchTerm,
        description: description,
        response_preview: responsePreview,
        citations_count: citationsCount,
        document_types: documentTypes,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error saving regulation bookmark:', insertError.message || insertError);
      return false;
    }

    console.log('Regulation bookmark saved:', bookmarkName);
    return true;
  } catch (error) {
    console.error('Error saving regulation bookmark:', error);
    return false;
  }
}

// Get regulation bookmarks for a user
export async function getRegulationBookmarks(
  userId: string, 
  limit: number = 20
): Promise<RegulationBookmark[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('regulation_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message?.includes('relation "public.regulation_bookmarks" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('Regulation bookmarks table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching regulation bookmarks:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching regulation bookmarks:', error);
    return [];
  }
}

// Update regulation bookmark
export async function updateRegulationBookmark(
  userId: string,
  bookmarkId: number,
  bookmarkName?: string,
  searchTerm?: string,
  description?: string
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (bookmarkName !== undefined) updateData.bookmark_name = bookmarkName;
    if (searchTerm !== undefined) updateData.search_term = searchTerm;
    if (description !== undefined) updateData.description = description;
    
    const { error } = await supabase
      .from('regulation_bookmarks')
      .update(updateData)
      .eq('user_id', userId)
      .eq('id', bookmarkId);

    if (error) {
      console.error('Error updating regulation bookmark:', error.message || error);
      return false;
    }

    console.log('Regulation bookmark updated:', bookmarkId);
    return true;
  } catch (error) {
    console.error('Error updating regulation bookmark:', error);
    return false;
  }
}

// Delete regulation bookmark
export async function deleteRegulationBookmark(
  userId: string, 
  bookmarkId: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('regulation_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('id', bookmarkId);

    if (error) {
      console.error('Error deleting regulation bookmark:', error.message || error);
      return false;
    }

    console.log('Regulation bookmark deleted:', bookmarkId);
    return true;
  } catch (error) {
    console.error('Error deleting regulation bookmark:', error);
    return false;
  }
}

// Clear all regulation bookmarks for a user
export async function clearRegulationBookmarks(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('regulation_bookmarks')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing regulation bookmarks:', error.message || error);
      return false;
    }

    console.log('Regulation bookmarks cleared for user:', userId);
    return true;
  } catch (error) {
    console.error('Error clearing regulation bookmarks:', error);
    return false;
  }
}

// Update bookmark usage when clicked
export async function updateRegulationBookmarkUsage(
  userId: string, 
  bookmarkId: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase.rpc('update_regulation_bookmark_usage', {
      bookmark_id: bookmarkId,
      user_id_param: userId
    });

    if (error) {
      console.error('Error updating regulation bookmark usage:', error.message || error);
      return false;
    }

    console.log('Regulation bookmark usage updated:', bookmarkId);
    return true;
  } catch (error) {
    console.error('Error updating regulation bookmark usage:', error);
    return false;
  }
}

// Get popular regulation bookmarks
export async function getPopularRegulationBookmarks(
  userId: string, 
  limit: number = 5
): Promise<RegulationBookmark[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase.rpc('get_popular_regulation_bookmarks', {
      user_id_param: userId,
      limit_param: limit
    });

    if (error) {
      console.error('Error fetching popular regulation bookmarks:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching popular regulation bookmarks:', error);
    return [];
  }
}

// Check if bookmark name already exists for user
export async function isRegulationBookmarkNameTaken(
  userId: string, 
  bookmarkName: string,
  excludeId?: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    let query = supabase
      .from('regulation_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('bookmark_name', bookmarkName);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking bookmark name:', error.message || error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking bookmark name:', error);
    return false;
  }
}

// Get regulation bookmark count for a user
export async function getRegulationBookmarkCount(userId: string): Promise<number> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { count, error } = await supabase
      .from('regulation_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting regulation bookmark count:', error.message || error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting regulation bookmark count:', error);
    return 0;
  }
} 