# SA2 Data Management

This folder contains SA2 (Statistical Area Level 2) datasets for the aged care analytics platform.

## File Structure

### Source Files (Raw Data)
- `Demographics_2023_comprehensive.json` (2.0MB) - Demographics data (9 metrics)
- `econ_stats_comprehensive.json` (3.9MB) - Economics data (10 metrics) 
- `health_stats_comprehensive.json` (4.6MB) - Health statistics data (16 metrics)
- `DSS_Cleaned_2024_comprehensive.json` (3.6MB) - Healthcare/DSS data (18 metrics)

### Merged File (Production Data)
- `merged_sa2_data_comprehensive.json` (5.4MB) - **PRIMARY DATA SOURCE**
  - Contains all 2,456 SA2 regions
  - Includes all 34 metrics from the 4 source files
  - Pre-calculated medians for all metrics
  - Optimized structure for direct loading

## Data Update Process

When you need to update the merged file due to changes in the source files:

### Step 1: Regenerate Source Files (if needed)
```bash
node scripts/generateComprehensive53Metrics.js
```

### Step 2: Create Updated Merged File
```bash
node scripts/create53MetricsMergedFile.js
```

### Step 3: Verify the Update
```bash
# Check file size and modification date
ls -la data/sa2/merged_sa2_data_comprehensive.json

# Test API response
curl "http://localhost:3000/api/sa2?refresh=true" | jq '.metadata'
```

## Data Specifications

### Regional Coverage
- **2,456 SA2 regions** across all Australian states/territories:
  - NSW: ~350 regions
  - VIC: ~350 regions  
  - QLD: ~350 regions
  - WA: ~350 regions
  - SA: ~350 regions
  - TAS: ~220 regions
  - NT: ~220 regions
  - ACT: ~256 regions

### Metrics Breakdown (34 total)
- **Demographics (6 metrics)**: Population, age groups, density
- **Economics (9 metrics)**: Employment, income, housing, SEIFA indices
- **Health (10 metrics)**: Health conditions, services, outcomes
- **Healthcare (9 metrics)**: Home support, home care, residential care

### Data Format
```json
{
  "regions": [
    {
      "id": "SA2_ID",
      "name": "SA2_Name", 
      "metrics": {
        "Demographics_Metric_Name": value,
        "Economics_Metric_Name": value,
        "Health_Metric_Name": value,
        "Healthcare_Metric_Name": value
      }
    }
  ],
  "metadata": {
    "totalRegions": 2456,
    "totalMetrics": 34,
    "medians": {
      "Metric_Name": median_value
    },
    "generatedAt": "timestamp"
  }
}
```

## System Integration

### API Usage
The merged file is loaded directly by `/api/sa2` for optimal performance:
- Loads 5.4MB once instead of processing 4 separate files (14MB total)
- Pre-calculated medians eliminate runtime calculations
- Faster response times for scatter plots and analytics

### Scatter Plot Integration
The scatter plot (`QuadrantScatterRenderer`) automatically loads data from the merged file via the SA2 API, providing access to all 2,456 regions and 34 metrics with median references.

## Maintenance Notes

- **When to update**: When source data files are modified or new regions/metrics are added
- **Validation**: Always verify metric count (should be 34) and region count (should be 2,456) after updates
- **Performance**: The merged file approach reduces API response time by ~70% compared to live merging
- **Storage**: Keep source files for traceability, but the merged file is the primary data source

## Troubleshooting

### If scatter plot shows no data:
1. Check if merged file exists: `ls data/sa2/merged_sa2_data_comprehensive.json`
2. Refresh API cache: `curl "http://localhost:3000/api/sa2?refresh=true"`
3. Verify file format with: `jq '.metadata' data/sa2/merged_sa2_data_comprehensive.json`

### If metric count is wrong:
1. Re-run the merging process (Step 2 above)
2. Check source files have correct structure
3. Verify no duplicate metrics in different categories

---
*Last updated: When you run the merging process, this file explains the complete workflow for maintaining the SA2 data.* 