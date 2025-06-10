# SA2 Data Management & Field Name Standardization

This folder contains SA2 (Statistical Area Level 2) datasets for the aged care analytics platform with **standardized field naming conventions** to prevent data plotting issues.

## 🎯 **CRITICAL: Field Name Consistency Standards**

All data must use **single pipe** (`|`) separation with **exact category names** to prevent chart data loading failures:

```
✅ CORRECT FORMAT:
"Demographics | Persons - 55-64 years (no.)"
"Economics | Median household income ($/week)"
"Health Statistics | Life expectancy (years)"

❌ WRONG FORMATS:
"Demographics|||Persons - 55-64 years (no.)"  // Triple pipes
"Age Groups | Persons - 55-64 years (no.)"    // Wrong category
"Demographics_Persons - 55-64 years (no.)"    // Underscores only
```

## 📁 File Structure

### Production Data (Used by Application)
- **`merged_sa2_data_comprehensive.json`** (9.23MB) - **PRIMARY DATA SOURCE**
  - Contains all **2,480 SA2 regions** across Australia
  - Includes all **53 metrics** with standardized field names
  - **Pre-calculated medians** for all 53 metrics for scatter plot performance
  - **Single source of truth** - all charts load from this file

### Source Files (For Updates)
- `Demographics_2023_comprehensive.json` (2.0MB) - Demographics data (9 metrics)
- `econ_stats_comprehensive.json` (3.9MB) - Economics data (10 metrics) 
- `health_stats_comprehensive.json` (4.6MB) - Health statistics data (16 metrics)
- `DSS_Cleaned_2024_comprehensive.json` (3.6MB) - Healthcare/DSS data (18 metrics)

### Documentation & Scripts
- `README.md` - This comprehensive guide
- `scripts/create53MetricsMergedFile.js` - Merge script with field standardization
- `scripts/generateComprehensive53Metrics.js` - Source file generator

## ⚡ Data Update Process

When source files are updated, follow these steps to maintain data consistency:

### Step 1: Update Source Files (if needed)
```bash
# Only if the 4 source JSON files have changed
node scripts/generateComprehensive53Metrics.js
```

### Step 2: Regenerate Merged File with Standardized Fields
```bash
# This is the critical step - regenerates with proper field formatting
node scripts/create53MetricsMergedFile.js
```

### Step 3: Verify Field Name Consistency
```bash
# Check merged file was created successfully
ls -la data/sa2/merged_sa2_data_comprehensive.json

# Verify field names use correct pipe format
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/sa2/merged_sa2_data_comprehensive.json', 'utf8'));
const sampleKeys = Object.keys(data.regions[0].metrics).slice(0, 5);
console.log('✅ Sample field names:');
sampleKeys.forEach(k => console.log('  -', k));
console.log('✅ All use single pipes:', sampleKeys.every(k => k.includes('|') && !k.includes('|||')));
"
```

### Step 4: Test API & Chart Data Loading
```bash
# Start development server
npm run dev

# Test API response includes proper field names
curl "http://localhost:3000/api/sa2?limit=1" | jq '.data | to_entries | .[0].value | keys | .[]' | grep "55-64"

# Expected output:
# "Demographics | Persons - 55-64 years (%)"
# "Demographics | Persons - 55-64 years (no.)"
```

### Step 5: Verify Chart Plotting
1. Open insights page: `http://localhost:3000/insights`
2. Create scatter plot with age group variables
3. **Should show 2,480 dots** (one per SA2 region)
4. Check browser console for field mapping success logs

## 🔧 Field Name Mapping Standards

### Variable Definition Categories (HeatmapDataService.tsx)
```typescript
DEMOGRAPHICS_TYPES = {
  'Demographics': ['Persons - 55-64 years (no.)', 'Persons - 65 years and over (no.)', ...]
}
```

### Merged Data Format (merged_sa2_data_comprehensive.json)
```json
{
  "regions": [
    {
      "id": "101021007",
      "name": "Sydney",
      "metrics": {
        "Demographics_Persons - 55-64 years (no.)": 1234,
        // Note: Uses underscores initially
      }
    }
  ]
}
```

### API Output Format (lib/mergeSA2Data.ts conversion)
```typescript
// Converts: "Demographics_Metric" → "Demographics | Metric"
const formattedKey = metricKey.replace(/_(.*)/, ' | $1');
```

### Final Chart Field Names
```
"Demographics | Persons - 55-64 years (no.)"  ✅ Used by charts
```

## 📊 Data Specifications

### Regional Coverage
- **2,480 SA2 regions** across all Australian states/territories
- Complete coverage: NSW, VIC, QLD, WA, SA, TAS, NT, ACT

### Metric Categories & Counts
- **Demographics** (9 metrics): Population, age groups, density
- **Economics** (10 metrics): Income, employment, housing costs  
- **Health Statistics** (16 metrics): Conditions, services, outcomes
- **Healthcare Programs** (18 metrics): CHSP, Home Care, Residential Care

### Performance Features
- **Pre-calculated medians** for all 53 metrics
- **Optimized wide format** for chart performance
- **Single API call** loads all data (no multiple requests)
- **Memory caching** in production

## 🚨 Troubleshooting Data Issues

### Problem: Only 4 dots showing instead of 2,480
**Symptoms:** Scatter plots show very few data points
**Cause:** Field name mismatch between variables and SA2 data
**Solution:**
1. Check variable definitions use correct category names
2. Ensure merged file has proper field format conversion
3. Verify API returns standardized field names

### Problem: "Failed to load SA2 data" error
**Symptoms:** Error message in charts
**Cause:** API endpoint issues or file corruption
**Solution:**
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `npm run dev`
3. Check file exists: `ls -la data/sa2/merged_sa2_data_comprehensive.json`

### Problem: Field mapping warnings in console
**Symptoms:** "Field not found" warnings
**Cause:** Variable definitions don't match actual data fields
**Solution:**
1. Check exact field names in merged file
2. Update variable definitions in `HeatmapDataService.tsx`
3. Regenerate merged file with correct categories

### Problem: Charts show straight lines (false correlations)
**Symptoms:** Perfect correlations between different variables
**Cause:** Multiple variables mapping to same underlying field
**Solution:**
1. Verify each variable has unique field mapping
2. Check for fuzzy logic that might merge different fields
3. Use exact matching only

## 🔍 Debug Commands

### Check File Integrity
```bash
# Verify file size and structure
ls -lh data/sa2/*.json

# Check region count
node -e "console.log('Regions:', JSON.parse(require('fs').readFileSync('data/sa2/merged_sa2_data_comprehensive.json')).regions.length)"

# Check metric count  
node -e "const d=JSON.parse(require('fs').readFileSync('data/sa2/merged_sa2_data_comprehensive.json')); console.log('Metrics:', Object.keys(d.regions[0].metrics).length)"
```

### Test Field Name Formats
```bash
# Check for triple pipes (should be none)
node -e "
const d = JSON.parse(require('fs').readFileSync('data/sa2/merged_sa2_data_comprehensive.json'));
const badKeys = Object.keys(d.regions[0].metrics).filter(k => k.includes('|||'));
console.log('Triple pipe fields (should be empty):', badKeys);
"

# Check for proper single pipes
node -e "
const d = JSON.parse(require('fs').readFileSync('data/sa2/merged_sa2_data_comprehensive.json'));
const goodKeys = Object.keys(d.regions[0].metrics).filter(k => k.includes(' | '));
console.log('Properly formatted fields:', goodKeys.length);
"
```

### Verify API Conversion
```bash
# Test field name conversion in API
curl -s "http://localhost:3000/api/sa2" | jq '.data | to_entries | .[0].value | keys | .[]' | grep "|" | head -3
```

## 🎯 Quality Assurance Checklist

Before deploying data updates:

- [ ] All field names use single pipes (`|`), no triple pipes (`|||`)
- [ ] Category names match variable definitions exactly
- [ ] Merged file contains 2,480 regions
- [ ] All 53 metrics are present
- [ ] Pre-calculated medians included
- [ ] API returns properly formatted field names
- [ ] Scatter plots show full data (2,480 dots)
- [ ] No field mapping warnings in console
- [ ] Charts display distinct values (no false correlations)

---

**🎯 Remember:** Field name consistency is critical for chart functionality. Always use the standardized merge process to prevent data plotting failures. 