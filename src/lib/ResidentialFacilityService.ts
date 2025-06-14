import { create } from 'zustand';
import type { StateCreator } from 'zustand';

// Types for the new residential facility data
export interface ResidentialFacility {
  // Basic Info
  provider_id: string;
  provider_name: string;
  service_name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  
  // Contact
  contact_phone: string;
  contact_email: string;
  contact_website: string;
  
  // Financial
  expenditure_total_per_day: number;
  income_total_per_day: number;
  budget_surplus_per_day: number;
  
  // Ratings
  overall_rating_stars: number;
  compliance_rating: string;
  quality_measures_rating: string;
  staffing_rating: string;
  residents_experience_rating: string;
  
  // Additional Data
  specialized_care: string[];
  features: string[];
  rooms_data: {
    total_rooms: number;
    occupied_rooms: number;
    available_rooms: number;
    room_types: {
      type: string;
      count: number;
      occupancy: number;
    }[];
  };
}

// Store interface for managing residential facility data
interface ResidentialFacilityStore {
  facilities: ResidentialFacility[];
  isLoading: boolean;
  error: string | null;
  selectedFacility: ResidentialFacility | null;
  filters: {
    rating: number | null;
    specializedCare: string[];
    features: string[];
    priceRange: [number, number] | null;
  };
  actions: {
    loadFacilities: () => Promise<void>;
    selectFacility: (facility: ResidentialFacility | null) => void;
    setFilters: (filters: Partial<ResidentialFacilityStore['filters']>) => void;
    clearFilters: () => void;
  };
}

// Create the store using Zustand
export const useResidentialFacilityStore = create<ResidentialFacilityStore>((set, get) => ({
  facilities: [],
  isLoading: false,
  error: null,
  selectedFacility: null,
  filters: {
    rating: null,
    specializedCare: [],
    features: [],
    priceRange: null,
  },
  actions: {
    loadFacilities: async () => {
      set({ isLoading: true, error: null });
      try {
        // Load the new residential facility data
        const response = await fetch('/Maps_ABS_CSV/Residential_May2025_ExcludeMPS.json');
        if (!response.ok) {
          throw new Error(`Failed to load facilities: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Transform the data to match our interface
        const transformedData = data.map((facility: any) => ({
          provider_id: facility.provider_id,
          provider_name: facility.provider_name,
          service_name: facility.service_name,
          formatted_address: facility.formatted_address,
          latitude: facility.latitude,
          longitude: facility.longitude,
          contact_phone: facility.contact_phone,
          contact_email: facility.contact_email,
          contact_website: facility.contact_website,
          expenditure_total_per_day: facility.expenditure_total_per_day,
          income_total_per_day: facility.income_total_per_day,
          budget_surplus_per_day: facility.budget_surplus_per_day,
          overall_rating_stars: facility.overall_rating_stars,
          compliance_rating: facility.compliance_rating,
          quality_measures_rating: facility.quality_measures_rating,
          staffing_rating: facility.staffing_rating,
          residents_experience_rating: facility.residents_experience_rating,
          specialized_care: facility.specialized_care || [],
          features: facility.features || [],
          rooms_data: {
            total_rooms: facility.rooms_data?.total_rooms || 0,
            occupied_rooms: facility.rooms_data?.occupied_rooms || 0,
            available_rooms: facility.rooms_data?.available_rooms || 0,
            room_types: facility.rooms_data?.room_types || []
          }
        }));

        set({ facilities: transformedData, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load facilities',
          isLoading: false 
        });
      }
    },
    selectFacility: (facility: ResidentialFacility | null) => set({ selectedFacility: facility }),
    setFilters: (newFilters: Partial<ResidentialFacilityStore['filters']>) => set((state: ResidentialFacilityStore) => ({
      filters: { ...state.filters, ...newFilters }
    })),
    clearFilters: () => set((state: ResidentialFacilityStore) => ({
      filters: {
        rating: null,
        specializedCare: [],
        features: [],
        priceRange: null,
      }
    })),
  },
}));

// Helper functions for data processing
export const processResidentialFacilities = (facilities: ResidentialFacility[]) => {
  // Calculate statistics
  const stats = {
    totalFacilities: facilities.length,
    averageRating: facilities.reduce((acc, f) => acc + f.overall_rating_stars, 0) / facilities.length,
    totalRooms: facilities.reduce((acc, f) => acc + f.rooms_data.total_rooms, 0),
    occupiedRooms: facilities.reduce((acc, f) => acc + f.rooms_data.occupied_rooms, 0),
    averageDailyCost: facilities.reduce((acc, f) => acc + f.expenditure_total_per_day, 0) / facilities.length,
  };

  // Get unique values for filters
  const uniqueSpecializedCare = Array.from(new Set(
    facilities.flatMap(f => f.specialized_care)
  ));
  
  const uniqueFeatures = Array.from(new Set(
    facilities.flatMap(f => f.features)
  ));

  return {
    stats,
    uniqueSpecializedCare,
    uniqueFeatures,
  };
};

// Export singleton instance
export const residentialFacilityService = {
  getInstance: () => useResidentialFacilityStore.getState(),
  loadFacilities: () => useResidentialFacilityStore.getState().actions.loadFacilities(),
  selectFacility: (facility: ResidentialFacility | null) => 
    useResidentialFacilityStore.getState().actions.selectFacility(facility),
  setFilters: (filters: Partial<ResidentialFacilityStore['filters']>) =>
    useResidentialFacilityStore.getState().actions.setFilters(filters),
  clearFilters: () => useResidentialFacilityStore.getState().actions.clearFilters(),
}; 