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

// New unified interfaces that support both old and new systems
export interface UnifiedHistoryItem extends RegulationSearchHistoryItem {
  source_type: 'search_history' | 'conversation_message';
  conversation_id?: number;
  message_id?: number;
  conversation_title?: string;
  is_bookmarked?: boolean;
}

export interface UnifiedBookmark extends RegulationBookmark {
  source_type: 'bookmark' | 'conversation_message' | 'conversation';
  conversation_id?: number;
  message_id?: number;
  conversation_title?: string;
  message_content?: string;
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

// New unified response types
export interface UnifiedHistoryResponse {
  items: UnifiedHistoryItem[];
  count: number;
}

export interface UnifiedBookmarksResponse {
  bookmarks: UnifiedBookmark[];
  count: number;
}

// =============================================================================
// UNIFIED HISTORY SYSTEM - BRIDGES OLD AND NEW DATA SOURCES
// =============================================================================

/**
 * Get unified search history combining old search history and conversation messages
 */
export async function getUnifiedSearchHistory(
  userId: string, 
  limit: number = 20
): Promise<UnifiedHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Get old search history (past 2 weeks)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    const oldHistoryPromise = supabase
      .from('regulation_search_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twoWeeksAgo)
      .order('updated_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    // Get conversation messages (user messages only, past 2 weeks)
    const conversationHistoryPromise = supabase
      .from('regulation_messages')
      .select(`
        id,
        conversation_id,
        content,
        message_index,
        created_at,
        search_intent,
        is_bookmarked,
        regulation_conversations!inner(
          title
        )
      `)
      .eq('regulation_conversations.user_id', userId)
      .eq('role', 'user')
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    const [oldHistoryResult, conversationResult] = await Promise.all([
      oldHistoryPromise,
      conversationHistoryPromise
    ]);

    if (oldHistoryResult.error) console.error('Error fetching old history:', oldHistoryResult.error);
    if (conversationResult.error) console.error('Error fetching conversations:', conversationResult.error);

    const unifiedItems: UnifiedHistoryItem[] = [];

    // Add old search history items
    if (oldHistoryResult.data) {
      for (const item of oldHistoryResult.data) {
        unifiedItems.push({
          ...item,
          source_type: 'search_history'
        });
      }
    }

    // Add conversation messages as history items
    if (conversationResult.data) {
      for (const msg of conversationResult.data) {
        const conversationData = msg.regulation_conversations as any;
        unifiedItems.push({
          id: msg.id,
          user_id: userId,
          search_term: msg.content,
          response_preview: msg.search_intent || undefined,
          citations_count: undefined,
          document_types: undefined,
          processing_time: undefined,
          created_at: msg.created_at,
          updated_at: msg.created_at,
          source_type: 'conversation_message',
          conversation_id: msg.conversation_id,
          message_id: msg.id,
          conversation_title: conversationData?.title || 'Untitled Conversation',
          is_bookmarked: msg.is_bookmarked
        });
      }
    }

    // Sort by created_at descending and limit
    unifiedItems.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return unifiedItems.slice(0, limit);
  } catch (error) {
    console.error('Error fetching unified search history:', error);
    return [];
  }
}

/**
 * Get unified bookmarks combining old bookmarks and bookmarked conversations/messages
 */
export async function getUnifiedBookmarks(
  userId: string, 
  limit: number = 20
): Promise<UnifiedBookmark[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Get old bookmarks
    const oldBookmarksPromise = supabase
      .from('regulation_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    // Get bookmarked conversations and messages
    const unifiedBookmarksPromise = supabase.rpc('get_unified_bookmarks', {
      user_id_param: userId
    });

    const [oldBookmarksResult, unifiedResult] = await Promise.all([
      oldBookmarksPromise,
      unifiedBookmarksPromise
    ]);

    const unifiedBookmarks: UnifiedBookmark[] = [];

    // Add old bookmarks
    if (oldBookmarksResult.data) {
      for (const bookmark of oldBookmarksResult.data) {
        unifiedBookmarks.push({
          ...bookmark,
          source_type: 'bookmark'
        });
      }
    }

    // Add conversation bookmarks
    if (unifiedResult.data) {
      for (const item of unifiedResult.data) {
        if (item.item_type === 'conversation') {
          unifiedBookmarks.push({
            id: item.item_id,
            user_id: userId,
            bookmark_name: item.conversation_title,
            search_term: item.context_info?.first_message_preview || '',
            description: `Conversation with ${item.context_info?.message_count || 0} messages`,
            response_preview: undefined,
            citations_count: item.context_info?.total_citations || 0,
            document_types: undefined,
            usage_count: 0,
            last_used_at: undefined,
            created_at: item.bookmark_date,
            updated_at: item.bookmark_date,
            source_type: 'conversation',
            conversation_id: item.conversation_id,
            conversation_title: item.conversation_title
          });
        } else if (item.item_type === 'message') {
          unifiedBookmarks.push({
            id: item.item_id,
            user_id: userId,
            bookmark_name: `Message: ${item.content?.slice(0, 50)}...`,
            search_term: item.content || '',
            description: `From conversation: ${item.conversation_title}`,
            response_preview: undefined,
            citations_count: item.context_info?.citations_count || 0,
            document_types: undefined,
            usage_count: 0,
            last_used_at: undefined,
            created_at: item.bookmark_date,
            updated_at: item.bookmark_date,
            source_type: 'conversation_message',
            conversation_id: item.conversation_id,
            message_id: item.item_id,
            conversation_title: item.conversation_title,
            message_content: item.content
          });
        }
      }
    }

    // Sort by created_at descending and limit
    unifiedBookmarks.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return unifiedBookmarks.slice(0, limit);
  } catch (error) {
    console.error('Error fetching unified bookmarks:', error);
    return [];
  }
}

/**
 * Delete unified history item (works with both old and new sources)
 */
export async function deleteUnifiedHistoryItem(
  userId: string, 
  item: UnifiedHistoryItem
): Promise<boolean> {
  try {
    if (item.source_type === 'search_history') {
      return await deleteRegulationSearchHistoryItem(userId, item.id!);
    } else if (item.source_type === 'conversation_message') {
      // Call the new message management API using GET with query parameters
      const response = await fetch(`/api/regulation/chat?action=delete-message&message_id=${item.message_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('Error deleting unified history item:', error);
    return false;
  }
}

/**
 * Delete unified bookmark (works with both old and new sources)
 */
export async function deleteUnifiedBookmark(
  userId: string, 
  bookmark: UnifiedBookmark
): Promise<boolean> {
  try {
    if (bookmark.source_type === 'bookmark') {
      return await deleteRegulationBookmark(userId, bookmark.id!);
    } else if (bookmark.source_type === 'conversation') {
      // Remove bookmark from conversation using GET with query parameters
      const response = await fetch(`/api/regulation/chat?action=bookmark-conversation&conversation_id=${bookmark.conversation_id}&bookmarked=false`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result.success;
    } else if (bookmark.source_type === 'conversation_message') {
      // Remove bookmark from message using GET with query parameters
      const response = await fetch(`/api/regulation/chat?action=bookmark-message&message_id=${bookmark.message_id}&bookmarked=false`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('Error deleting unified bookmark:', error);
    return false;
  }
}

/**
 * Clear all unified history (both old and new sources)
 */
export async function clearUnifiedSearchHistory(userId: string): Promise<boolean> {
  try {
    console.log('🧹 Clearing unified search history for user:', userId);
    
    // Clear old search history
    const oldHistoryCleared = await clearRegulationSearchHistory(userId);
    console.log('📋 Old search history cleared:', oldHistoryCleared);

    // Clear conversation messages (delete all conversations for this user)
    // Since conversations appear in "Recent Searches", users expect them to be cleared too
    const supabase = createBrowserSupabaseClient();
    
    const { error: conversationError } = await supabase
      .from('regulation_conversations')
      .delete()
      .eq('user_id', userId);

    const conversationsCleared = !conversationError;
    console.log('💬 Conversations cleared:', conversationsCleared);
    
    if (conversationError) {
      console.error('Error clearing conversations:', conversationError);
    }
    
    const allCleared = oldHistoryCleared && conversationsCleared;
    console.log('🎯 All unified history cleared:', allCleared);
    
    return allCleared;
  } catch (error) {
    console.error('Error clearing unified search history:', error);
    return false;
  }
}

/**
 * Clear all unified bookmarks (both old and new sources)
 */
export async function clearUnifiedBookmarks(userId: string): Promise<boolean> {
  try {
    // Clear old bookmarks
    const oldBookmarksCleared = await clearRegulationBookmarks(userId);

    // Clear conversation bookmarks by setting all bookmarks to false
    const supabase = createBrowserSupabaseClient();
    
    const conversationsCleared = await supabase
      .from('regulation_conversations')
      .update({ is_bookmarked: false })
      .eq('user_id', userId);

    // Get all conversation IDs for this user first
    const { data: userConversations } = await supabase
      .from('regulation_conversations')
      .select('id')
      .eq('user_id', userId);

    const conversationIds = userConversations?.map(c => c.id) || [];
    
    const messagesCleared = conversationIds.length > 0 
      ? await supabase
          .from('regulation_messages')
          .update({ is_bookmarked: false })
          .in('conversation_id', conversationIds)
      : { error: null };

    return oldBookmarksCleared && !conversationsCleared.error && !messagesCleared.error;
  } catch (error) {
    console.error('Error clearing unified bookmarks:', error);
    return false;
  }
}

// =============================================================================
// ADAPTER FUNCTIONS - CONVERT UNIFIED DATA TO OLD FORMAT
// =============================================================================

/**
 * Convert unified history items to old format for backward compatibility
 */
export function adaptUnifiedHistoryToOld(items: UnifiedHistoryItem[]): RegulationSearchHistoryItem[] {
  return items.map(item => ({
    id: item.id,
    user_id: item.user_id,
    search_term: item.search_term,
    response_preview: item.response_preview,
    citations_count: item.citations_count,
    document_types: item.document_types,
    processing_time: item.processing_time,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
}

/**
 * Convert unified bookmarks to old format for backward compatibility
 */
export function adaptUnifiedBookmarksToOld(bookmarks: UnifiedBookmark[]): RegulationBookmark[] {
  return bookmarks.map(bookmark => ({
    id: bookmark.id,
    user_id: bookmark.user_id,
    bookmark_name: bookmark.bookmark_name,
    search_term: bookmark.search_term,
    description: bookmark.description,
    response_preview: bookmark.response_preview,
    citations_count: bookmark.citations_count,
    document_types: bookmark.document_types,
    usage_count: bookmark.usage_count,
    last_used_at: bookmark.last_used_at,
    created_at: bookmark.created_at,
    updated_at: bookmark.updated_at
  }));
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
  processingTime?: number,
  conversationId?: number
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
          processing_time: processingTime,
          conversation_id: conversationId
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
          conversation_id: conversationId,
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
    
    // Create new bookmark or update existing one (upsert)
    const { error: insertError } = await supabase
      .from('regulation_bookmarks')
      .upsert({
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
      }, {
        onConflict: 'user_id,bookmark_name'
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