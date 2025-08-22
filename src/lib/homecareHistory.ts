import { createBrowserSupabaseClient } from './supabase';
import { 
  HomecareSearchHistoryItem,
  HomecareComparisonHistoryItem,
  HomecareComparisonSelection,
  HomecareFilters
} from '@/types/homecare';

export type {
  HomecareSearchHistoryItem,
  HomecareComparisonHistoryItem,
  HomecareComparisonSelection
};

// Search History Functions
export async function saveHomecareSearchToHistory(
  userId: string,
  searchTerm: string,
  locationSearched: string,
  radiusKm?: number,
  filtersApplied?: HomecareFilters,
  resultsCount: number = 0
): Promise<HomecareSearchHistoryItem> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_search_history')
    .insert({
      user_id: userId,
      search_term: searchTerm,
      location_searched: locationSearched,
      radius_km: radiusKm,
      filters_applied: filtersApplied,
      results_count: resultsCount
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving homecare search history:', error);
    throw new Error(`Failed to save homecare search history: ${error.message}`);
  }

  return data;
}

export async function getHomecareSearchHistory(userId: string, limit: number = 20): Promise<HomecareSearchHistoryItem[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .rpc('get_user_homecare_search_history', {
      user_uuid: userId,
      limit_count: limit
    });

  if (error) {
    console.error('Error fetching homecare search history:', error);
    throw new Error(`Failed to fetch homecare search history: ${error.message}`);
  }

  return data || [];
}

export async function clearHomecareSearchHistory(userId: string): Promise<number> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .rpc('clear_user_homecare_search_history', {
      user_uuid: userId
    });

  if (error) {
    console.error('Error clearing homecare search history:', error);
    throw new Error(`Failed to clear homecare search history: ${error.message}`);
  }

  return data || 0;
}

export async function deleteHomecareSearchHistoryItem(userId: string, itemId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from('homecare_search_history')
    .delete()
    .match({ user_id: userId, id: itemId });

  if (error) {
    console.error('Error deleting homecare search history item:', error);
    throw new Error(`Failed to delete homecare search history item: ${error.message}`);
  }
}

// Comparison History Functions
export async function saveHomecareComparisonToHistory(
  userId: string,
  comparisonName: string,
  providerIds: string[],
  providerNames: string[],
  comparisonNotes?: string
): Promise<HomecareComparisonHistoryItem> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_comparison_history')
    .insert({
      user_id: userId,
      comparison_name: comparisonName,
      provider_ids: providerIds,
      provider_names: providerNames,
      comparison_notes: comparisonNotes
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving homecare comparison history:', error);
    throw new Error(`Failed to save homecare comparison history: ${error.message}`);
  }

  return data;
}

export async function getHomecareComparisonHistory(userId: string, limit: number = 10): Promise<HomecareComparisonHistoryItem[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .rpc('get_user_homecare_comparison_history', {
      user_uuid: userId,
      limit_count: limit
    });

  if (error) {
    console.error('Error fetching homecare comparison history:', error);
    throw new Error(`Failed to fetch homecare comparison history: ${error.message}`);
  }

  return data || [];
}

export async function clearHomecareComparisonHistory(userId: string): Promise<number> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_comparison_history')
    .delete()
    .match({ user_id: userId });

  if (error) {
    console.error('Error clearing homecare comparison history:', error);
    throw new Error(`Failed to clear homecare comparison history: ${error.message}`);
  }

  return 0;
}

export async function deleteHomecareComparisonHistoryItem(userId: string, itemId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from('homecare_comparison_history')
    .delete()
    .match({ user_id: userId, id: itemId });

  if (error) {
    console.error('Error deleting homecare comparison history item:', error);
    throw new Error(`Failed to delete homecare comparison history item: ${error.message}`);
  }
}

// Comparison Selections Functions (temporary state)
export async function addHomecareComparisonSelection(
  userId: string,
  providerId: string,
  providerName: string,
  serviceArea: string,
  organizationType: string
): Promise<HomecareComparisonSelection> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_comparison_selections')
    .upsert({
      user_id: userId,
      provider_id: providerId,
      provider_name: providerName,
      service_area: serviceArea,
      organization_type: organizationType
    }, {
      onConflict: 'user_id,provider_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding homecare comparison selection:', error);
    throw new Error(`Failed to add homecare comparison selection: ${error.message}`);
  }

  return {
    provider_id: data.provider_id,
    provider_name: data.provider_name,
    service_area: data.service_area,
    organization_type: data.organization_type,
    selected_at: data.selected_at
  };
}

export async function removeHomecareComparisonSelection(userId: string, providerId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from('homecare_comparison_selections')
    .delete()
    .match({ user_id: userId, provider_id: providerId });

  if (error) {
    console.error('Error removing homecare comparison selection:', error);
    throw new Error(`Failed to remove homecare comparison selection: ${error.message}`);
  }
}

export async function getHomecareComparisonSelections(userId: string): Promise<HomecareComparisonSelection[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_comparison_selections')
    .select('*')
    .eq('user_id', userId)
    .order('selected_at', { ascending: false });

  if (error) {
    console.error('Error fetching homecare comparison selections:', error);
    throw new Error(`Failed to fetch homecare comparison selections: ${error.message}`);
  }

  return data?.map((item: any) => ({
    provider_id: item.provider_id,
    provider_name: item.provider_name,
    service_area: item.service_area,
    organization_type: item.organization_type,
    selected_at: item.selected_at
  })) || [];
}

export async function clearHomecareComparisonSelections(userId: string): Promise<number> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_comparison_selections')
    .delete()
    .match({ user_id: userId });

  if (error) {
    console.error('Error clearing homecare comparison selections:', error);
    throw new Error(`Failed to clear homecare comparison selections: ${error.message}`);
  }

  return 0;
}



export async function isHomecareProviderSelected(userId: string, providerId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_comparison_selections')
    .select('provider_id')
    .match({ user_id: userId, provider_id: providerId })
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('Error checking homecare provider selection:', error);
    return false;
  }

  return !!data;
} 