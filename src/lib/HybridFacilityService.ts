interface ResidentialDetailedData {
  provider_id: string;
  provider_name: string;
  service_name: string | null;
  formatted_address: string;
  latitude: number;
  longitude: number;
  expenditure_total_per_day: number;
  income_total_per_day: number;
  budget_surplus_per_day: number;
  overall_rating_stars: number;
  compliance_rating: number;
  quality_measures_rating: number;
  staffing_rating: number;
  residents_experience_rating: number;
  residential_places: number;
  contact_phone: string;
  contact_email: string;
  contact_website: string;
  // Add other fields as needed
  [key: string]: any;
}

interface EnhancedFacilityData {
  // Standard GeoJSON facility properties
  OBJECTID: number;
  Service_Name: string;
  Physical_Address: string;
  Physical_Suburb: string;
  Physical_State: string;
  Physical_Post_Code: number;
  Care_Type: string;
  Residential_Places: number | null;
  Home_Care_Places: number | null;
  Home_Care_Max_Places: number | null;
  Restorative_Care_Places: number | null;
  Provider_Name: string;
  Organisation_Type: string;
  ABS_Remoteness: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  Latitude: number;
  Longitude: number;
  F2019_Aged_Care_Planning_Region: string;
  F2016_SA2_Name: string;
  F2016_SA3_Name: string;
  F2016_LGA_Name: string;
  facilityType: 'residential' | 'mps' | 'home' | 'retirement';
  
  // Enhanced data for residential facilities
  detailedData?: ResidentialDetailedData;
}

class HybridFacilityService {
  private static instance: HybridFacilityService;
  private cachedData: EnhancedFacilityData[] | null = null;
  private loadingPromise: Promise<EnhancedFacilityData[]> | null = null;

  static getInstance(): HybridFacilityService {
    if (!HybridFacilityService.instance) {
      HybridFacilityService.instance = new HybridFacilityService();
    }
    return HybridFacilityService.instance;
  }

  async loadAllFacilities(): Promise<EnhancedFacilityData[]> {
    // Return cached data if available
    if (this.cachedData) {
      return this.cachedData;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start new loading process
    this.loadingPromise = this.performDataLoad();
    
    try {
      this.cachedData = await this.loadingPromise;
      return this.cachedData;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async performDataLoad(): Promise<EnhancedFacilityData[]> {
    console.log('🔄 Loading hybrid facility data...');
    
    try {
      // Load both data sources in parallel
      const [healthcareResponse, residentialResponse] = await Promise.all([
        fetch('/maps/healthcare.geojson'),
        fetch('/maps/abs_csv/Residential_May2025_ExcludeMPS_updated_with_finance.json')
      ]);

      if (!healthcareResponse.ok) {
        throw new Error(`Failed to load healthcare data: ${healthcareResponse.status}`);
      }

      if (!residentialResponse.ok) {
        throw new Error(`Failed to load residential data: ${residentialResponse.status}`);
      }

      const [healthcareData, residentialData] = await Promise.all([
        healthcareResponse.json(),
        residentialResponse.json()
      ]);

      console.log('📊 Healthcare facilities loaded:', healthcareData.features?.length || 0);
      console.log('🏠 Residential facilities loaded:', residentialData?.length || 0);

      // Process and merge the data
      const enhancedFacilities = this.mergeDataSources(healthcareData, residentialData);
      
      console.log('✅ Hybrid facility data loaded successfully:', enhancedFacilities.length);
      return enhancedFacilities;

    } catch (error) {
      console.error('❌ Error loading hybrid facility data:', error);
      throw error;
    }
  }

  private mergeDataSources(healthcareData: any, residentialData: ResidentialDetailedData[]): EnhancedFacilityData[] {
    const enhancedFacilities: EnhancedFacilityData[] = [];

    if (!healthcareData.features) {
      console.warn('No features found in healthcare data');
      return enhancedFacilities;
    }

    // Create a map of residential data for quick lookup
    const residentialMap = new Map<string, ResidentialDetailedData>();
    
    residentialData.forEach(facility => {
      if (facility.service_name) {
        const key = facility.service_name.toLowerCase().trim();
        residentialMap.set(key, facility);
      }
    });

    console.log('🔍 Created residential lookup map with', residentialMap.size, 'entries');

    // Process each healthcare facility
    healthcareData.features.forEach((feature: any) => {
      const properties = feature.properties;
      if (!properties) return;

      // Determine facility type (check both Care_Type and Service_Name for retirement facilities)
      const facilityType = this.determineFacilityType(properties.Care_Type, properties.Service_Name);

      // Create base facility data
      const facilityData: EnhancedFacilityData = {
        OBJECTID: properties.OBJECTID || 0,
        Service_Name: properties.Service_Name || '',
        Physical_Address: properties.Physical_Address || '',
        Physical_Suburb: properties.Physical_Suburb || '',
        Physical_State: properties.Physical_State || '',
        Physical_Post_Code: properties.Physical_Post_Code || 0,
        Care_Type: properties.Care_Type || '',
        Residential_Places: properties.Residential_Places || null,
        Home_Care_Places: properties.Home_Care_Places || null,
        Home_Care_Max_Places: properties.Home_Care_Max_Places || null,
        Restorative_Care_Places: properties.Restorative_Care_Places || null,
        Provider_Name: properties.Provider_Name || '',
        Organisation_Type: properties.Organisation_Type || '',
        ABS_Remoteness: properties.ABS_Remoteness || '',
        Phone: properties.Phone,
        Email: properties.Email,
        Website: properties.Website,
        Latitude: properties.Latitude || 0,
        Longitude: properties.Longitude || 0,
        F2019_Aged_Care_Planning_Region: properties.F2019_Aged_Care_Planning_Region || '',
        F2016_SA2_Name: properties.F2016_SA2_Name || '',
        F2016_SA3_Name: properties.F2016_SA3_Name || '',
        F2016_LGA_Name: properties.F2016_LGA_Name || '',
        facilityType
      };

      // For residential facilities, try to find matching detailed data
      if (facilityType === 'residential') {
        const detailedData = this.findMatchingResidentialData(facilityData, residentialMap);
        if (detailedData) {
          facilityData.detailedData = detailedData;
          // Update contact info from detailed data if available
          if (detailedData.contact_phone) facilityData.Phone = detailedData.contact_phone;
          if (detailedData.contact_email) facilityData.Email = detailedData.contact_email;
          if (detailedData.contact_website) facilityData.Website = detailedData.contact_website;
        }
      }

      enhancedFacilities.push(facilityData);
    });

    console.log('🔗 Enhanced facilities created:', enhancedFacilities.length);
    const residentialWithDetails = enhancedFacilities.filter(f => f.facilityType === 'residential' && f.detailedData).length;
    console.log('🏠 Residential facilities with detailed data:', residentialWithDetails);

    return enhancedFacilities;
  }

  private findMatchingResidentialData(
    facility: EnhancedFacilityData, 
    residentialMap: Map<string, ResidentialDetailedData>
  ): ResidentialDetailedData | null {
    const serviceName = facility.Service_Name?.toLowerCase().trim();
    if (!serviceName) return null;

    // Try exact match first
    let match = residentialMap.get(serviceName);
    if (match) {
      return match;
    }

    // Try coordinate proximity matching
    const facilityLat = facility.Latitude;
    const facilityLng = facility.Longitude;
    
    for (const residentialFacility of residentialMap.values()) {
      const latDiff = Math.abs(facilityLat - residentialFacility.latitude);
      const lngDiff = Math.abs(facilityLng - residentialFacility.longitude);
      
      // Within ~100m (0.001 degrees)
      if (latDiff < 0.001 && lngDiff < 0.001) {
        return residentialFacility;
      }
    }

    return null;
  }

  private determineFacilityType(careType: string, serviceName?: string): 'residential' | 'mps' | 'home' | 'retirement' {
    if (!careType) return 'residential';

    const careTypeMapping = {
      mps: ['Multi-Purpose Service'],
      residential: ['Residential'],
      home: ['Home Care', 'Community Care'],
      retirement: ['Retirement', 'Retirement Living', 'Retirement Village']
    };

    // Check for retirement facilities first by checking both Care_Type and Service_Name
    if (serviceName) {
      const retirementKeywords = ['retirement', 'retirement living', 'retirement village', 'retirement home', 'retirement community'];
      if (retirementKeywords.some(keyword => serviceName.toLowerCase().includes(keyword))) {
        return 'retirement';
      }
    }
    
    // Also check Care_Type for retirement keywords
    if (careTypeMapping.retirement.some(ct => careType.toLowerCase().includes(ct.toLowerCase()))) {
      return 'retirement';
    }

    // Check MPS (most specific)
    if (careTypeMapping.mps.some(ct => careType.includes(ct))) {
      return 'mps';
    }
    
    // Check home care
    if (careTypeMapping.home.some(ct => careType.includes(ct))) {
      return 'home';
    }
    
    // Then check residential (general category)
    if (careTypeMapping.residential.some(ct => careType.includes(ct))) {
      return 'residential';
    }

    return 'residential'; // default
  }

  // Clear cache (useful for development/testing)
  clearCache(): void {
    this.cachedData = null;
    this.loadingPromise = null;
  }
}

// Export singleton instance
export const hybridFacilityService = HybridFacilityService.getInstance();
export type { EnhancedFacilityData, ResidentialDetailedData }; 