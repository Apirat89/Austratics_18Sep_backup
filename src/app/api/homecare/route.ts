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

  // Location and radius filtering
  if (filters.location && filters.radiusKm) {
    // This would need geocoding for the search location
    // For now, we'll skip location filtering and implement it later
  }

  // Package level filtering
  if (filters.packageLevels && filters.packageLevels.length > 0) {
    filtered = filtered.filter(provider => {
      const packages = provider.provider_info.home_care_packages;
      return filters.packageLevels!.some(level => {
        switch(level) {
          case '1': return packages.level_1;
          case '2': return packages.level_2;
          case '3': return packages.level_3;
          case '4': return packages.level_4;
          default: return false;
        }
      });
    });
  }

  // Organization type filtering
  if (filters.organizationTypes && filters.organizationTypes.length > 0) {
    filtered = filtered.filter(provider => 
      filters.organizationTypes!.includes(provider.provider_info.organization_type)
    );
  }

  // Service type filtering
  if (filters.serviceTypes && filters.serviceTypes.length > 0) {
    filtered = filtered.filter(provider => 
      filters.serviceTypes!.some(service => 
        provider.provider_info.services_offered.some(offered => 
          offered.toLowerCase().includes(service.toLowerCase())
        )
      )
    );
  }

  // Compliance status filtering
  if (filters.complianceStatus && filters.complianceStatus.length > 0) {
    filtered = filtered.filter(provider => 
      filters.complianceStatus!.includes(provider.provider_info.compliance_status)
    );
  }

  // Specialized care filtering
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
  if (filters.costRange && (filters.costRange.min || filters.costRange.max)) {
    filtered = filtered.filter(provider => {
      let cost = 0;
      
      // Extract cost based on type
      switch(filters.costRange!.type) {
        case 'management':
          cost = provider.cost_info.management_costs.care_management.level_1_fortnightly;
          break;
        case 'personal_care':
          cost = provider.cost_info.service_costs.personal_care.standard_hours;
          break;
        case 'nursing':
          cost = provider.cost_info.service_costs.nursing.standard_hours;
          break;
        default:
          cost = provider.cost_info.management_costs.care_management.level_1_fortnightly;
      }

      if (filters.costRange!.min && cost < filters.costRange!.min) return false;
      if (filters.costRange!.max && cost > filters.costRange!.max) return false;
      return true;
    });
  }

  return filtered;
}

function searchProviders(providers: HomecareProvider[], searchTerm: string): HomecareProvider[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return providers;
  }

  const term = searchTerm.toLowerCase();
  
  return providers.filter(provider => {
    const info = provider.provider_info;
    
    // Search in provider name (with null check)
    if (info.provider_name && info.provider_name.toLowerCase().includes(term)) return true;
    
    // Search in service area (with null check)
    if (info.service_area && info.service_area.toLowerCase().includes(term)) return true;
    
    // Search in locality (with null check)
    if (info.address?.locality && info.address.locality.toLowerCase().includes(term)) return true;
    
    // Search in state (with null check)
    if (info.address?.state && info.address.state.toLowerCase().includes(term)) return true;
    
    // Search in postcode (with null check)
    if (info.address?.postcode && info.address.postcode.includes(term)) return true;
    
    // Search in services offered (with null checks)
    if (info.services_offered && Array.isArray(info.services_offered) && 
        info.services_offered.some(service => 
          service && service.toLowerCase().includes(term)
        )) return true;
    
    // Search in specialized care (with null checks)
    if (info.specialized_care && Array.isArray(info.specialized_care) && 
        info.specialized_care.some(care => 
          care && care.toLowerCase().includes(term)
        )) return true;
    
    // Search in summary (with null check)
    if (info.summary && info.summary.toLowerCase().includes(term)) return true;
    
    return false;
  });
}

function paginateResults(providers: HomecareProvider[], page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    providers: providers.slice(startIndex, endIndex),
    total: providers.length,
    page,
    limit,
    totalPages: Math.ceil(providers.length / limit)
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