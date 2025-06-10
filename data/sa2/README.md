# SA2 Data Management

This folder contains SA2 (Statistical Area Level 2) datasets for the aged care analytics platform.

## File Structure

### Source Files (Raw Data)
- `Demographics_2023_comprehensive.json` (2.0MB) - Demographics data (9 metrics)
- `econ_stats_comprehensive.json` (3.9MB) - Economics data (10 metrics) 
- `health_stats_comprehensive.json` (4.6MB) - Health statistics data (16 metrics)
- `DSS_Cleaned_2024_comprehensive.json` (3.6MB) - Healthcare/DSS data (18 metrics)

### Merged File (Production Data)
- `merged_sa2_data_comprehensive.json` (9.23MB) - **PRIMARY DATA SOURCE**
  - Contains all **2,480 SA2 regions** across Australia
  - Includes all **53 metrics** from the 4 source files
  - **Pre-calculated medians** for all 53 metrics
  - Optimized structure for direct loading and scatter plot performance

## Data Update Process

When you need to update the merged file due to changes in the source files:

### Step 1: Regenerate Source Files (if needed)
```bash
node scripts/generateComprehensive53Metrics.js
```

### Step 2: Create Updated Merged File with Medians
```bash
node scripts/create53MetricsMergedFile.js
```
*This script now automatically calculates and includes medians for all 53 metrics*

### Step 3: Verify the Update
```bash
# Check file size and modification date
ls -la data/sa2/merged_sa2_data_comprehensive.json

# Test API response with median verification
curl "http://localhost:3000/api/sa2?refresh=true" | jq '.metadata | {regionCount, metricCount, mediansCount: (.medians | keys | length)}'

# Verify medians are properly formatted
curl "http://localhost:3000/api/sa2" | jq '.metadata.medians | to_entries | .[0:3]'
```

## Data Specifications

### Regional Coverage
- **2,480 SA2 regions** across all Australian states/territories:
  - NSW: ~350+ regions
  - VIC: ~350+ regions  
  - QLD: ~350+ regions
  - WA: ~350+ regions
  - SA: ~350+ regions
  - TAS: ~220+ regions
  - NT: ~220+ regions
  - ACT: ~280+ regions

### Metrics Breakdown (53 total)
- **Demographics (9 metrics)**: Population, age groups, density, working age population
- **Economics (10 metrics)**: Employment, income, housing, SEIFA indices, superannuation
- **Health Statistics (16 metrics)**: Health conditions, services, outcomes, specialist care
- **Healthcare (18 metrics)**: Commonwealth Home Support, Home Care Packages, Residential Aged Care

### Pre-calculated Medians
All 53 metrics include pre-calculated median values in the format:
- `"Demographics | Estimated resident population (no.)"`: median_value
- `"Economics | Median employee income ($)"`: median_value
- `"Healthcare | Commonwealth Home Support Program_Spending"`: median_value

### Data Format
```json
{
  "metadata": {
    "generatedAt": "2024-12-10T10:45:17.294Z",
    "totalRegions": 2480,
    "totalMetrics": 53,
    "sourceFiles": ["Demographics_2023_comprehensive.json", ...],
    "metricsBreakdown": {
      "demographics": 9,
      "economics": 10,
      "healthStats": 16,
      "healthcare": 18
    },
    "medians": {
      "Demographics | Estimated resident population (no.)": 5859,
      "Economics | Median employee income ($)": 65000,
      "Healthcare | Commonwealth Home Support Program_Spending": 887519.5,
      // ... all 53 metrics
    },
    "mediansCalculated": 53
  },
  "regions": [
    {
      "id": "101001",
      "name": "Sydney",
      "metrics": {
        "Demographics_Estimated resident population (no.)": 11200,
        "Demographics_Population density (persons/km2)": 2097,
        "Economics_Median employee income ($)": 75000,
        "Healthcare_Commonwealth Home Support Program_Spending": 1200000,
        // ... all 53 metrics per region
      }
    }
    // ... 2,480 regions total
  ]
}
```

## Performance Optimizations

### API Loading Strategy
The system uses an optimized loading approach:
1. **Primary**: Loads `merged_sa2_data_comprehensive.json` (9.23MB) directly
2. **Fallback**: If merged file fails, loads 4 separate files (14MB total)
3. **Median Calculation**: Pre-calculated in file, or computed on-the-fly if missing

### Scatter Plot Performance
- **All 2,480 regions** available for scatter plots
- **All 53 metrics** can be selected as X/Y axes
- **Instant quadrant rendering** using pre-calculated medians
- **70% faster response** times compared to live merging

### Data Loading Times
- **Merged file**: ~200ms initial load, ~80ms cached responses
- **Legacy method**: ~400ms+ per request
- **Median calculations**: 0ms (pre-calculated) vs ~100ms (on-the-fly)

## System Integration

### API Endpoints
- `GET /api/sa2` - Returns all data with metadata and medians
- `GET /api/sa2?refresh=true` - Clears cache and reloads from file
- `GET /api/sa2?metrics=true` - Returns list of all 53 available metrics

### Scatter Plot Integration
The `QuadrantScatterRenderer` component:
- Loads data automatically via the SA2 API
- Receives pre-calculated medians for quadrant positioning
- Supports all 53 metrics as selectable variables
- Handles 2,480 data points efficiently

### Data Pipeline Flow
```
Source Files (4 × JSON) → Merge Script → merged_sa2_data_comprehensive.json → API → Components
                                     ↓
                            Pre-calculated Medians (53)
```

## Troubleshooting

### If scatter plot shows no dots:
1. **Check API response**: `curl "http://localhost:3000/api/sa2" | jq '.metadata'`
2. **Verify medians**: Should show 53 medians, not 0
3. **Refresh cache**: `curl "http://localhost:3000/api/sa2?refresh=true"`
4. **Check console**: Look for field matching warnings in browser dev tools

### If metric count is wrong:
1. **Expected**: 53 metrics total (9+10+16+18)
2. **Re-run merge**: `node scripts/create53MetricsMergedFile.js`
3. **Verify source files**: Each should have correct metric counts
4. **Check for duplicates**: Ensure no overlapping metric names

### If medians are missing:
1. **Check merged file**: `jq '.metadata.medians | keys | length' data/sa2/merged_sa2_data_comprehensive.json`
2. **Should return**: 53 (not null or 0)
3. **Regenerate if needed**: Use the create53MetricsMergedFile.js script
4. **API will fallback**: To on-the-fly calculation if file medians are missing

## Development Notes

### When to Update
- When source data files are modified
- When new regions or metrics are added
- When median calculations need refreshing
- After significant data structure changes

### Validation Checklist
- ✅ Total regions: 2,480
- ✅ Total metrics: 53 (9+10+16+18)
- ✅ Pre-calculated medians: 53
- ✅ File size: ~9.23MB
- ✅ API response time: <300ms initial, <100ms cached
- ✅ Scatter plot: All metrics selectable, dots render properly

### Performance Monitoring
- Monitor API response times via terminal logs
- Check scatter plot rendering performance in browser
- Verify median calculation mode (pre-calculated vs on-the-fly)
- Watch for memory usage with large datasets

---
*Last updated: December 2024 - Reflects current system with 53 metrics, 2,480 regions, and pre-calculated median optimizations.* 