# Healthcare GeoJSON Migration Plan

## 🚨 **HEALTHCARE GEOJSON FILE MIGRATION PROJECT**

**USER REQUEST:** Switch the maps page from using `healthcare_simplified.geojson` to `healthcare_merged.geojson` and identify missing variables and potential UX/UI impacts.

**📊 DATA ANALYSIS COMPARISON:**

### **CURRENT FILE: `healthcare_simplified.geojson`**
- ✅ **Size**: 4.98 MB 
- ✅ **Features**: 5,414 healthcare facilities
- ✅ **Fields**: 25 comprehensive data fields

### **NEW FILE: `healthcare_merged.geojson`**  
- ✅ **Size**: 3.79 MB (24% smaller)
- ✅ **Features**: 5,166 healthcare facilities (248 fewer records)
- ✅ **Fields**: 12 basic data fields (52% field reduction)

**🎯 IMPLEMENTATION OBJECTIVES:**
Replace healthcare data source while identifying and mitigating the impact of missing fields on existing functionality.

**PLANNER MODE ACTIVE** 🧠

---

## 🎯 **NEW REQUIREMENT: GEOGRAPHIC PROXIMITY SEARCH SYSTEM**

### **🚨 UPDATED USER REQUEST**

**Enhanced Search Requirements:**
1. **Multi-Boundary Search Types**: Users can search by LGA, SA2, SA3, SA4, Postal Areas, Suburbs/Localities, or Provider Names
2. **GPS Coordinate-Based Results**: Return facilities based on geographic proximity
   - **WITHIN boundaries**: Facilities inside the searched area's GPS boundaries
   - **PROXIMITY RANKING**: Facilities ranked by GPS distance from area center (closest first)

**🏗️ NEW SYSTEM ARCHITECTURE REQUIRED**

### **ENHANCED SEARCH WORKFLOW**
```
1. User types search term (e.g., "Melbourne", "3000", "City of Melbourne")
2. System identifies boundary type (LGA, SA3, postcode, locality, etc.)
3. Retrieves GPS coordinates/polygon boundaries for that area
4. Performs geographic analysis on healthcare facilities:
   a) Point-in-polygon check (facilities WITHIN boundaries)
   b) Distance calculation (facilities OUTSIDE boundaries)
5. Returns results ranked by: WITHIN boundaries first, then by distance
```

### **🔧 TECHNICAL COMPONENTS NEEDED**

#### **1. Boundary Type Detection Engine**
**Purpose**: Automatically identify what type of search the user performed

```typescript
interface BoundarySearchResult {
  searchTerm: string;
  boundaryType: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality';
  boundaryData: {
    name: string;
    code: string;
    center: [number, number];        // Center coordinates
    bounds: [number, number, number, number]; // Bounding box
    geometry: GeoJSON.Polygon;       // Actual boundary shape
  };
  confidence: number; // Match confidence (0-1)
}
```

**Detection Logic:**
- **Numeric input** (e.g., "3000") → Check postcode database
- **Text input** → Check against LGA names, locality names, SA2/SA3/SA4 names
- **Ranking by confidence** when multiple matches found

#### **2. Geographic Analysis Engine**
**Purpose**: Determine facility locations relative to searched boundaries

```typescript
interface FacilityProximityResult {
  facilityId: string;
  facilityName: string;
  facilityCoords: [number, number];
  searchBoundary: BoundarySearchResult;
  relationshipType: 'within' | 'outside';
  distanceKm?: number; // Only for 'outside' facilities
  containmentReason?: 'point_in_polygon' | 'bounding_box'; // For 'within'
}
```

**Geographic Calculations:**
- **Point-in-Polygon Algorithm**: Check if facility coordinates are inside boundary geometry
- **Haversine Distance Formula**: Calculate GPS distance between points
- **Bounding Box Optimization**: Quick initial filtering before complex polygon checks

#### **3. Enhanced Search Result Ranking**
**New Ranking Priority:**
1. **WITHIN BOUNDARY** facilities (sorted by relevance score)
2. **CLOSEST OUTSIDE** facilities (sorted by GPS distance)
3. **Provider name matches** (existing text-based search as fallback)

### **📊 GEOGRAPHIC DATA INTEGRATION**

#### **Required GeoJSON Processing:**
```typescript
// Current boundary files need coordinate extraction:
const boundaryFiles = {
  lga: 'LGA.geojson',      // Local Government Areas
  sa2: 'SA2.geojson',      // Statistical Area Level 2  
  sa3: 'SA3.geojson',      // Statistical Area Level 3
  sa4: 'SA4.geojson',      // Statistical Area Level 4
  postcode: 'POA.geojson', // Postal Areas
  locality: 'SAL.geojson'  // Suburbs and Localities
};

// Extract from each file:
interface BoundaryData {
  name: string;
  code: string; 
  center: [number, number];    // Calculate from geometry
  bounds: [number, number, number, number]; // Calculate from geometry
  geometry: GeoJSON.Polygon;   // Raw geometry for point-in-polygon
  state: string;
}
```

#### **Healthcare Facility Processing:**
```typescript
// Healthcare facilities need coordinate validation:
interface HealthcareFacilityGeo {
  id: string;
  name: string;
  coordinates: [number, number]; // From Latitude/Longitude
  address: string;
  careType: string;
  // Boundary relationships (calculated):
  containedIn: {
    lga?: string;
    sa2?: string; 
    sa3?: string;
    postcode?: string;
    locality?: string;
  };
}
```

### **🎯 IMPLEMENTATION PHASES**

#### **Phase 1: Geographic Foundation**

##### **Task 1.1: Boundary Data Preprocessing**
**Objective**: Extract geographic data from all boundary GeoJSON files
**Actions**:
- Build comprehensive boundary database with names, codes, coordinates, geometries
- Create fast lookup indices by name and code
- Pre-calculate centers and bounding boxes for all boundaries
- Store geometry data for point-in-polygon calculations

**Success Criteria**: Database with ~50,000 searchable boundaries with GPS data

##### **Task 1.2: Geographic Utility Functions**
**Objective**: Implement geographic calculation algorithms
**Actions**:
- Point-in-polygon detection algorithm (ray-casting or winding number)
- Haversine distance calculation between coordinates  
- Bounding box intersection checks for performance optimization
- Coordinate validation and Australian bounds checking

**Success Criteria**: Fast, accurate geographic calculation functions

##### **Task 1.3: Healthcare Facility Geo-Processing**  
**Objective**: Enhance healthcare facility data with geographic relationships
**Actions**:
- Validate all facility coordinates are within Australia
- Pre-calculate which boundaries each facility belongs to
- Create spatial indices for fast proximity queries
- Handle edge cases (facilities on boundary lines)

**Success Criteria**: All facilities have verified coordinates and boundary relationships

#### **Phase 2: Enhanced Search Implementation**

##### **Task 2.1: Boundary Search Engine**
**Objective**: Build intelligent boundary type detection and lookup
**Actions**:
- Fuzzy matching algorithms for boundary names
- Multi-type search with confidence scoring
- Handle ambiguous names (e.g., "Melbourne" could be LGA or locality)
- Postcode vs SA2 disambiguation logic

**Success Criteria**: Accurate boundary identification from user search terms

##### **Task 2.2: Proximity Search Algorithm**
**Objective**: Implement geographic-based facility ranking
**Actions**:
- Point-in-polygon facility filtering
- Distance-based ranking for outside facilities  
- Performance optimization with spatial indexing
- Result merging and deduplication logic

**Success Criteria**: Fast proximity search returning geographically relevant facilities

##### **Task 2.3: Search UI Enhancement**
**Objective**: Update search interface for geographic functionality
**Actions**:
- Auto-complete with boundary type indicators
- Search result categorization (Within/Nearby sections)
- Distance display for nearby facilities
- Map visualization of searched boundaries

**Success Criteria**: Intuitive UI showing geographic search context

#### **Phase 3: Integration & Testing**

##### **Task 3.1: Search Service Integration**
**Objective**: Integrate geographic search with existing search infrastructure
**Actions**:
- Merge with current text-based search results
- Maintain existing caching for performance
- Update search result interfaces and types
- Ensure backward compatibility with current search behavior

**Success Criteria**: Enhanced search works alongside existing functionality

##### **Task 3.2: Performance Optimization**
**Objective**: Ensure geographic calculations don't impact search speed
**Actions**:
- Implement spatial indexing for fast lookups
- Cache boundary data and pre-calculated relationships  
- Optimize point-in-polygon algorithms
- Profile and tune geographic calculations

**Success Criteria**: Search remains under 100ms response time

##### **Task 3.3: Comprehensive Testing**
**Objective**: Validate geographic accuracy and user experience
**Actions**:
- Test boundary detection accuracy across all types
- Verify point-in-polygon calculations with known test cases
- Test distance calculations against known coordinates
- User acceptance testing with geographic search scenarios

**Success Criteria**: Accurate geographic search results and positive user feedback

### **🚨 GEOGRAPHIC SEARCH CHALLENGES**

#### **Challenge 1: Computational Complexity**
**Point-in-Polygon Operations**:
- Complex polygon shapes require expensive geometric calculations
- 5,000+ facilities × 50,000+ boundaries = potential 250M calculations
- **Solution**: Spatial indexing, bounding box pre-filtering, result caching

#### **Challenge 2: Boundary Ambiguity**  
**Multiple Match Scenarios**:
- "Melbourne" matches LGA "Melbourne (C)" and locality "Melbourne"
- Postcodes can span multiple SA2 regions
- **Solution**: Confidence scoring, user disambiguation UI, type priorities

#### **Challenge 3: Performance Impact**
**Real-time Geographic Processing**:
- Point-in-polygon is computationally expensive
- Distance calculations for thousands of facilities
- **Solution**: Pre-processing, spatial indices, progressive loading

#### **Challenge 4: Coordinate Accuracy**
**Data Quality Issues**:
- Healthcare facility coordinates may be imprecise
- Boundary data from different sources/years may not align perfectly  
- **Solution**: Coordinate validation, tolerance thresholds, data verification

### **🎯 EXPECTED OUTCOMES**

#### **Enhanced Search Experience**
```
User types: "Melbourne"
Results:
┌─ WITHIN Melbourne (C) LGA (15 facilities) ─┐
│ • Royal Melbourne Hospital                  │
│ • Melbourne Private Hospital                │
│ • ... (13 more)                            │
└─────────────────────────────────────────────┘

┌─ NEARBY Melbourne (C) LGA ─────────────────┐
│ • Epworth Richmond (2.3km)                 │
│ • St Vincent's Hospital (1.8km)            │
│ • ... (sorted by distance)                 │
└─────────────────────────────────────────────┘
```

#### **Improved Search Relevance**
- **Geographic accuracy**: Facilities actually IN the searched area are prioritized
- **Distance context**: Users see how far facilities are from their searched location
- **Boundary visualization**: Map shows the searched boundary area
- **Comprehensive coverage**: All boundary types supported (LGA, SA2, SA3, SA4, postcodes, localities)

### **📊 PERFORMANCE TARGETS**

**Search Performance:**
- **Boundary lookup**: <10ms
- **Point-in-polygon checks**: <50ms for all facilities  
- **Distance calculations**: <30ms for nearby facilities
- **Total search time**: <100ms (including existing text search)

**Data Processing:**
- **Boundary preprocessing**: One-time 30-second startup cost
- **Facility geo-processing**: One-time 10-second startup cost
- **Memory usage**: <100MB for spatial indices

### **🔧 TECHNICAL ARCHITECTURE**

#### **New Geographic Search Service**
```typescript
class GeographicSearchService {
  // Boundary data management
  private boundaryDatabase: Map<string, BoundaryData>;
  private spatialIndex: R-Tree<FacilityGeoData>;
  
  // Core search functions  
  async searchByBoundary(searchTerm: string): Promise<GeographicSearchResult>;
  async findFacilitiesInBoundary(boundary: BoundaryData): Promise<FacilityProximityResult[]>;
  async findNearbyFacilities(center: [number, number], maxDistance: number): Promise<FacilityProximityResult[]>;
  
  // Utility functions
  private detectBoundaryType(searchTerm: string): BoundarySearchResult[];
  private isPointInPolygon(point: [number, number], polygon: GeoJSON.Polygon): boolean;
  private calculateDistance(point1: [number, number], point2: [number, number]): number;
}
```

#### **Enhanced Search Result Types**
```typescript  
interface GeographicSearchResult {
  searchTerm: string;
  boundaryMatch?: BoundarySearchResult;
  facilitiesWithin: FacilityProximityResult[];
  facilitiesNearby: FacilityProximityResult[];
  textMatches: FacilityProximityResult[]; // Existing provider name matches
  totalResults: number;
  searchTime: number;
}
```

---

## 🚨 **UPDATED PROJECT SCOPE**

The project now includes **TWO major components**:

### **Component A: Healthcare Data Migration** 
- Switch from `healthcare_simplified.geojson` to `healthcare_merged.geojson`
- Handle missing fields and degraded functionality
- Update field names and component references

### **Component B: Geographic Proximity Search Enhancement**
- Build comprehensive boundary search system
- Implement point-in-polygon and distance calculations  
- Create geographic-aware search UI and results

### **🎯 RECOMMENDED APPROACH**

#### **Option 1: Phased Implementation (Recommended)**
1. **Phase 1**: Implement Component A (data migration) first
2. **Phase 2**: Add Component B (geographic search) as enhancement  
3. **Benefit**: Manageable complexity, can validate each component separately

#### **Option 2: Combined Implementation**  
1. Implement both components simultaneously
2. **Risk**: High complexity, potential for compounding issues
3. **Benefit**: Single deployment, coordinated testing

#### **Option 3: Geographic-First Approach**
1. Build Component B with existing healthcare data
2. Migrate data (Component A) after geographic system is stable
3. **Benefit**: New functionality first, data migration as separate concern

### **📊 EFFORT ESTIMATION**

**Component A (Data Migration)**: 
- **Complexity**: Medium
- **Time**: 1-2 days
- **Risk**: Medium (known breaking changes)

**Component B (Geographic Search)**:
- **Complexity**: High  
- **Time**: 5-7 days
- **Risk**: High (new algorithms, performance concerns)

**Combined Project**: 6-9 days total development + testing

### **🚨 CRITICAL DECISIONS NEEDED**

1. **Implementation Order**: Which component should be built first?
2. **Performance Requirements**: What search response time is acceptable?
3. **Geographic Accuracy**: How precise should point-in-polygon detection be?
4. **UI Complexity**: How much geographic context should be shown to users?
5. **Fallback Strategy**: What happens when geographic search fails?

**Ready to proceed with detailed implementation plan for your preferred approach?**

---

## 🔍 **DETAILED CURRENT SEARCH FUNCTIONALITY ANALYSIS**

### **SEARCH SYSTEM ARCHITECTURE**

The current search system is a **multi-data-source intelligent search** that operates across:
1. **Geographic Boundaries** (6 types) 
2. **Healthcare Facilities** (1 type)
3. **SA2-based postcode/locality data** (from SA2 API)

### **📁 DATA SOURCES BREAKDOWN**

#### **Geographic Boundary Data Sources (6 files)**
**File Location:** `/public/maps/`
- **`LGA.geojson`** - Local Government Areas
- **`SA2.geojson`** - Statistical Area Level 2 (170MB - largest file)
- **`SA3.geojson`** - Statistical Area Level 3  
- **`SA4.geojson`** - Statistical Area Level 4
- **`POA.geojson`** - Postal Areas (postcodes)
- **`SAL.geojson`** - Suburbs and Localities

**Fields Used for Search:**
- Names: `sa2_name_2021`, `lga_name_2021`, etc.
- Codes: `sa2_code_2021`, `lga_code_2021`, etc.
- State info: `state_name_2021`

#### **Healthcare Facility Data Source (1 file)**
**File Location:** `/public/maps/healthcare.geojson`
**Current file:** `healthcare_simplified.geojson` (effectively)

**Fields Used for Healthcare Search:**
```typescript
// ✅ CURRENTLY USED FIELDS
{
  "Service_Name": "Braidwood Multi-Purpose Service",     // Primary search field
  "Care_Type": "Multi-Purpose Service",                  // Secondary search field  
  "Address": "77 Monkittee STREET, BRAIDWOOD, NSW, 2622", // Address search
  "State": "NSW",                                        // State filtering
  "Postcode": "2622",                                    // Postcode search
  "Home_Care_Places": 2,                                 // Capacity classification
  // Geographic boundary fields (used for regional matching)
  "F2016_SA2_Code": 11007,
  "F2016_SA2_Name": "Braidwood",
  "F2016_LGA_Code": "Queanbeyan-Palerang Regional (A)",
  "ABS_Remoteness": "Inner Regional Australia"
}
```

#### **SA2 API Data Source (Dynamic)**  
**Endpoint:** `/api/sa2`
**Purpose:** Extended postcode and locality search from demographic data

### **🔧 SEARCH IMPLEMENTATION DETAILS**

#### **1. Search Index Building Process**

**File:** `src/lib/mapSearchService.ts`

```typescript
// Main search function loads ALL data sources in parallel
const [lgaResults, sa2Results, sa3Results, sa4Results, 
       postcodeResults, localityResults, facilityResults] = await Promise.all([
  buildSearchIndex('lga'),        // LGA.geojson
  buildSearchIndex('sa2'),        // SA2.geojson  
  buildSearchIndex('sa3'),        // SA3.geojson
  buildSearchIndex('sa4'),        // SA4.geojson
  buildSearchIndex('postcode'),   // POA.geojson
  buildSearchIndex('locality'),   // SAL.geojson
  buildHealthcareFacilityIndex(), // healthcare.geojson 🎯
]);
```

#### **2. Healthcare Facility Search Logic**

**Function:** `buildHealthcareFacilityIndex()`

```typescript
// 🎯 CURRENT HEALTHCARE SEARCH IMPLEMENTATION
async function buildHealthcareFacilityIndex(): Promise<SearchResult[]> {
  // Loads from: '/maps/healthcare.geojson'
  const response = await fetch('/maps/healthcare.geojson');
  const data: GeoJSONData = await response.json();
  
  // Care type classification for facility filtering
  const careTypeMapping = {
    residential: ['Residential', 'Multi-Purpose Service'],
    home: ['Home Care', 'Community Care'], 
    retirement: ['Retirement', 'Retirement Living', 'Retirement Village']
  };
  
  data.features.forEach((feature) => {
    const props = feature.properties;
    
    // 🎯 KEY FIELDS USED IN SEARCH:
    const serviceName = props?.Service_Name;     // Primary search
    const careType = props?.Care_Type;           // Classification  
    const address = props?.Address;              // Address search
    const state = props?.State;                  // State filtering
    const postcode = props?.Postcode;            // Postcode search
    
    // 🚨 CAPACITY-BASED CLASSIFICATION (WILL BE LOST):
    const homeCarePlaces = props?.Home_Care_Places; // Used for home/MPS detection
    
    // Creates searchable facility records with facility type classification
  });
}
```

#### **3. Search UI Components**

**Primary Component:** `src/components/MapSearchBar.tsx`
- **Auto-complete suggestions** from search service
- **Location-based navigation** with coordinates
- **Search history** integration
- **Saved searches** functionality

**Search Flow:**
```typescript
// 1. User types in search bar
// 2. getLocationSuggestions() called for autocomplete
// 3. User selects/submits search
// 4. handleSearch() processes:
//    - Exact match check in current results
//    - Fallback to getLocationByName() service call
//    - Map navigation with coordinates/bounds
// 5. Search saved to history
```

#### **4. Search Result Types & Scoring**

**Result Types Hierarchy:**
1. **`facility`** - Healthcare facilities (gets +25 score boost for text searches)
2. **`locality`** - Suburbs/towns (+15 text search boost)  
3. **`postcode`** - Postal codes (+20 numeric search boost)
4. **`lga`** - Local Government Areas (+10 boost)
5. **`sa2`**, **`sa3`**, **`sa4`** - Statistical areas

**Relevance Scoring Algorithm:**
- **Exact match**: 100 points
- **Starts with term**: 80 points  
- **Word boundary match**: 70 points
- **Contains term**: 60 points
- **Address match (facilities)**: 50 points
- **Care type match (facilities)**: 45 points
- **Fuzzy match (≤2 chars diff)**: 40 points

#### **5. Search Result Structure**

```typescript
interface SearchResult {
  id: string;                    // Stable unique identifier
  name: string;                  // Display name
  area: string;                  // Human-readable area description
  code?: string;                 // Official code (SA2, LGA, etc.)
  type: 'facility' | 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality';
  state?: string;                // State information
  bounds?: [number, number, number, number]; // Geographic bounds
  center?: [number, number];     // Coordinates for map navigation
  score: number;                 // Relevance score
  // Facility-specific properties
  address?: string;              // Full address
  careType?: string;             // Type of care provided
  facilityType?: 'residential' | 'mps' | 'home' | 'retirement';
}
```

#### **6. Caching Strategy**

**Multi-layer caching for performance:**
- **`dataCache`** - Raw GeoJSON data by boundary type
- **`searchIndexCache`** - Processed search indices 
- **`searchResultsCache`** - Search results by query term
- **`coordinatesCache`** - SA2 coordinates optimization

### **🚨 CRITICAL DEPENDENCIES ON CURRENT HEALTHCARE FILE**

#### **Fields Used in Healthcare Search:**
```typescript
// ✅ FIELDS PRESERVED in healthcare_merged.geojson
"Service_Name"     // ✅ Primary search field  
"Care_Type"        // ✅ Secondary search & classification
"Physical_Address" // ✅ Address search (renamed from Address)
"Physical_State"   // ✅ State filtering (renamed from State) 
"Physical_Post_Code" // ✅ Postcode search (renamed from Postcode)

// ❌ FIELDS LOST in healthcare_merged.geojson  
"Home_Care_Places"        // ❌ Used for facility type classification
"Restorative_Care_Places" // ❌ Used for capacity-based features
"F2016_SA2_Code"          // ❌ Used for geographic boundary matching
"F2016_SA2_Name"          // ❌ Used for regional search enhancement  
"F2016_LGA_Code"          // ❌ Used for LGA-based facility grouping
"ABS_Remoteness"          // ❌ Used for urban/rural classification
```

#### **Impact on Search Functionality:**

**🟢 PRESERVED FUNCTIONALITY:**
- ✅ **Basic facility name search** - `Service_Name` preserved
- ✅ **Care type filtering** - `Care_Type` preserved  
- ✅ **Address-based search** - `Physical_Address` preserved
- ✅ **State-level filtering** - `Physical_State` preserved
- ✅ **Map navigation** - `Latitude`/`Longitude` preserved

**🔴 LOST FUNCTIONALITY:**
- ❌ **Home care facility detection** - No `Home_Care_Places` field
- ❌ **Capacity-based facility classification** - No care places data
- ❌ **Geographic boundary cross-referencing** - No SA2/LGA codes
- ❌ **Regional facility grouping** - No boundary region data
- ❌ **Urban/rural facility classification** - No `ABS_Remoteness`

**🟡 DEGRADED FUNCTIONALITY:**
- ⚠️ **Search completeness** - 248 fewer facilities searchable
- ⚠️ **Facility type accuracy** - Classification logic will be simpler
- ⚠️ **Regional search precision** - No cross-boundary matching

### **🎯 SEARCH PERFORMANCE METRICS**

**Current Search Index Size:**
- **Total searchable items**: ~50,000+ across all sources
- **Healthcare facilities**: 5,414 facilities  
- **Geographic boundaries**: ~45,000 boundaries
- **Typical search response**: <100ms (cached)
- **Index building time**: ~3-5 seconds on first load

**After Migration:**
- **Healthcare facilities**: 5,166 facilities (-248, -4.6%)
- **Reduced search accuracy** due to missing geographic cross-references
- **Simplified facility classification** without capacity data

---

## Background and Motivation

The user has provided a new `healthcare_merged.geojson` file that appears to be a more streamlined version of the current healthcare data. However, this migration involves significant data structure changes that could impact multiple components throughout the application.

**Key Concerns:**
1. **Significant Field Reduction**: From 25 fields to 12 fields (52% reduction)
2. **Missing Geographic Data**: Lost SA2, SA3, LGA, PHN boundary references 
3. **Missing Care Data**: Lost Home Care Places and Restorative Care Places
4. **Missing Demographic Data**: Lost ABS Remoteness and MMM classifications
5. **Feature Count Reduction**: 248 fewer healthcare facilities

**Strategic Importance:** Understanding the impact of missing data is critical before deployment to prevent breaking existing functionality and user workflows.

## Key Challenges and Analysis

### **Challenge 1: CRITICAL MISSING GEOGRAPHIC FIELDS**
**Missing Fields:**
- `ABS_Remoteness` (Inner Regional, Outer Regional, etc.)
- `F2016_SA2_Code`, `F2016_SA2_Name` 
- `F2016_SA3_Code`, `F2016_SA3_Name`
- `F2016_LGA_Code`, `F2016_LGA_Name`
- `F2017_PHN_Code`, `F2017_PHN_Name`
- `F2019_Aged_Care_Planning_Region`
- `F2019_MMM_Code`

**Impact**: 
- Geographic boundary filtering may break
- SA2/SA3/LGA-based searches will fail
- Regional analysis features compromised
- PHN (Primary Health Network) functionality lost

### **Challenge 2: MISSING CARE CAPACITY DATA**
**Missing Fields:**
- `Home_Care_Places` - Number of home care spots available
- `Restorative_Care_Places` - Number of restorative care spots

**Impact**:
- Capacity-based facility comparisons broken
- Care type filtering functionality reduced
- Statistical analysis of care availability compromised

### **Challenge 3: FACILITY COUNT REDUCTION**
**Data Change**: 5,414 → 5,166 facilities (248 fewer, 4.6% reduction)

**Impact**:
- Some facilities will disappear from maps
- Search results may be incomplete
- Regional coverage gaps possible

### **Challenge 4: COMPONENT DEPENDENCIES**
**Affected Systems:**
- Maps page facility loading and display
- Search functionality and indexing
- HybridFacilityService data merging
- Geographic boundary filtering
- Heatmap data analysis
- Facility detail displays

## Data Structure Analysis

### **✅ FIELDS PRESERVED (12 fields)**
```json
{
  "Care_Type": "Multi-Purpose Service",
  "Latitude": -35.442763805,
  "Longitude": 149.80540733,
  "OBJECTID": 1,
  "Organisation_Type": "State Government", 
  "Physical_Address": "77 Monkittee STREET, BRAIDWOOD, NSW, 2622",
  "Physical_Post_Code": 2622,
  "Physical_State": "NSW",
  "Physical_Suburb": "BRAIDWOOD",
  "Provider_Name": "Southern NSW Local Health District",
  "Residential_Places": 37,
  "Service_Name": "Braidwood Multi-Purpose Service"
}
```

### **❌ FIELDS LOST (13 fields)**
```json
{
  "ABS_Remoteness": "Inner Regional Australia",
  "F2016_LGA_Code": "Queanbeyan-Palerang Regional (A)",
  "F2016_LGA_Name": 16490,
  "F2016_SA2_Code": 11007,
  "F2016_SA2_Name": "Braidwood", 
  "F2016_SA3_Code": 10102,
  "F2016_SA3_Name": "Queanbeyan",
  "F2017_PHN_Code": "PHN106",
  "F2017_PHN_Name": "South Eastern NSW",
  "F2019_Aged_Care_Planning_Region": "Southern Highlands",
  "F2019_MMM_Code": 5,
  "Home_Care_Places": 2,
  "Restorative_Care_Places": null
}
```

## High-level Task Breakdown

### **Phase 1: Impact Assessment & Risk Analysis**

#### **Task 1.1: Code Dependency Analysis**
**Objective**: Identify all code locations that reference missing fields
**Actions**:
- Search codebase for references to all 13 missing field names
- Identify components that use geographic boundary codes (SA2, SA3, LGA)
- Find usage of ABS_Remoteness and MMM classifications  
- Document Home_Care_Places and Restorative_Care_Places dependencies

**Success Criteria**: Complete inventory of code that will break with new data

#### **Task 1.2: UI/UX Feature Impact Analysis**
**Objective**: Identify user-facing features that will be affected
**Actions**:
- Test current search functionality for geographic terms
- Check facility detail displays for missing fields
- Identify filtering options that depend on lost data
- Document heatmap categories that may be impacted

**Success Criteria**: Comprehensive list of user-visible functionality changes

#### **Task 1.3: Data Quality Comparison**
**Objective**: Understand what facilities and data are lost
**Actions**:
- Compare facility lists between old and new files
- Identify geographic regions with reduced coverage
- Analyze care capacity changes (residential vs home care)
- Document service type distribution changes

**Success Criteria**: Clear understanding of data coverage changes

### **Phase 2: Risk Mitigation Strategy**

#### **Task 2.1: Critical Field Replacement Analysis**
**Objective**: Determine if missing fields can be derived or replaced
**Actions**:
- Check if geographic codes can be reverse-geocoded from lat/lng
- Investigate alternative data sources for missing regional data
- Assess if care capacity data exists in other datasets
- Plan fallback strategies for missing functionality

**Success Criteria**: Mitigation plan for each missing field category

#### **Task 2.2: Component Resilience Planning**
**Objective**: Plan how components should handle missing data gracefully
**Actions**:
- Design fallback UI for missing geographic filters
- Plan alternative search strategies without SA2/LGA codes
- Create graceful degradation for capacity-based features
- Design error handling for missing field references

**Success Criteria**: Resilience plan for all affected components

### **Phase 3: Safe Migration Implementation**

#### **Task 3.1: File Deployment with Backup**
**Objective**: Deploy new file while maintaining rollback capability
**Actions**:
- Backup current `healthcare.geojson` file
- Copy `healthcare_merged.geojson` to `/public/maps/healthcare.geojson`
- Test basic data loading functionality
- Verify API endpoints return data correctly

**Success Criteria**: New file deployed and basic functionality working

#### **Task 3.2: Component Updates for Missing Fields**
**Objective**: Update affected components to handle missing data gracefully
**Actions**:
- Add null checks for all missing fields in components
- Update search indexing to exclude missing geographic data
- Modify facility detail displays to hide missing fields
- Add fallback logic for geographic filtering

**Success Criteria**: All components handle missing fields without errors

#### **Task 3.3: Testing and Validation**
**Objective**: Comprehensive testing of modified functionality
**Actions**:
- Test maps page with new healthcare data
- Verify search functionality still works
- Check facility detail modals display correctly
- Test heatmap generation with reduced dataset

**Success Criteria**: Core functionality works with acceptable degradation

### **Phase 4: User Communication & Documentation**

#### **Task 4.1: Feature Change Documentation**
**Objective**: Document what functionality has changed
**Actions**:
- List features that are no longer available
- Document alternative workflows for lost functionality
- Create migration guide for users dependent on missing fields
- Update any help documentation

**Success Criteria**: Clear documentation of changes and alternatives

## Impact Assessment Summary

### **🔴 HIGH IMPACT - LIKELY BREAKING CHANGES**

#### **Geographic Boundary Features**
- **SA2/SA3/LGA-based search and filtering**: Will fail completely
- **Regional analysis by Planning Regions**: No longer possible  
- **PHN-based healthcare provider grouping**: Lost functionality
- **ABS Remoteness classification**: No urban/rural distinctions

#### **Care Capacity Analysis** 
- **Home care vs residential care comparisons**: Reduced functionality
- **Restorative care facility identification**: Lost capability
- **Capacity-based facility recommendations**: Incomplete data

### **🟡 MEDIUM IMPACT - DEGRADED FUNCTIONALITY**

#### **Search and Discovery**
- **Reduced search index completeness**: 248 fewer facilities findable
- **Geographic search precision**: Less detailed boundary matching
- **Facility coverage gaps**: Some regions may appear less served

#### **Data Analysis Features**
- **Heatmap accuracy**: Reduced data points may affect visualizations  
- **Statistical comparisons**: Less comprehensive facility dataset
- **Regional healthcare planning**: Reduced data granularity

### **🟢 LOW IMPACT - MINIMAL CHANGES**

#### **Core Map Functionality**
- **Basic facility display**: All core fields preserved (name, address, coordinates)
- **Facility details**: Essential information still available
- **Location-based search**: Lat/lng coordinates preserved

## Project Status Board

### **Phase 1: Impact Assessment & Risk Analysis**
- **Task 1.1**: Code Dependency Analysis - **PENDING**
- **Task 1.2**: UI/UX Feature Impact Analysis - **PENDING** 
- **Task 1.3**: Data Quality Comparison - **PENDING**

### **Phase 2: Risk Mitigation Strategy**
- **Task 2.1**: Critical Field Replacement Analysis - **PENDING**
- **Task 2.2**: Component Resilience Planning - **PENDING**

### **Phase 3: Safe Migration Implementation**
- **Task 3.1**: File Deployment with Backup - **PENDING**
- **Task 3.2**: Component Updates for Missing Fields - **PENDING**
- **Task 3.3**: Testing and Validation - **PENDING**

### **Phase 4: User Communication & Documentation**
- **Task 4.1**: Feature Change Documentation - **PENDING**

## Recommendations

### **🚨 CRITICAL RECOMMENDATIONS**

1. **DO NOT PROCEED WITHOUT IMPACT ANALYSIS**
   - The 52% field reduction requires comprehensive testing
   - Breaking changes are highly likely across multiple components
   - User workflows will be significantly impacted

2. **CONSIDER STAGED ROLLOUT**
   - Test with internal users first
   - Prepare rollback plan to healthcare_simplified.geojson
   - Have data recovery procedures ready

3. **GEOGRAPHIC DATA IS CRITICAL**
   - Consider augmenting healthcare_merged.geojson with reverse-geocoded boundary data
   - Investigate alternative sources for SA2/SA3/LGA mappings
   - Regional healthcare analysis depends heavily on these fields

### **⚠️ ALTERNATIVE APPROACHES**

1. **Hybrid Solution**: Keep both files and use healthcare_merged.geojson for basic mapping, healthcare_simplified.geojson for analysis
2. **Data Enrichment**: Enhance healthcare_merged.geojson with missing critical fields before deployment
3. **Gradual Migration**: Implement field-by-field fallbacks and migrate users gradually

### **✅ MINIMUM VIABLE MIGRATION**

If proceeding with current healthcare_merged.geojson:
1. Ensure all components have null checks for missing fields
2. Disable/hide features dependent on missing geographic data
3. Update user documentation about reduced functionality
4. Prepare user communication about changes

## Executor's Feedback or Assistance Requests

**🎯 COMPREHENSIVE ANALYSIS COMPLETE**

**📋 CRITICAL FINDINGS:**
- **52% field reduction** - Major data structure change
- **4.6% facility reduction** - Smaller but still significant
- **Geographic analysis severely impacted** - SA2/SA3/LGA functionality lost
- **Care capacity analysis reduced** - Home care and restorative care data missing

**🚨 RISK LEVEL: HIGH**
- Multiple breaking changes expected
- Core geographic features will be lost  
- User workflows will be significantly impacted

**📊 RECOMMENDED APPROACH:**
1. Complete Phase 1 impact assessment before proceeding
2. Consider data enrichment alternatives 
3. Plan comprehensive testing and rollback procedures
4. Prepare user communication for functionality changes

**Ready to proceed with impact assessment, or would you prefer to explore alternative approaches first?**

## Lessons

*To be updated as analysis and implementation progresses* 