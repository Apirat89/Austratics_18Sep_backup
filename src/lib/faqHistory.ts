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
    const response = await fetch(`/api/faq/chat?action=get-search-history&user_id=${userId}`);
    const data = await response.json();
    
    if (data.success) {
      return data.history || [];
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
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-bookmark',
        user_id: userId,
        bookmark_name: bookmarkName,
        search_term: searchTerm,
        description,
        response_preview: responsePreview || '',
        citation_count: citationCount || 0,
        document_types: documentTypes || [],
        conversation_id: conversationId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error saving FAQ bookmark:', error);
    return false;
  }
}

export async function getFAQBookmarks(userId: string): Promise<FAQBookmark[]> {
  try {
    const response = await fetch(`/api/faq/chat?action=get-bookmarks&user_id=${userId}`);
    const data = await response.json();
    
    if (data.success) {
      return data.bookmarks || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting FAQ bookmarks:', error);
    return [];
  }
}

export async function deleteFAQBookmark(userId: string, bookmarkId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-bookmark',
        user_id: userId,
        bookmark_id: bookmarkId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error deleting FAQ bookmark:', error);
    return false;
  }
}

export async function clearFAQBookmarks(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear-bookmarks',
        user_id: userId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error clearing FAQ bookmarks:', error);
    return false;
  }
}

export async function isFAQBookmarkNameTaken(userId: string, bookmarkName: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/faq/chat?action=check-bookmark-name&user_id=${userId}&bookmark_name=${encodeURIComponent(bookmarkName)}`);
    const data = await response.json();
    
    return data.exists || false;
  } catch (error) {
    console.error('Error checking FAQ bookmark name:', error);
    return false;
  }
}

export async function getFAQBookmarkCount(userId: string): Promise<number> {
  try {
    const response = await fetch(`/api/faq/chat?action=get-bookmark-count&user_id=${userId}`);
    const data = await response.json();
    
    return data.count || 0;
  } catch (error) {
    console.error('Error getting FAQ bookmark count:', error);
    return 0;
  }
}

export async function updateFAQBookmarkUsage(userId: string, bookmarkId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/faq/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-bookmark-usage',
        user_id: userId,
        bookmark_id: bookmarkId
      })
    });
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Error updating FAQ bookmark usage:', error);
    return false;
  }
} 