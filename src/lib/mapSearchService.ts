interface SearchResult {
  id: string;           // Stable unique identifier
  name: string;
  area: string;         // Human-readable area description
  code?: string;
  type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality' | 'facility';
  state?: string;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  center?: [number, number]; // [lng, lat]
  score: number; // Relevance score for sorting
  // Facility-specific properties
  address?: string;
  careType?: string;
  facilityType?: 'residential' | 'multipurpose_others' | 'home' | 'retirement';
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: any;
  bbox?: [number, number, number, number]; // Optional bounding box
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Cache for loaded geojson data
const dataCache = new Map<string, GeoJSONData>();
const searchIndexCache = new Map<string, SearchResult[]>();
// Cache for search results (performance optimization)
const searchResultsCache = new Map<string, SearchResult[]>();
// Cache for SA2 data with postcode information
const sa2DataCache = new Map<string, any>();
// Cache for SA2 coordinates (performance optimization)
const coordinatesCache = new Map<string, Array<{ id: string; name: string; code: string; center: [number, number] }>>();
// Cache for SA2 code → SearchResult lookup (exact SA2 code matching)
let SA2_BY_CODE: Map<string, SearchResult> | null = null;

// Calculate the center point and bounds of a geometry
function calculateGeometryBounds(geometry: any): { center: [number, number], bounds: [number, number, number, number] } | null {
  // Check if geometry is null or undefined
  if (!geometry || !geometry.type || !geometry.coordinates) {
    console.warn('Invalid geometry found:', geometry);
    return null;
  }

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  
  function processCoordinates(coords: any) {
    if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
      // This is a coordinate pair [lng, lat]
      const [lng, lat] = coords;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    } else if (Array.isArray(coords)) {
      // This is an array of coordinates or coordinate arrays
      coords.forEach(processCoordinates);
    }
  }

  try {
    // Double-check geometry object structure before processing
    if (!geometry || typeof geometry !== 'object' || !geometry.type) {
      console.warn('Invalid geometry structure:', geometry);
      return null;
    }

    if (geometry.type === 'Polygon') {
      processCoordinates(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      processCoordinates(geometry.coordinates);
    } else if (geometry.type === 'Point') {
      // Handle Point geometry
      const [lng, lat] = geometry.coordinates;
      minLng = maxLng = lng;
      minLat = maxLat = lat;
    } else if (geometry.type === 'LineString') {
      // Handle LineString geometry
      processCoordinates(geometry.coordinates);
    } else if (geometry.type === 'MultiLineString') {
      // Handle MultiLineString geometry
      processCoordinates(geometry.coordinates);
    } else {
      console.warn('Unsupported geometry type:', geometry.type);
      return null;
    }

    // Validate that we found valid coordinates
    if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
      console.warn('Invalid coordinates found in geometry');
      return null;
    }

    const center: [number, number] = [
      (minLng + maxLng) / 2,
      (minLat + maxLat) / 2
    ];
    
    const bounds: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];
    
    return { center, bounds };
  } catch (error) {
    console.error('Error calculating geometry bounds:', error);
    return null;
  }
}

// Load and parse geojson data
async function loadGeoJSONData(type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality'): Promise<GeoJSONData | null> {
  const cacheKey = type;
  
  // Return cached data if available
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }

  try {
    const fileMap = {
      lga: 'LGA.geojson',
      sa2: 'SA2.geojson',
      sa3: 'SA3.geojson', 
      sa4: 'SA4.geojson',
      postcode: 'POA.geojson',
      locality: 'SAL.geojson'
    };

    const fileName = fileMap[type];
    const supabaseUrl = `https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/${fileName}`;
    const response = await fetch(supabaseUrl);
    
    if (!response.ok) {
      console.error(`Failed to load ${fileName}: ${response.status}`);
      return null;
    }

    const data: GeoJSONData = await response.json();
    
    // Cache the data
    dataCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error(`Error loading ${type} data:`, error);
    return null;
  }
}

// Build search index for a specific boundary type
async function buildSearchIndex(type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality'): Promise<SearchResult[]> {
  const cacheKey = type;
  
  // Return cached index if available
  if (searchIndexCache.has(cacheKey)) {
    return searchIndexCache.get(cacheKey)!;
  }

  console.log(`Building search index for ${type}...`); // Debug log

  const data = await loadGeoJSONData(type);
  if (!data) {
    console.error(`Failed to load data for ${type}`);
    return [];
  }

  console.log(`Loaded ${data.features.length} features for ${type}`); // Debug log

  const searchResults: SearchResult[] = [];

  data.features.forEach((feature, index) => {
    try {
      const props = feature.properties;
      let name = '';
      let code = '';
      let state = '';

      // Extract relevant fields based on boundary type
      if (type === 'lga') {
        name = props.lga_name_2021 || props.lga_name_2022 || props.LGA_NAME21 || '';
        code = props.lga_code_2021 || props.lga_code_2022 || props.LGA_CODE21 || '';
        state = props.state_name_2021 || props.state_name_2022 || props.STATE_NAME21 || '';
      } else if (type === 'sa2') {
        name = props.sa2_name_2021 || props.SA2_NAME21 || '';
        code = props.sa2_code_2021 || props.SA2_CODE21 || '';
        state = props.state_name_2021 || props.STATE_NAME21 || '';
      } else if (type === 'sa3') {
        name = props.sa3_name_2021 || props.SA3_NAME21 || '';
        code = props.sa3_code_2021 || props.SA3_CODE21 || '';
        state = props.state_name_2021 || props.STATE_NAME21 || '';
      } else if (type === 'sa4') {
        name = props.sa4_name_2021 || props.SA4_NAME21 || '';
        code = props.sa4_code_2021 || props.SA4_CODE21 || '';
        state = props.state_name_2021 || props.STATE_NAME21 || '';
      } else if (type === 'postcode') {
        // For postcodes, the code is the main identifier
        code = props.poa_code_2021 || props.POA_CODE21 || props.poa_name_2021 || props.POA_NAME21 || '';
        name = code; // Use the postcode as the name
        state = props.state_name_2021 || props.STATE_NAME21 || '';
      } else if (type === 'locality') {
        // For localities, use SAL fields from the SAL.geojson file
        name = props.SAL_NAME21 || props.SAL_NAME || '';
        code = props.SAL_CODE21 || props.SAL_CODE || '';
        state = props.STE_NAME21 || props.STE_NAME || props.state_name_2021 || props.STATE_NAME21 || '';
      }

      if (name || code) {
        // Calculate geometry bounds and center
        const geometryResult = calculateGeometryBounds(feature.geometry);
        
        if (geometryResult) {
          const { center, bounds } = geometryResult;
          
          // Generate stable ID and area description
          const stableId = `${name.replace(/\s+/g, '_')}_${type.toUpperCase()}_${code || index}`;
          const areaDescription = state ? `${name} (${state})` : name;
          
          searchResults.push({
            id: stableId,
            name: name.trim(),
            area: areaDescription,
            code: code.trim(),
            type,
            state: state.trim(),
            center,
            bounds,
            score: 1.0 // Base score, will be adjusted during search
          });
        }
      }
    } catch (error) {
      console.warn(`Error processing feature ${index} for ${type}:`, error);
      // Continue processing other features
    }
  });

  console.log(`Built search index for ${type}: ${searchResults.length} entries`); // Debug log
  
  // Log a few sample entries for postcodes to debug
  if (type === 'postcode' && searchResults.length > 0) {
    console.log('Sample postcode entries:', searchResults.slice(0, 5).map(r => ({ name: r.name, code: r.code })));
  }
  
  // Log a few sample entries for localities to debug
  if (type === 'locality' && searchResults.length > 0) {
    console.log('Sample locality entries:', searchResults.slice(0, 5).map(r => ({ name: r.name, code: r.code })));
  }

  // Cache the search index
  searchIndexCache.set(cacheKey, searchResults);
  
  return searchResults;
}

// Build search index for healthcare facilities
async function buildHealthcareFacilityIndex(): Promise<SearchResult[]> {
  const cacheKey = 'healthcare';
  
  // Return cached index if available
  if (searchIndexCache.has(cacheKey)) {
    return searchIndexCache.get(cacheKey)!;
  }

  console.log('Building search index for healthcare facilities...'); // Debug log

  try {
    const response = await fetch('https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/healthcare.geojson');
    
    if (!response.ok) {
      console.error(`Failed to load healthcare data: ${response.status}`);
      return [];
    }
    
    const data: GeoJSONData = await response.json();
    console.log(`Loaded ${data.features.length} healthcare facilities`); // Debug log

    if (!data.features) {
      console.warn('No features found in healthcare data');
      return [];
    }

    const searchResults: SearchResult[] = [];

    // Define care type mapping for the new classification system
    const careTypeMapping = {
      residential: ['Residential'], // Only pure residential facilities
      multipurpose_others: [
        'Multi-Purpose Service',
        'Transition Care', 
        'Short-Term Restorative Care (STRC)',
        'National Aboriginal and Torres Strait Islander Aged Care Program',
        'Innovative Pool'
      ],
      home: ['Home Care', 'Community Care'], 
      retirement: ['Retirement', 'Retirement Living', 'Retirement Village']
    };

    data.features.forEach((feature, index) => {
      try {
        const props = feature.properties;
        const serviceName = props?.Service_Name || '';
        const careType = props?.Care_Type || '';
        // Updated field mappings for new healthcare data structure
        const address = props?.Physical_Address || '';
        const state = props?.Physical_State || '';
        const postcode = props?.Physical_Post_Code || '';
        
        // Extract coordinates
        const geometry = feature.geometry;
        if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
          return; // Skip features without valid point coordinates
        }
        
        const [lng, lat] = geometry.coordinates;
        
        // Validate coordinates are within Australia bounds
        if (lng < 112 || lng > 154 || lat < -44 || lat > -9) {
          return; // Skip facilities outside Australia
        }

        // Determine facility type based on care type
        // Updated classification system: pure residential vs multipurpose/specialized services
        let facilityType: 'residential' | 'multipurpose_others' | 'home' | 'retirement' | null = null;
        
        if (careTypeMapping.residential.some(ct => careType.includes(ct))) {
          facilityType = 'residential';
        } else if (careTypeMapping.multipurpose_others.some(ct => careType.includes(ct))) {
          facilityType = 'multipurpose_others';
        } else if (careTypeMapping.home.some(ct => careType.includes(ct))) {
          facilityType = 'home';
        } else if (careTypeMapping.retirement.some(ct => careType.toLowerCase().includes(ct.toLowerCase()))) {
          facilityType = 'retirement';
        }

        if (serviceName && facilityType) {
          const fullAddress = `${address}${state ? `, ${state}` : ''}${postcode ? ` ${postcode}` : ''}`;
          
          // Generate stable ID and area description for facility
          const facilityId = `${serviceName.replace(/\s+/g, '_')}_FACILITY_${index}`;
          const facilityArea = state ? `${address ? address + ', ' : ''}${state}` : (address || 'Unknown Location');
          
          searchResults.push({
            id: facilityId,
            name: serviceName.trim(),
            area: facilityArea.trim(),
            type: 'facility',
            state: state.trim(),
            center: [lng, lat],
            bounds: [lng - 0.001, lat - 0.001, lng + 0.001, lat + 0.001], // Small bounds around the point
            score: 1.0,
            address: fullAddress.trim(),
            careType: careType.trim(),
            facilityType
          });
        }
      } catch (error) {
        console.warn(`Error processing healthcare facility ${index}:`, error);
        // Continue processing other facilities
      }
    });

    console.log(`Built healthcare facility search index: ${searchResults.length} entries`); // Debug log
    
    // Cache the search index
    searchIndexCache.set(cacheKey, searchResults);
    
    return searchResults;
  } catch (error) {
    console.error('Error loading healthcare facilities for search:', error);
    return [];
  }
}

// Build search index from SA2 data including postcode and locality information
async function buildSA2PostcodeSearchIndex(): Promise<SearchResult[]> {
  const cacheKey = 'sa2-postcode-search';
  
  // Return cached index if available
  if (searchIndexCache.has(cacheKey)) {
    return searchIndexCache.get(cacheKey)!;
  }

  console.log('Building SA2 postcode search index...'); // Debug log

  try {
    // Only try to load SA2 data if we're in a browser context
    if (typeof window === 'undefined') {
      console.log('Server context - skipping SA2 postcode search index');
      return [];
    }

    // TEMPORARY: Disable SA2 postcode search until API issue is resolved
    console.warn('SA2 postcode search temporarily disabled due to API issues');
    return [];

    // Load SA2 data from the API
    const response = await fetch('/api/sa2');
    if (!response.ok) {
      console.error('Failed to load SA2 data for search:', response.status);
      return [];
    }

    const apiData = await response.json();
    if (!apiData.success) {
      console.error('SA2 API returned error:', apiData.error);
      return [];
    }

    const sa2Data = apiData.data;
    const searchResults: SearchResult[] = [];

    console.log(`Processing ${Object.keys(sa2Data).length} SA2 regions for postcode search...`); // Debug log

    // Process each SA2 region
    Object.entries(sa2Data).forEach(([sa2Id, sa2Info]: [string, any]) => {
      if (sa2Info.postcode_data && Array.isArray(sa2Info.postcode_data)) {
        // Create search results for each locality in this SA2
        sa2Info.postcode_data.forEach((postcodeItem: any, index: number) => {
          const { Locality, Post_Code } = postcodeItem;
          
          if (Locality && Post_Code) {
            // Create a locality search result
            const localityResult: SearchResult = {
              id: `sa2-locality-${sa2Id}-${index}`,
              name: Locality,
              area: `${Locality} (SA2: ${sa2Info.sa2Name})`,
              code: sa2Id, // Use SA2 ID as the code so we can map back to analytics data
              type: 'locality',
              score: 0, // Will be calculated during search
              // Include postcode information for additional context
              address: `Postcode ${Post_Code}`,
              // Store the SA2 info for analytics integration
              facilityType: undefined,
              careType: undefined,
              state: sa2Info.STATE_NAME_2021,
              bounds: undefined, // Could be added if we had locality boundaries
              center: undefined   // Could be added if we had locality coordinates
            };

            searchResults.push(localityResult);

            // Also create a postcode search result if we haven't seen this postcode in this SA2 yet
            const existingPostcodeResult = searchResults.find(
              result => result.type === 'postcode' && 
                       result.name === Post_Code && 
                       result.code === sa2Id
            );

            if (!existingPostcodeResult) {
              const postcodeResult: SearchResult = {
                id: `sa2-postcode-${sa2Id}-${Post_Code}`,
                name: Post_Code,
                area: `${Post_Code} (SA2: ${sa2Info.sa2Name})`,
                code: sa2Id, // Use SA2 ID as the code so we can map back to analytics data
                type: 'postcode',
                score: 0, // Will be calculated during search
                address: `Includes ${Locality}`,
                facilityType: undefined,
                careType: undefined,
                state: sa2Info.STATE_NAME_2021,
                bounds: undefined,
                center: undefined
              };

              searchResults.push(postcodeResult);
            }
          }
        });
      }
    });

    console.log(`Built ${searchResults.length} postcode/locality search results`); // Debug log
    
    // Cache the search index
    searchIndexCache.set(cacheKey, searchResults);
    
    return searchResults;
  } catch (error) {
    console.error('Error building SA2 postcode search index:', error);
    return [];
  }
}

// Calculate fuzzy similarity score based on search term
function calculateRelevanceScore(searchTerm: string, result: SearchResult): number {
  const term = searchTerm.toLowerCase().trim();
  const name = result.name.toLowerCase();
  const code = result.code?.toLowerCase() || '';
  
  // Build searchable text fields for comprehensive matching
  const searchableFields = [name, code];
  
  // For facilities, include additional searchable fields
  if (result.type === 'facility') {
    if (result.address) searchableFields.push(result.address.toLowerCase());
    if (result.careType) searchableFields.push(result.careType.toLowerCase());
  }
  
  let maxScore = 0;
  
  // Calculate similarity for each searchable field and take the best match
  for (const field of searchableFields) {
    if (!field) continue;
    
    const fieldScore = calculateFieldSimilarity(term, field);
    maxScore = Math.max(maxScore, fieldScore);
  }
  
  // 🔒 REMOVED: Unconditional facility boost (was +25)
  // Now facilities only score based on actual text similarity
  
  // Apply contextual boosts only when there's already a good match (score > 20)
  if (maxScore > 20) {
    if (result.type === 'locality' && !/^\d+$/.test(term)) {
      maxScore += 10; // Text searches often look for localities
    } else if (result.type === 'postcode' && /^\d+$/.test(term)) {
      maxScore += 15; // Numeric searches often look for postcodes
    } else if (result.type === 'lga') {
      maxScore += 5; // LGAs are commonly searched
    }
  }
  
  return Math.min(maxScore, 100); // Cap at 100
}

// Calculate similarity between search term and a field using multiple techniques
function calculateFieldSimilarity(term: string, field: string): number {
  if (!field) return 0;
  
  let score = 0;
  
  // 1. Exact match (highest score)
  if (field === term) {
    score = 100;
  }
  // 2. Starts with search term (high score)
  else if (field.startsWith(term)) {
    score = 85;
  }
  // 3. Word boundary match (e.g., "north sydney" matches "North Sydney")
  else if (field.split(' ').some(word => word.startsWith(term))) {
    score = 75;
  }
  // 4. Contains the search term (medium score)
  else if (field.includes(term)) {
    score = 65;
  }
  // 5. Fuzzy matching using edit distance (for typos)
  else {
    const editDistance = calculateEditDistance(term, field);
    const maxLength = Math.max(term.length, field.length);
    
    // Calculate similarity as percentage (higher is better)
    const similarity = Math.max(0, (maxLength - editDistance) / maxLength);
    
    // Only consider it a match if similarity is above threshold
    if (similarity > 0.6) { // 60% similarity threshold
      score = Math.round(similarity * 60); // Scale to 0-60 range
    }
    
    // Additional check for partial word matches
    const termWords = term.split(' ');
    const fieldWords = field.split(' ');
    let wordMatches = 0;
    
    for (const termWord of termWords) {
      for (const fieldWord of fieldWords) {
        if (fieldWord.includes(termWord) || termWord.includes(fieldWord)) {
          wordMatches++;
          break;
        }
      }
    }
    
    if (wordMatches > 0) {
      const wordScore = Math.round((wordMatches / termWords.length) * 50);
      score = Math.max(score, wordScore);
    }
  }
  
  return score;
}

// Simple edit distance calculation (Levenshtein distance)
function calculateEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

// Main search function with performance optimizations
export async function searchLocations(
  searchTerm: string, 
  maxResults: number = 20, 
  options?: { types?: string[], includeFacilities?: boolean }
): Promise<SearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const cacheKey = `search-${searchTerm.toLowerCase().trim()}-${maxResults}-${JSON.stringify(options || {})}`;
  
  // Check cache first
  if (searchResultsCache.has(cacheKey)) {
    return searchResultsCache.get(cacheKey)!;
  }

  console.log(`Searching for: "${searchTerm}"`); // Debug log

  try {
    // Load search indices for all boundary types, healthcare facilities, and SA2 postcode data
    // Handle SA2 postcode data separately with error handling to prevent page failures
    let sa2PostcodeResults: SearchResult[] = [];
    try {
      sa2PostcodeResults = await buildSA2PostcodeSearchIndex();
    } catch (sa2Error) {
      console.warn('SA2 postcode search unavailable:', sa2Error);
      // Continue without SA2 postcode search - other functionality remains working
    }

    const [lgaResults, sa2Results, sa3Results, sa4Results, postcodeResults, localityResults, facilityResults] = await Promise.all([
      buildSearchIndex('lga'),
      buildSearchIndex('sa2'),
      buildSearchIndex('sa3'),
      buildSearchIndex('sa4'),
      buildSearchIndex('postcode'),
      buildSearchIndex('locality'),
      buildHealthcareFacilityIndex(),
    ]);

    // ✅ FIXED: Filter out SA2 API-based results that don't have coordinates
    // Only include results that have center coordinates for navigation
    const sa2PostcodeResultsWithCoords = sa2PostcodeResults.filter(result => 
      result.center && result.center.length === 2 && 
      typeof result.center[0] === 'number' && typeof result.center[1] === 'number'
    );

    console.log(`🔧 FIX: Filtered SA2 postcode results from ${sa2PostcodeResults.length} to ${sa2PostcodeResultsWithCoords.length} (removed results without coordinates)`);

    // Combine all results, using filtered SA2 postcode results
    let allResults = [
      ...lgaResults,
      ...sa2Results,        // ✅ GeoJSON-based SA2 results with coordinates
      ...sa3Results,
      ...sa4Results,
      ...postcodeResults,
      ...localityResults,
      ...facilityResults,
      ...sa2PostcodeResultsWithCoords,  // ✅ Only SA2 API results with coordinates (likely empty)
    ];

    // Apply filtering based on options
    if (options?.types) {
      allResults = allResults.filter(result => options.types!.includes(result.type));
    }
    
    if (options?.includeFacilities === false) {
      allResults = allResults.filter(result => result.type !== 'facility');
    }

    console.log(`Total searchable items: ${allResults.length}`); // Debug log

    // Calculate relevance scores and filter
    const scoredResults = allResults
      .map(result => ({
        ...result,
        score: calculateRelevanceScore(searchTerm, result)
      }))
      .filter(result => result.score > 0) // Only include results with some relevance
      .sort((a, b) => {
        // Sort by relevance score (highest first), then by type preference
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If scores are equal, prefer localities and postcodes for text searches
        const isNumericSearch = /^\d+$/.test(searchTerm.trim());
        if (!isNumericSearch) {
          const aIsLocality = a.type === 'locality';
          const bIsLocality = b.type === 'locality';
          if (aIsLocality !== bIsLocality) {
            return bIsLocality ? 1 : -1;
          }
        }
        return 0;
      })
      .slice(0, maxResults); // Limit results

    console.log(`Found ${scoredResults.length} matching results`); // Debug log
    if (scoredResults.length > 0) {
      console.log('Top results:', scoredResults.slice(0, 3).map(r => ({ name: r.name, code: r.code, type: r.type, score: r.score })));
    }

    // Cache the results
    searchResultsCache.set(cacheKey, scoredResults);

    return scoredResults;
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
}

// Search suggestions for autocomplete
export async function getLocationSuggestions(searchTerm: string): Promise<string[]> {
  const results = await searchLocations(searchTerm, 10);
  return results.map(result => {
    if (result.code && result.name !== result.code) {
      return `${result.name} (${result.code})`;
    }
    return result.name;
  });
}

// Get location details by name for map navigation
export async function getLocationByName(
  locationName: string, 
  options?: { types?: string[], includeFacilities?: boolean }
): Promise<SearchResult | null> {
  await buildSa2Index(); // Ensure SA2 index is built

  // 1) Exact SA2 code match first (critical change for SA2 ID lookup)
  if ((!options?.types || options.types.includes('sa2')) && looksLikeSa2Code(locationName)) {
    const hit = getSa2ByCode(locationName.trim());
    if (hit) {
      console.log(`🎯 Exact SA2 code match found: ${locationName} → ${hit.name}`); // Debug log
      return hit;
    }
  }

  // 2) Fallback to existing fuzzy search (names, codes, facilities, etc.)
  const results = await searchLocations(locationName, 1, options);
  return results.length > 0 ? results[0] : null;
}

// Create search results from SA2 data including postcode and locality information
export function createSA2PostcodeSearchResults(sa2Data: Record<string, any>): SearchResult[] {
  const searchResults: SearchResult[] = [];

  console.log(`Creating postcode search results from ${Object.keys(sa2Data).length} SA2 regions...`);

  // Process each SA2 region
  Object.entries(sa2Data).forEach(([sa2Id, sa2Info]: [string, any]) => {
    if (sa2Info.postcode_data && Array.isArray(sa2Info.postcode_data)) {
      // Create search results for each locality in this SA2
      sa2Info.postcode_data.forEach((postcodeItem: any, index: number) => {
        const { Locality, Post_Code } = postcodeItem;
        
        if (Locality && Post_Code) {
          // Create a locality search result
          const localityResult: SearchResult = {
            id: `sa2-locality-${sa2Id}-${index}`,
            name: Locality,
            area: `${Locality} (SA2: ${sa2Info.sa2Name})`,
            code: sa2Id, // Use SA2 ID as the code so we can map back to analytics data
            type: 'locality',
            score: 0, // Will be calculated during search
            // Include postcode information for additional context
            address: `Postcode ${Post_Code}`,
            state: sa2Info.STATE_NAME_2021,
            bounds: undefined,
            center: undefined
          };

          searchResults.push(localityResult);

          // Also create a postcode search result if we haven't seen this postcode in this SA2 yet
          const existingPostcodeResult = searchResults.find(
            result => result.type === 'postcode' && 
                     result.name === Post_Code && 
                     result.code === sa2Id
          );

          if (!existingPostcodeResult) {
            const postcodeResult: SearchResult = {
              id: `sa2-postcode-${sa2Id}-${Post_Code}`,
              name: Post_Code,
              area: `${Post_Code} (SA2: ${sa2Info.sa2Name})`,
              code: sa2Id, // Use SA2 ID as the code so we can map back to analytics data
              type: 'postcode',
              score: 0, // Will be calculated during search
              address: `Includes ${Locality}`,
              state: sa2Info.STATE_NAME_2021,
              bounds: undefined,
              center: undefined
            };

            searchResults.push(postcodeResult);
          }
        }
      });
    }
  });

  console.log(`Created ${searchResults.length} postcode/locality search results`);
  return searchResults;
}

// Optimized function to get SA2 coordinates directly without building search indices
export async function getSA2Coordinates(): Promise<Array<{ id: string; name: string; code: string; center: [number, number] }>> {
  const cacheKey = 'sa2-coordinates';
  
  // Return cached coordinates if available
  if (coordinatesCache.has(cacheKey)) {
    return coordinatesCache.get(cacheKey)!;
  }

  console.log('Loading SA2 coordinates directly from API...'); // Debug log

  try {
    // Only try to load SA2 data if we're in a browser context
    if (typeof window === 'undefined') {
      console.log('Server context - skipping SA2 coordinates loading');
      return [];
    }

    // Load SA2 data from the API
    const response = await fetch('/api/sa2');
    if (!response.ok) {
      console.error('Failed to load SA2 data for coordinates:', response.status);
      return [];
    }

    const apiData = await response.json();
    if (!apiData.success) {
      console.error('SA2 API returned error:', apiData.error);
      return [];
    }

    const sa2Data = apiData.data;
    const coordinates: Array<{ id: string; name: string; code: string; center: [number, number] }> = [];

    // Process each SA2 region to extract coordinates
    Object.entries(sa2Data).forEach(([sa2Id, sa2Info]: [string, any]) => {
      // For now, we'll use a simple approach to get coordinates
      // In a real implementation, you'd want to have actual coordinates in your data
      // For this fix, we'll skip coordinates since they're not in the current data structure
      // This prevents the expensive search index building
      
      coordinates.push({
        id: `sa2-${sa2Id}`,
        name: sa2Info.sa2Name || sa2Id,
        code: sa2Id,
        center: [0, 0] // Placeholder coordinates - update with actual data when available
      });
    });

    console.log(`Loaded ${coordinates.length} SA2 coordinates`); // Debug log
    
    // Cache the coordinates with correct type
    coordinatesCache.set(cacheKey, coordinates);
    
    return coordinates;
  } catch (error) {
    console.error('Error loading SA2 coordinates:', error);
    return [];
  }
}

// Build SA2 code index for fast exact SA2 code → geometry lookup
export async function buildSa2Index(): Promise<void> {
  if (SA2_BY_CODE) return; // Already built

  console.log('🔧 Building SA2 code index for exact lookups...'); // Debug log

  try {
    // Load SA2 boundary data using SA2_simplified.geojson (matches map components)
    const supabaseUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/SA2_simplified.geojson';
    const response = await fetch(supabaseUrl);
    
    if (!response.ok) {
      console.error(`Failed to load SA2_simplified.geojson: ${response.status}`);
      return;
    }

    const sa2Data: GeoJSONData = await response.json();
    SA2_BY_CODE = new Map();

    for (const feature of sa2Data.features) {
      const props = feature.properties ?? {};
      const code = String(props.sa2_code_2021 ?? props.SA2_CODE21 ?? '');
      const name = String(props.sa2_name_2021 ?? props.SA2_NAME21 ?? '');

      if (!code) continue;

      // Calculate geometry bounds and center from bbox or geometry
      let center: [number, number] | undefined;
      let bounds: [number, number, number, number] | undefined;

      // Prefer precomputed bbox if available
      if (feature.bbox && Array.isArray(feature.bbox) && feature.bbox.length === 4) {
        const bbox = feature.bbox as [number, number, number, number];
        bounds = [bbox[1], bbox[0], bbox[3], bbox[2]]; // Convert [minLng, minLat, maxLng, maxLat] to bounds format
        center = [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2] as [number, number];
      } else {
        // Calculate from geometry if no bbox
        const geometryResult = calculateGeometryBounds(feature.geometry);
        if (geometryResult) {
          center = geometryResult.center;
          bounds = geometryResult.bounds;
        }
      }

      if (center && bounds) {
        SA2_BY_CODE.set(code, {
          id: `sa2-${code}`,
          name: name || code,
          area: name || code,
          code,
          type: 'sa2',
          center,
          bounds,
          score: 1.0
        });
      }
    }

    console.log(`✅ SA2 code index built: ${SA2_BY_CODE.size} entries`); // Debug log
    
    // Debug validation for SA2 ID 205031093 specifically
    const testSa2Id = '205031093';
    if (SA2_BY_CODE.has(testSa2Id)) {
      const testResult = SA2_BY_CODE.get(testSa2Id);
      console.log(`🎯 DEBUG: SA2 ID ${testSa2Id} found in index:`, testResult);
    } else {
      console.log(`⚠️ DEBUG: SA2 ID ${testSa2Id} NOT found in index`);
    }
  } catch (error) {
    console.error('❌ Error building SA2 code index:', error);
    SA2_BY_CODE = new Map(); // Initialize empty to prevent repeated attempts
  }
}

// Get SA2 by exact code lookup (O(1) performance)
export function getSa2ByCode(code: string): SearchResult | null {
  if (!SA2_BY_CODE) {
    console.log('⚠️ DEBUG: SA2 code index not built yet, returning null');
    return null;
  }
  
  const result = SA2_BY_CODE.get(code) ?? null;
  console.log(`🔍 DEBUG: SA2 code lookup for "${code}":`, result ? 'FOUND' : 'NOT FOUND');
  
  return result;
}

// Helper to detect if a search term looks like an SA2 code
function looksLikeSa2Code(term: string): boolean {
  return /^\d{8,9}$/.test(term.trim());
}

// Optimized postcode search that uses cached results
let cachedPostcodeSearchResults: SearchResult[] | null = null;
let cachedPostcodeSearchData: Record<string, any> | null = null;

export function getOptimizedPostcodeSearchResults(sa2Data: Record<string, any>): SearchResult[] {
  // Return cached results if SA2 data hasn't changed
  if (cachedPostcodeSearchResults && cachedPostcodeSearchData === sa2Data) {
    return cachedPostcodeSearchResults;
  }

  console.log('Building optimized postcode search results...'); // Debug log

  const searchResults: SearchResult[] = [];

  // Process each SA2 region (only if data has changed)
  Object.entries(sa2Data).forEach(([sa2Id, sa2Info]: [string, any]) => {
    if (sa2Info.postcode_data && Array.isArray(sa2Info.postcode_data)) {
      // Create search results for each locality in this SA2
      sa2Info.postcode_data.forEach((postcodeItem: any, index: number) => {
        const { Locality, Post_Code } = postcodeItem;
        
        if (Locality && Post_Code) {
          // Create a locality search result
          const localityResult: SearchResult = {
            id: `sa2-locality-${sa2Id}-${index}`,
            name: Locality,
            area: `${Locality} (SA2: ${sa2Info.sa2Name})`,
            code: sa2Id,
            type: 'locality',
            score: 0,
            address: `Postcode ${Post_Code}`,
            state: sa2Info.STATE_NAME_2021,
            bounds: undefined,
            center: undefined
          };

          searchResults.push(localityResult);

          // Also create a postcode search result if we haven't seen this postcode in this SA2 yet
          const existingPostcodeResult = searchResults.find(
            result => result.type === 'postcode' && 
                     result.name === Post_Code && 
                     result.code === sa2Id
          );

          if (!existingPostcodeResult) {
            const postcodeResult: SearchResult = {
              id: `sa2-postcode-${sa2Id}-${Post_Code}`,
              name: Post_Code,
              area: `${Post_Code} (SA2: ${sa2Info.sa2Name})`,
              code: sa2Id,
              type: 'postcode',
              score: 0,
              address: `Includes ${Locality}`,
              state: sa2Info.STATE_NAME_2021,
              bounds: undefined,
              center: undefined
            };

            searchResults.push(postcodeResult);
          }
        }
      });
    }
  });

  console.log(`Built ${searchResults.length} optimized postcode/locality search results`); // Debug log
  
  // Cache the results
  cachedPostcodeSearchResults = searchResults;
  cachedPostcodeSearchData = sa2Data;
  
  return searchResults;
} 