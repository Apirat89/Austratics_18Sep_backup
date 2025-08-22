import { createBrowserSupabaseClient } from './supabase';
import { SavedHomecareProvider } from '@/types/homecare';

export type { SavedHomecareProvider };

export async function saveHomecareProvider(
  userId: string,
  providerId: string,
  providerName: string,
  serviceArea: string,
  organizationType: string,
  addressLocality: string,
  addressState: string,
  addressPostcode: string,
  contactPhone?: string,
  contactEmail?: string,
  notes?: string
): Promise<SavedHomecareProvider> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from('homecare_saved_facilities')
    .insert({
      user_id: userId,
      provider_id: providerId,
      provider_name: providerName,
      service_area: serviceArea,
      organization_type: organizationType,
      address_locality: addressLocality,
      address_state: addressState,
      address_postcode: addressPostcode,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      notes: notes
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving homecare provider:', error);
    throw new Error(`Failed to save homecare provider: ${error.message}`);
  }

  return data;
}

export async function getUserSavedHomecareProviders(userId: string): Promise<SavedHomecareProvider[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .rpc('get_user_saved_homecare_providers', {
      user_uuid: userId
    });

  if (error) {
    console.error('Error fetching saved homecare providers:', error);
    throw new Error(`Failed to fetch saved homecare providers: ${error.message}`);
  }

  return data || [];
}

export async function deleteSavedHomecareProvider(userId: string, providerId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from('homecare_saved_facilities')
    .delete()
    .match({ user_id: userId, provider_id: providerId });

  if (error) {
    console.error('Error deleting saved homecare provider:', error);
    throw new Error(`Failed to delete saved homecare provider: ${error.message}`);
  }
}

export async function isHomecareProviderSaved(userId: string, providerId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .rpc('is_homecare_provider_saved', {
      user_uuid: userId,
      provider_id_param: providerId
    });

  if (error) {
    console.error('Error checking if homecare provider is saved:', error);
    return false;
  }

  return data || false;
}

export async function clearUserSavedHomecareProviders(userId: string): Promise<number> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .rpc('clear_user_saved_homecare_providers', {
      user_uuid: userId
    });

  if (error) {
    console.error('Error clearing saved homecare providers:', error);
    throw new Error(`Failed to clear saved homecare providers: ${error.message}`);
  }

  return data || 0;
}

export async function updateSavedHomecareProviderNotes(
  userId: string, 
  providerId: string, 
  notes: string
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from('homecare_saved_facilities')
    .update({ notes })
    .match({ user_id: userId, provider_id: providerId });

  if (error) {
    console.error('Error updating homecare provider notes:', error);
    throw new Error(`Failed to update homecare provider notes: ${error.message}`);
  }
} 