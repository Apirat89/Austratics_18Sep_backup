interface SearchResult {
  id: string;
  name: string;
  code?: string;
  type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality';
  state?: string;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  center?: [number, number]; // [lng, lat]
  score: number; // Relevance score for sorting
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: any;
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
    const response = await fetch(`/maps/${fileName}`);
    
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
          
          searchResults.push({
            id: `${type}-${index}`,
            name: name.trim(),
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

// Calculate relevance score based on search term
function calculateRelevanceScore(searchTerm: string, result: SearchResult): number {
  const term = searchTerm.toLowerCase().trim();
  const name = result.name.toLowerCase();
  const code = result.code?.toLowerCase() || '';
  
  let score = 0;

  // Exact matches get highest score
  if (name === term || code === term) {
    score = 100;
  }
  // Starts with search term
  else if (name.startsWith(term) || code.startsWith(term)) {
    score = 80;
  }
  // Contains the search term
  else if (name.includes(term) || code.includes(term)) {
    score = 60;
  }
  // Word boundary matches (e.g., "north sydney" matches "North Sydney")
  else if (name.split(' ').some(word => word.startsWith(term))) {
    score = 70;
  }
  // Fuzzy matching for typos (simple)
  else if (calculateEditDistance(term, name) <= 2 || calculateEditDistance(term, code) <= 1) {
    score = 40;
  }

  // Boost score for certain boundary types and search patterns
  if (result.type === 'locality') {
    // Boost localities for text-based searches (people often search by suburb/town name)
    if (!/^\d+$/.test(term)) {
      score += 15; // Text searches likely looking for localities
    } else {
      score += 5; // Still boost slightly for numeric searches
    }
  } else if (result.type === 'postcode') {
    // Give extra boost for postcode searches with numeric terms
    if (/^\d+$/.test(term)) {
      score += 20; // Numeric searches likely looking for postcodes
    } else {
      score += 5; // Still boost postcodes slightly
    }
  }
  if (result.type === 'lga') score += 10; // LGAs are commonly searched
  
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
export async function searchLocations(searchTerm: string, maxResults: number = 20): Promise<SearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const cacheKey = `search-${searchTerm.toLowerCase().trim()}-${maxResults}`;
  
  // Check cache first
  if (searchResultsCache.has(cacheKey)) {
    return searchResultsCache.get(cacheKey)!;
  }

  console.log(`Searching for: "${searchTerm}"`); // Debug log

  try {
    // Load search indices for all boundary types using standard GeoJSON approach
    const [lgaResults, sa2Results, sa3Results, sa4Results, postcodeResults, localityResults] = await Promise.all([
      buildSearchIndex('lga'),
      buildSearchIndex('sa2'),
      buildSearchIndex('sa3'),
      buildSearchIndex('sa4'),
      buildSearchIndex('postcode'),
      buildSearchIndex('locality'),
    ]);

    // Combine all results
    const allResults = [
      ...lgaResults,
      ...sa2Results,
      ...sa3Results,
      ...sa4Results,
      ...postcodeResults,
      ...localityResults,
    ];

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
export async function getLocationByName(locationName: string): Promise<SearchResult | null> {
  const results = await searchLocations(locationName, 1);
  return results.length > 0 ? results[0] : null;
} 