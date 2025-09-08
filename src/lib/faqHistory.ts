import { createBrowserSupabaseClient } from './supabase';

export interface FAQSearchHistoryItem {
  id: number;
  user_id: string;
  search_term: string;
  response_preview: string;
  citation_count: number;
  document_types: string[];
  processing_time: number;
  created_at: string;
  conversation_id?: number;
}

export interface FAQBookmark {
  id: number;
  user_id: string;
  bookmark_name: string;
  search_term: string;
  description?: string;
  response_preview: string;
  citation_count: number;
  document_types: string[];
  created_at: string;
  last_used: string;
  use_count: number;
  conversation_id?: number;
}

// New unified interfaces that support both old and new systems (matching regulation pattern)
export interface UnifiedFAQHistoryItem extends FAQSearchHistoryItem {
  source_type: 'search_history' | 'conversation_message';
  conversation_id?: number;
  message_id?: number;
  conversation_title?: string;
  is_bookmarked?: boolean;
}

export interface UnifiedFAQBookmark extends FAQBookmark {
  source_type: 'bookmark' | 'conversation_message' | 'conversation';
  conversation_id?: number;
  message_id?: number;
  conversation_title?: string;
  message_content?: string;
}

// Response types
export interface FAQSearchHistoryResponse {
  searches: FAQSearchHistoryItem[];
  count: number;
}

export interface FAQBookmarksResponse {
  bookmarks: FAQBookmark[];
  count: number;
}

// New unified response types
export interface UnifiedFAQHistoryResponse {
  items: UnifiedFAQHistoryItem[];
  count: number;
}

export interface UnifiedFAQBookmarksResponse {
  bookmarks: UnifiedFAQBookmark[];
  count: number;
}

// FAQ Search History Functions
export async function saveFAQSearchToHistory(
  userId: string,
  searchTerm: string,
  responsePreview: string,
  citationCount: number,
  documentTypes: string[],
  processingTime: number,
  conversationId?: number
): Promise<boolean> {
  try {
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-search-history',
        user_id: userId,
        search_term: searchTerm,
        response_preview: responsePreview,
        citation_count: citationCount,
        document_types: documentTypes,
        processing_time: processingTime,
        conversation_id: conversationId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error saving FAQ search history:', error);
    return false;
  }
}

export async function getFAQSearchHistory(userId: string): Promise<FAQSearchHistoryItem[]> {
  try {
    const response = await fetch(`/api/faq/chat?action=get_search_history&user_id=${userId}`);
    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting FAQ search history:', error);
    return [];
  }
}

export async function deleteFAQSearchHistoryItem(userId: string, itemId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-search-history-item',
        user_id: userId,
        item_id: itemId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error deleting FAQ search history item:', error);
    return false;
  }
}

export async function clearFAQSearchHistory(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear-search-history',
        user_id: userId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error clearing FAQ search history:', error);
    return false;
  }
}

// FAQ Bookmark Functions
export async function saveFAQBookmark(
  userId: string,
  bookmarkName: string,
  searchTerm: string,
  description?: string,
  responsePreview?: string,
  citationCount?: number,
  documentTypes?: string[],
  conversationId?: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();

    // Validate conversation existence before saving to prevent FK errors
    let safeConversationId: number | undefined = undefined;
    if (conversationId) {
      const { data: conv } = await supabase
        .from('faq_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      safeConversationId = conv?.id ?? undefined;
      
      if (conversationId && !safeConversationId) {
        console.warn(`FAQ Bookmark: Conversation ${conversationId} not found or not owned by user, saving without conversation link`);
      }
    }
    
    // Create new bookmark or update existing one (upsert) - matching regulation pattern
    const { error: insertError } = await supabase
      .from('faq_search_bookmarks')
      .upsert({
        user_id: userId,
        bookmark_name: bookmarkName.trim(),
        search_term: searchTerm,
        description: description,
        response_preview: responsePreview,
        citation_count: citationCount ?? 0,
        document_types: documentTypes ?? [],
        conversation_id: safeConversationId ?? null,
        use_count: 0,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      }, {
        onConflict: 'user_id,bookmark_name'
      });

    if (insertError) {
      console.error('Error saving FAQ bookmark:', insertError.message || insertError);
      return false;
    }

    console.log('FAQ bookmark saved:', bookmarkName);
    return true;
  } catch (error) {
    console.error('Error saving FAQ bookmark:', error);
    return false;
  }
}

export async function getFAQBookmarks(userId: string): Promise<FAQBookmark[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('faq_search_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (error.message?.includes('relation "public.faq_search_bookmarks" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('FAQ search bookmarks table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching FAQ bookmarks:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching FAQ bookmarks:', error);
    return [];
  }
}

export async function deleteFAQBookmark(userId: string, bookmarkId: number): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('faq_search_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('id', bookmarkId);

    if (error) {
      console.error('Error deleting FAQ bookmark:', error.message || error);
      return false;
    }

    console.log('FAQ bookmark deleted:', bookmarkId);
    return true;
  } catch (error) {
    console.error('Error deleting FAQ bookmark:', error);
    return false;
  }
}

export async function clearFAQBookmarks(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('faq_search_bookmarks')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing FAQ bookmarks:', error.message || error);
      return false;
    }

    console.log('FAQ bookmarks cleared for user:', userId);
    return true;
  } catch (error) {
    console.error('Error clearing FAQ bookmarks:', error);
    return false;
  }
}

export async function isFAQBookmarkNameTaken(
  userId: string,
  bookmarkName: string,
  excludeId?: number
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    let q = supabase
      .from('faq_search_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('bookmark_name', bookmarkName.trim());

    if (excludeId) q = q.neq('id', excludeId);

    const { data, error } = await q.maybeSingle();
    if (error) {
      console.error('Error checking FAQ bookmark name:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('Error checking FAQ bookmark name:', e);
    return false;
  }
}

export async function getFAQBookmarkCount(userId: string): Promise<number> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { count, error } = await supabase
      .from('faq_search_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting FAQ bookmark count:', error.message || error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting FAQ bookmark count:', error);
    return 0;
  }
}

export async function updateFAQBookmarkUsage(userId: string, bookmarkId: number): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Use the database function for atomic increment (like regulation)
    const { error } = await supabase.rpc('update_faq_search_bookmark_usage', {
      bookmark_id: bookmarkId,
      user_id_param: userId
    });

    if (error) {
      console.error('Error updating FAQ bookmark usage:', error.message || error);
      return false;
    }

    console.log('FAQ bookmark usage updated:', bookmarkId);
    return true;
  } catch (error) {
    console.error('Error updating FAQ bookmark usage:', error);
    return false;
  }
}

// =============================================================================
// UNIFIED SYSTEM FUNCTIONS (matching regulation pattern)
// =============================================================================

/**
 * Get unified search history combining old search history and conversation messages
 */
export async function getUnifiedFAQHistory(
  userId: string, 
  limit: number = 20
): Promise<UnifiedFAQHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Get old search history (past 2 weeks)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    const oldHistoryPromise = supabase
      .from('faq_search_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    // Get conversation messages (user messages only, past 2 weeks)
    const conversationHistoryPromise = supabase
      .from('faq_messages')
      .select(`
        id,
        conversation_id,
        content,
        message_index,
        created_at,
        search_intent,
        is_bookmarked,
        faq_conversations!inner(
          title
        )
      `)
      .eq('faq_conversations.user_id', userId)
      .eq('role', 'user')
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    const [oldHistoryResult, conversationResult] = await Promise.all([
      oldHistoryPromise,
      conversationHistoryPromise
    ]);

    if (oldHistoryResult.error) console.error('Error fetching FAQ old history:', oldHistoryResult.error);
    if (conversationResult.error) console.error('Error fetching FAQ conversations:', conversationResult.error);

    const unifiedItems: UnifiedFAQHistoryItem[] = [];

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
        const conversationData = msg.faq_conversations as any;
        unifiedItems.push({
          id: msg.id,
          user_id: userId,
          search_term: msg.content,
          response_preview: msg.search_intent || '',
          citation_count: 0,
          document_types: [],
          processing_time: 0,
          created_at: msg.created_at,
          conversation_id: msg.conversation_id,
          source_type: 'conversation_message',
          message_id: msg.id,
          conversation_title: conversationData?.title || 'Untitled Conversation',
          is_bookmarked: msg.is_bookmarked
        });
      }
    }

    // Deduplicate based on conversation_id (prefer search_history over conversation_message)
    const deduplicatedItems: UnifiedFAQHistoryItem[] = [];
    const seenConversationIds = new Set<number>();
    const itemsWithoutConversation: UnifiedFAQHistoryItem[] = [];

    // First pass: collect items with conversation_id, preferring search_history
    for (const item of unifiedItems) {
      if (item.conversation_id) {
        if (!seenConversationIds.has(item.conversation_id)) {
          seenConversationIds.add(item.conversation_id);
          // Prefer search_history source over conversation_message
          if (item.source_type === 'search_history') {
            deduplicatedItems.push(item);
          } else {
            // Check if we already have a search_history for this conversation
            const existingIndex = deduplicatedItems.findIndex(
              existing => existing.conversation_id === item.conversation_id && existing.source_type === 'search_history'
            );
            if (existingIndex === -1) {
              deduplicatedItems.push(item);
            }
          }
        }
      } else {
        // Items without conversation_id (legacy items)
        itemsWithoutConversation.push(item);
      }
    }

    // Add items without conversation_id
    deduplicatedItems.push(...itemsWithoutConversation);

    // Sort by created_at descending and limit
    deduplicatedItems.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    console.log(`🔧 FAQ DEDUPLICATION: ${unifiedItems.length} → ${deduplicatedItems.length} items (removed ${unifiedItems.length - deduplicatedItems.length} duplicates)`);

    return deduplicatedItems.slice(0, limit);
  } catch (error) {
    console.error('Error fetching unified FAQ search history:', error);
    return [];
  }
}

/**
 * Get unified bookmarks combining old bookmarks and bookmarked conversations/messages
 */
export async function getUnifiedFAQBookmarks(
  userId: string, 
  limit: number = 20
): Promise<UnifiedFAQBookmark[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Get search bookmarks (using new table structure)
    const searchBookmarksPromise = supabase
      .from('faq_search_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    // Get bookmarked conversations
    const conversationsPromise = supabase
      .from('faq_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_bookmarked', true)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 4));

    // Get bookmarked messages
    const messagesPromise = supabase
      .from('faq_messages')
      .select(`
        *,
        faq_conversations(title)
      `)
      .eq('is_bookmarked', true)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 4));

    const [searchBookmarksResult, conversationsResult, messagesResult] = await Promise.all([
      searchBookmarksPromise,
      conversationsPromise,
      messagesPromise
    ]);

    if (searchBookmarksResult.error) console.error('Error fetching FAQ search bookmarks:', searchBookmarksResult.error);
    if (conversationsResult.error) console.error('Error fetching FAQ conversation bookmarks:', conversationsResult.error);
    if (messagesResult.error) console.error('Error fetching FAQ message bookmarks:', messagesResult.error);

    const unifiedBookmarks: UnifiedFAQBookmark[] = [];

    // Add search bookmarks (from new table structure)
    if (searchBookmarksResult.data) {
      for (const bookmark of searchBookmarksResult.data) {
        unifiedBookmarks.push({
          ...bookmark,
          source_type: 'bookmark'
        });
      }
    }

    // Add bookmarked conversations
    if (conversationsResult.data) {
      for (const conv of conversationsResult.data) {
        unifiedBookmarks.push({
          id: conv.id,
          user_id: userId,
          bookmark_name: conv.title || 'Untitled Conversation',
          search_term: conv.first_message_preview || '',
          description: conv.summary || undefined,
          response_preview: conv.last_message_preview || '',
          citation_count: conv.total_citations || 0,
          document_types: conv.guide_types || [],
          created_at: conv.created_at,
          last_used: conv.updated_at,
          use_count: 0,
          conversation_id: conv.id,
          source_type: 'conversation',
          conversation_title: conv.title || 'Untitled Conversation'
        });
      }
    }

    // Add bookmarked messages
    if (messagesResult.data) {
      for (const msg of messagesResult.data) {
        const conversationData = msg.faq_conversations as any;
        unifiedBookmarks.push({
          id: msg.id,
          user_id: userId,
          bookmark_name: `Message from ${conversationData?.title || 'Conversation'}`,
          search_term: msg.content,
          description: undefined,
          response_preview: msg.content.substring(0, 150),
          citation_count: msg.citations?.length || 0,
          document_types: [],
          created_at: msg.created_at,
          last_used: msg.updated_at,
          use_count: 0,
          conversation_id: msg.conversation_id,
          source_type: 'conversation_message',
          message_id: msg.id,
          conversation_title: conversationData?.title || 'Untitled Conversation',
          message_content: msg.content
        });
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
    console.error('Error fetching unified FAQ bookmarks:', error);
    return [];
  }
}

/**
 * Delete a unified history item based on its source type
 */
export async function deleteUnifiedFAQHistoryItem(
  userId: string,
  item: UnifiedFAQHistoryItem
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    if (item.source_type === 'search_history') {
      const { error } = await supabase
        .from('faq_search_history')
        .delete()
        .eq('id', item.id)
        .eq('user_id', userId);
      
      return !error;
    } else if (item.source_type === 'conversation_message') {
      // For conversation messages, we delete the entire conversation
      const { error } = await supabase
        .from('faq_conversations')
        .delete()
        .eq('id', item.conversation_id!)
        .eq('user_id', userId);
      
      return !error;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting unified FAQ history item:', error);
    return false;
  }
}

/**
 * Delete a unified bookmark based on its source type
 */
export async function deleteUnifiedFAQBookmark(
  userId: string,
  item: UnifiedFAQBookmark
): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    if (item.source_type === 'bookmark') {
      // Delete search result bookmarks from faq_search_bookmarks table
      const { error } = await supabase
        .from('faq_search_bookmarks')
        .delete()
        .eq('id', item.id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting FAQ search bookmark:', error);
        return false;
      }
      
      console.log('FAQ search bookmark deleted successfully:', item.id);
      return true;
    } else if (item.source_type === 'conversation') {
      // Unbookmark the conversation
      const { error } = await supabase
        .from('faq_conversations')
        .update({ is_bookmarked: false })
        .eq('id', item.conversation_id!)
        .eq('user_id', userId);
      
      return !error;
    } else if (item.source_type === 'conversation_message') {
      // Unbookmark the message
      const { error } = await supabase
        .from('faq_messages')
        .update({ is_bookmarked: false })
        .eq('id', item.message_id!);
      
      return !error;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting unified FAQ bookmark:', error);
    return false;
  }
}

/**
 * Clear all unified search history (both search history and conversations)
 */
export async function clearUnifiedFAQHistory(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const promises = [
      // Clear old search history
      supabase
        .from('faq_search_history')
        .delete()
        .eq('user_id', userId),
      
      // Clear conversations (which will cascade to messages)
      supabase
        .from('faq_conversations')
        .delete()
        .eq('user_id', userId)
    ];
    
    const results = await Promise.all(promises);
    
    // Check if any operation failed
    for (const result of results) {
      if (result.error) {
        console.error('Error clearing unified FAQ history:', result.error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing unified FAQ history:', error);
    return false;
  }
}

/**
 * Clear all unified bookmarks (bookmarks, bookmarked conversations, and bookmarked messages)
 */
export async function clearUnifiedFAQBookmarks(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // First get conversation IDs for this user
    const { data: conversationIds } = await supabase
      .from('faq_conversations')
      .select('id')
      .eq('user_id', userId);
    
    const conversationIdList = conversationIds?.map(c => c.id) || [];
    
    const promises = [
      // Clear old bookmarks
      supabase
        .from('faq_bookmarks')
        .delete()
        .eq('user_id', userId),
      
      // Unbookmark conversations
      supabase
        .from('faq_conversations')
        .update({ is_bookmarked: false })
        .eq('user_id', userId)
        .eq('is_bookmarked', true),
      
      // Unbookmark messages for this user's conversations
      conversationIdList.length > 0 ? 
        supabase
          .from('faq_messages')
          .update({ is_bookmarked: false })
          .eq('is_bookmarked', true)
          .in('conversation_id', conversationIdList)
        : Promise.resolve({ error: null })
    ];
    
    const results = await Promise.all(promises);
    
    // Check if any operation failed
    for (const result of results) {
      if (result.error) {
        console.error('Error clearing unified FAQ bookmarks:', result.error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing unified FAQ bookmarks:', error);
    return false;
  }
}

/**
 * Adapter function to convert unified history to old format for backward compatibility
 */
export function adaptUnifiedFAQHistoryToOld(items: UnifiedFAQHistoryItem[]): FAQSearchHistoryItem[] {
  return items.map(item => ({
    id: item.id,
    user_id: item.user_id,
    search_term: item.search_term,
    response_preview: item.response_preview,
    citation_count: item.citation_count,
    document_types: item.document_types,
    processing_time: item.processing_time,
    created_at: item.created_at,
    conversation_id: item.conversation_id
  }));
}

/**
 * Adapter function to convert unified bookmarks to old format for backward compatibility  
 */
export function adaptUnifiedFAQBookmarksToOld(bookmarks: UnifiedFAQBookmark[]): FAQBookmark[] {
  return bookmarks.map(bookmark => ({
    id: bookmark.id,
    user_id: bookmark.user_id,
    bookmark_name: bookmark.bookmark_name,
    search_term: bookmark.search_term,
    description: bookmark.description,
    response_preview: bookmark.response_preview,
    citation_count: bookmark.citation_count,
    document_types: bookmark.document_types,
    created_at: bookmark.created_at,
    last_used: bookmark.last_used,
    use_count: bookmark.use_count,
    conversation_id: bookmark.conversation_id
  }));
} 