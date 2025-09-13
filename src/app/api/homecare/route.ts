import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { HomecareProvider, HomecareAPIResponse, HomecareFilters } from '@/types/homecare';
import { calculateDistance } from '@/lib/spatialUtils';

// Cache for the homecare data
let homecareDataCache: HomecareProvider[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function loadHomecareData(): HomecareProvider[] {
  const now = Date.now();
  
  // Return cached data if still valid
  if (homecareDataCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return homecareDataCache;
  }

  try {
    const filePath = path.join(process.cwd(), 'Maps_ABS_CSV', 'merged_homecare_providers.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data: HomecareProvider[] = JSON.parse(fileContent);
    
    // Cache the data
    homecareDataCache = data;
    cacheTimestamp = now;
    
    console.log(`Loaded ${data.length} homecare providers`);
    return data;
  } catch (error) {
    console.error('Error loading homecare data:', error);
    throw new Error('Failed to load homecare data');
  }
}

function filterProviders(providers: HomecareProvider[], filters: HomecareFilters): HomecareProvider[] {
  let filtered = [...providers];
  
  // Apply filters if provided
  if (filters.location) {
    // Location-based filtering with radius
    filtered = filtered.filter(provider => {
      if (!provider.provider_info.coordinates) return false;
      
      // Calculate distance using provided lat/lng or geocoded coordinates
      if (filters.userLat && filters.userLng && filters.radiusKm) {
        const distance = calculateDistance(
          filters.userLat,
          filters.userLng,
          provider.provider_info.coordinates.latitude,
          provider.provider_info.coordinates.longitude
        );
        
        // Add distance to provider for sorting
        provider.distance = distance;
        
        // Filter by radius if specified
        return distance <= filters.radiusKm;
      }
      
      // If no user coordinates or radius, do text-based location search
      return provider.provider_info.service_area.toLowerCase().includes(filters.location.toLowerCase()) ||
             provider.provider_info.address.locality.toLowerCase().includes(filters.location.toLowerCase()) ||
             provider.provider_info.address.state.toLowerCase().includes(filters.location.toLowerCase());
    });
  }
  
  // Apply other filters
  if (filters.packageLevels && filters.packageLevels.length > 0) {
    filtered = filtered.filter(provider => {
      return filters.packageLevels!.some(level => {
        switch(level) {
          case 'level_1': return provider.provider_info.home_care_packages.level_1;
          case 'level_2': return provider.provider_info.home_care_packages.level_2;
          case 'level_3': return provider.provider_info.home_care_packages.level_3;
          case 'level_4': return provider.provider_info.home_care_packages.level_4;
          default: return true;
        }
      });
    });
  }
  
  if (filters.organizationTypes && filters.organizationTypes.length > 0) {
    filtered = filtered.filter(provider => 
      filters.organizationTypes!.includes(provider.provider_info.organization_type.toLowerCase())
    );
  }
  
  if (filters.serviceTypes && filters.serviceTypes.length > 0) {
    filtered = filtered.filter(provider => 
      filters.serviceTypes!.some(service => 
        provider.provider_info.services_offered.some(offered => 
          offered.toLowerCase().includes(service.toLowerCase())
        )
      )
    );
  }
  
  if (filters.complianceStatus && filters.complianceStatus.length > 0) {
    filtered = filtered.filter(provider => 
      filters.complianceStatus!.includes(provider.compliance_info.compliance_assessment.current_status.toLowerCase())
    );
  }
  
  if (filters.specializedCare && filters.specializedCare.length > 0) {
    filtered = filtered.filter(provider => 
      filters.specializedCare!.some(care => 
        provider.provider_info.specialized_care.some(offered => 
          offered.toLowerCase().includes(care.toLowerCase())
        )
      )
    );
  }
  
  // Cost range filtering
  if (filters.costRange) {
    filtered = filtered.filter(provider => {
      let cost = 0;
      
      // Get the appropriate cost based on type
      if (filters.costRange!.type === 'management') {
        // Use package management level 2 as representative cost
        cost = provider.cost_info.management_costs.package_management.level_2_fortnightly;
      } else if (filters.costRange!.type === 'personal_care') {
        // Use personal care standard hours as representative cost
        cost = provider.cost_info.service_costs.personal_care.standard_hours;
      } else if (filters.costRange!.type === 'nursing') {
        // Use nursing standard hours as representative cost
        cost = provider.cost_info.service_costs.nursing.standard_hours;
      }
      
      // Apply min and max filters
      if (filters.costRange!.min !== undefined && cost < filters.costRange!.min) return false;
      if (filters.costRange!.max !== undefined && cost > filters.costRange!.max) return false;
      
      return true;
    });
  }
  
  return filtered;
}

// Search providers by name, locality, or state
function searchProviders(providers: HomecareProvider[], query: string): HomecareProvider[] {
  if (!query) return providers;
  
  const lowerQuery = query.toLowerCase();
  
  return providers.filter(provider => 
    provider.provider_info.provider_name.toLowerCase().includes(lowerQuery) ||
    provider.provider_info.address.locality.toLowerCase().includes(lowerQuery) ||
    provider.provider_info.address.state.toLowerCase().includes(lowerQuery) ||
    provider.provider_info.address.postcode.includes(lowerQuery) ||
    provider.provider_info.service_area.toLowerCase().includes(lowerQuery)
  );
}

// Paginate providers for API response
function paginateResults(providers: HomecareProvider[], page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    providers: providers.slice(startIndex, endIndex),
    total: providers.length,
    page,
    limit
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 items per page
    
    // Parse filters
    const filters: HomecareFilters = {
      location: searchParams.get('location') || undefined,
      radiusKm: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
      packageLevels: searchParams.get('packageLevels')?.split(',') || undefined,
      organizationTypes: searchParams.get('organizationTypes')?.split(',') || undefined,
      serviceTypes: searchParams.get('serviceTypes')?.split(',') || undefined,
      complianceStatus: searchParams.get('complianceStatus')?.split(',') || undefined,
      specializedCare: searchParams.get('specializedCare')?.split(',') || undefined,
    };
    
    // Parse cost range
    const costMin = searchParams.get('costMin');
    const costMax = searchParams.get('costMax');
    const costType = searchParams.get('costType') as 'management' | 'personal_care' | 'nursing' | undefined;
    
    if (costMin || costMax || costType) {
      filters.costRange = {
        min: costMin ? parseFloat(costMin) : undefined,
        max: costMax ? parseFloat(costMax) : undefined,
        type: costType || 'management'
      };
    }
    
    // Load data
    const allProviders = loadHomecareData();
    
    // Apply search
    let filteredProviders = searchProviders(allProviders, search);
    
    // Apply filters
    filteredProviders = filterProviders(filteredProviders, filters);
    
    // Paginate results
    const paginatedResult = paginateResults(filteredProviders, page, limit);
    
    const response: HomecareAPIResponse = {
      providers: paginatedResult.providers,
      total: paginatedResult.total,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
      filters_applied: filters
    };
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in homecare API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homecare providers', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET single provider by ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider_id } = body;

    if (!provider_id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const allProviders = loadHomecareData();
    const provider = allProviders.find(p => p.provider_id === provider_id);

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ provider });

  } catch (error) {
    console.error('Error fetching single provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider', message: (error as Error).message },
      { status: 500 }
    );
  }
} 