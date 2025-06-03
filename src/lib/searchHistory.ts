import { createBrowserSupabaseClient } from './supabase';

export interface SearchHistoryItem {
  id?: number;
  user_id: string;
  search_term: string;
  search_type?: 'location' | 'facility' | 'general';
  created_at?: string;
  updated_at?: string;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'suggestion' | 'history';
  icon?: string;
}

// Default search suggestions
const DEFAULT_SUGGESTIONS: SearchSuggestion[] = [
  { id: 'syd', text: 'Sydney, NSW', type: 'suggestion', icon: '📍' },
  { id: 'mel', text: 'Melbourne, VIC', type: 'suggestion', icon: '📍' },
  { id: 'bri', text: 'Brisbane, QLD', type: 'suggestion', icon: '📍' },
  { id: 'per', text: 'Perth, WA', type: 'suggestion', icon: '📍' },
  { id: 'ade', text: 'Adelaide, SA', type: 'suggestion', icon: '📍' },
  { id: 'can', text: 'Canberra, ACT', type: 'suggestion', icon: '📍' },
  { id: 'dar', text: 'Darwin, NT', type: 'suggestion', icon: '📍' },
  { id: 'hob', text: 'Hobart, TAS', type: 'suggestion', icon: '📍' },
];

// Function to ensure search_history table exists
export async function initializeSearchHistoryTable() {
  const supabase = createBrowserSupabaseClient();
  
  const { error } = await supabase.rpc('create_search_history_table_if_not_exists');
  
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating search_history table:', error);
  }
}

// Save search term to history
export async function saveSearchToHistory(userId: string, searchTerm: string, searchType: 'location' | 'facility' | 'general' = 'location'): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    // Check if this search already exists for this user (to avoid duplicates)
    const { data: existing, error: selectError } = await supabase
      .from('search_history')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // Handle case where table doesn't exist yet
      if (selectError.message?.includes('relation "public.search_history" does not exist') || 
          selectError.message?.includes('does not exist')) {
        console.warn('Search history table not found. Search not saved. Please run the database setup script.');
        return false;
      }
      // Ignore "No rows found" error (PGRST116) as it's expected when no existing record
      if (selectError.code !== 'PGRST116') {
        console.error('Error checking existing search:', selectError.message || selectError);
        return false;
      }
    }

    if (existing) {
      // Update the timestamp of existing search
      const { error } = await supabase
        .from('search_history')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      
      if (error) {
        console.error('Error updating search timestamp:', error.message || error);
        return false;
      }
      return true;
    } else {
      // Insert new search
      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          search_term: searchTerm,
          search_type: searchType,
        });
      
      if (error) {
        // Handle case where table doesn't exist yet
        if (error.message?.includes('relation "public.search_history" does not exist') || 
            error.message?.includes('does not exist')) {
          console.warn('Search history table not found. Search not saved. Please run the database setup script.');
          return false;
        }
        console.error('Error inserting search:', error.message || error);
        return false;
      }
      return true;
    }
  } catch (error) {
    console.error('Error saving search to history:', error);
    return false;
  }
}

// Get user's search history
export async function getUserSearchHistory(userId: string, limit: number = 5): Promise<SearchHistoryItem[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Handle case where table doesn't exist yet
      if (error.message?.includes('relation "public.search_history" does not exist') || 
          error.message?.includes('does not exist') ||
          error.code === 'PGRST116') {
        console.warn('Search history table not found. Please run the database setup script.');
        return [];
      }
      console.error('Error fetching search history:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching search history:', error);
    return [];
  }
}

// Get search suggestions combining history and defaults
export async function getSearchSuggestions(userId: string, searchQuery: string = ''): Promise<SearchSuggestion[]> {
  try {
    const suggestions: SearchSuggestion[] = [];
    
    // Get user's search history
    const history = await getUserSearchHistory(userId, 5);
    const historySuggestions = history.map(item => ({
      id: `history-${item.id}`,
      text: item.search_term,
      type: 'history' as const
    }));
    
    suggestions.push(...historySuggestions);
    
    // Only add default suggestions if search query is empty or very general
    // This prevents showing unrelated city suggestions when searching for specific terms
    if (!searchQuery || searchQuery.length < 2) {
      const filteredDefaults = DEFAULT_SUGGESTIONS.filter(suggestion => 
        !searchQuery || suggestion.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      suggestions.push(...filteredDefaults);
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

// Clear user's search history
export async function clearUserSearchHistory(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      // Handle case where table doesn't exist yet
      if (error.message?.includes('relation "public.search_history" does not exist') || 
          error.message?.includes('does not exist')) {
        console.warn('Search history table not found. Please run the database setup script.');
        return false;
      }
      console.error('Error clearing search history:', error.message || error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing search history:', error);
    return false;
  }
} 