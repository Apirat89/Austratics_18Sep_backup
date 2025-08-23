// Homecare Provider TypeScript Interfaces
// Based on merged_homecare_providers.json structure

export interface HomecareAddress {
  street: string;
  locality: string;
  state: string;
  postcode: string;
}

export interface HomecareContact {
  phone: string;
  fax?: string | null;
  email?: string | null;
}

export interface HomecareCoordinates {
  latitude: number;
  longitude: number;
  formatted_address: string;
  geocoding_status: string;
  geocoding_timestamp: string;
}

export interface HomecarePackages {
  level_1: boolean;
  level_2: boolean;
  level_3: boolean;
  level_4: boolean;
}

export interface HomecareProviderInfo {
  provider_id: string;
  provider_name: string;
  compliance_status: string;
  service_area: string;
  summary: string;
  home_care_packages: HomecarePackages;
  address: HomecareAddress;
  contact: HomecareContact;
  services_offered: string[];
  specialized_care: string[];
  organization_type: string;
  last_updated: string;
  coordinates: HomecareCoordinates;
}

export interface HomecarePackageBudget {
  hcp_level_1_fortnightly: number;
  charges_basic_daily_fee: boolean;
}

export interface HomecareCareManagement {
  level_1_fortnightly: number;
  level_2_fortnightly: number;
  level_3_fortnightly: number;
  level_4_fortnightly: number;
}

export interface HomecarePackageManagement {
  level_1_fortnightly: number;
  level_2_fortnightly: number;
  level_3_fortnightly: number;
  level_4_fortnightly: number;
}

export interface HomecareManagementCosts {
  care_management: HomecareCareManagement;
  package_management: HomecarePackageManagement;
  offers_self_management: boolean;
}

export interface HomecareServiceRates {
  standard_hours: number;
  non_standard_hours: number;
  saturday: number;
  sunday: number;
  public_holidays: number;
}

export interface HomecareServiceCosts {
  personal_care: HomecareServiceRates;
  nursing: HomecareServiceRates;
  cleaning_household: HomecareServiceRates;
  light_gardening: HomecareServiceRates;
  in_home_respite: HomecareServiceRates;
}

export interface HomecareTravelCosts {
  per_km_rate: number;
  special_conditions?: string;
}

export interface HomecareCostInfo {
  provider_id: string;
  provider_name: string;
  service_region: string;
  last_updated: string;
  contact: {
    phone: string;
    email?: string;
  };
  package_budget: HomecarePackageBudget;
  management_costs: HomecareManagementCosts;
  service_costs: HomecareServiceCosts;
  travel_costs: HomecareTravelCosts;
}

export interface HomecareComplianceInfo {
  provider_id: string;
  provider_name: string;
  compliance_assessment: {
    current_status: string;
    current_issues: string[];
    past_issues: string[];
  };
  compliance_statement: {
    financial_year: string | null;
    board_assessment: string | null;
    statement_available: boolean;
  };
  service_feedback: {
    most_compliments: string[];
    most_concerns: string[];
  };
  improvement_focus: string[];
  url?: string;
  extraction_date: string;
}

export interface HomecareFinanceInfo {
  provider_id: string;
  provider_name: string;
  last_updated: string;
  financial_year: string;
  previous_name: string | null;
  provider_abn: string;
  ownership_details: string;
  financials: {
    expenditure: {
      total: number;
      care_expenses: {
        total: {
          value: number;
          percentage: number;
        };
        breakdown: {
          employee_agency_costs: {
            value: number;
            percentage: number;
          };
          subcontracted_costs: {
            value: number;
            percentage: number;
          };
        };
      };
      case_management: {
        value: number;
        percentage: number;
      };
      administration_support: {
        value: number;
        percentage: number;
      };
      other_expenses: {
        value: number;
        percentage: number;
      };
    };
    income: {
      total: number;
      care_income: {
        total: {
          value: number;
          percentage: number;
        };
        breakdown: {
          direct_care: {
            value: number;
            percentage: number;
          };
          subcontracted_care: {
            value: number;
            percentage: number;
          };
        };
      };
      management_service_fees: {
        total: {
          value: number;
          percentage: number;
        };
        breakdown: {
          care_management_service_fees: {
            value: number;
            percentage: number;
          };
          package_management_service_fees: {
            value: number;
            percentage: number;
          };
        };
      };
      other_income: {
        value: number;
        percentage: number;
      };
    };
    budget_surplus_deficit: {
      value: number;
      percentage_of_income: number;
    };
    staff_pay_rates: {
      registered_nurse: {
        hourly_rate: number;
        sector_average: number;
      };
      enrolled_nurse: {
        hourly_rate: number;
        sector_average: number;
      };
      home_care_worker: {
        hourly_rate: number;
        sector_average: number;
      };
    };
  };
}

export interface HomecareProvider {
  provider_id: string;
  provider_info: HomecareProviderInfo;
  data_sources: string[];
  cost_info: HomecareCostInfo;
  compliance_info: HomecareComplianceInfo;
  finance_info: HomecareFinanceInfo;
  
  // Computed fields for frontend use
  distance?: number;
  isSaved?: boolean;
  isSelected?: boolean;
}

// Saved Homecare Facilities (Supabase)
export interface SavedHomecareProvider {
  id: string;
  user_id: string;
  provider_id: string;
  provider_name: string;
  service_area: string;
  organization_type: string;
  address_locality: string;
  address_state: string;
  address_postcode: string;
  contact_phone?: string;
  contact_email?: string;
  saved_at: string;
  notes?: string;
}

// Search History (Supabase)
export interface HomecareSearchHistoryItem {
  id: string;
  user_id: string;
  search_term: string;
  location_searched: string;
  radius_km?: number;
  filters_applied?: {
    package_levels?: string[];
    organization_types?: string[];
    service_types?: string[];
    cost_range?: {
      min?: number;
      max?: number;
    };
  };
  results_count: number;
  searched_at: string;
}

// Comparison History (Supabase)
export interface HomecareComparisonHistoryItem {
  id: string;
  user_id: string;
  comparison_name: string;
  provider_ids: string[];
  provider_names: string[];
  compared_at: string;
  comparison_notes?: string;
}

// Comparison Selection (temporary state)
export interface HomecareComparisonSelection {
  provider_id: string;
  provider_name: string;
  service_area: string;
  organization_type: string;
  selected_at: string;
}

// Filter interfaces
export interface HomecareFilters {
  location?: string;
  radiusKm?: number;
  packageLevels?: string[];
  organizationTypes?: string[];
  serviceTypes?: string[];
  costRange?: {
    min?: number;
    max?: number;
    type?: 'management' | 'personal_care' | 'nursing';
  };
  complianceStatus?: string[];
  specializedCare?: string[];
}

// API Response interfaces
export interface HomecareAPIResponse {
  providers: HomecareProvider[];
  total: number;
  page: number;
  limit: number;
  filters_applied: HomecareFilters;
}

// Statistics interfaces (for box plots)
export interface HomecareStatistics {
  management_costs: {
    level_1: number[];
    level_2: number[];
    level_3: number[];
    level_4: number[];
  };
  service_costs: {
    personal_care: number[];
    nursing: number[];
    cleaning: number[];
  };
  provider_counts: {
    by_state: Record<string, number>;
    by_organization_type: Record<string, number>;
    by_package_level: Record<string, number>;
  };
} 