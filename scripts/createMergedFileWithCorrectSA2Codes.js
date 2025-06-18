const fs = require('fs');
const path = require('path');

/**
 * Create merged SA2 data file using the CORRECT source files with 9-digit SA2 codes
 * This will fix the Beaudesert issue by using data that matches the boundary files
 */

console.log('🔧 Creating merged SA2 file with correct 9-digit SA2 codes...');

// Source files with 9-digit SA2 codes (matching boundary files)
const sourceFiles = {
  demographics: 'Maps_ABS_CSV/Demographics_2023.json',
  economics: 'Maps_ABS_CSV/econ_stats.json', 
  health: 'Maps_ABS_CSV/health_stats.json',
  dss: 'Maps_ABS_CSV/DSS_Cleaned_2024.json'
};

// Output file
const outputFile = 'data/sa2/merged_sa2_data_comprehensive.json';

/**
 * Normalize SA2 ID to ensure consistent format
 */
function normalizeSA2Id(id) {
  return String(id).padStart(9, '0');
}

/**
 * Clean numeric values
 */
function cleanNumericValue(value) {
  if (typeof value === 'number') return value;
  
  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Load and parse JSON file
 */
function loadJsonFile(filePath) {
  try {
    console.log(`📥 Loading ${filePath}...`);
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);
    console.log(`✅ Loaded ${data.length} records from ${filePath}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to load ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Process demographics data
 */
function processDemographics(data) {
  console.log('📊 Processing Demographics data...');
  const processed = new Map();
  
  data.forEach(row => {
    const sa2Id = normalizeSA2Id(row['SA2 ID']);
    const sa2Name = String(row['SA2 Name']).trim();
    const metricKey = `Demographics | ${row.Description}`;
    const value = cleanNumericValue(row.Amount);
    
    if (!processed.has(sa2Id)) {
      processed.set(sa2Id, { id: sa2Id, name: sa2Name, metrics: {} });
    }
    
    processed.get(sa2Id).metrics[metricKey] = value;
  });
  
  console.log(`✅ Processed ${processed.size} unique SA2 regions from Demographics`);
  return processed;
}

/**
 * Process economics data
 */
function processEconomics(data, regionsMap) {
  console.log('📊 Processing Economics data...');
  let addedCount = 0;
  
  data.forEach(row => {
    const sa2Id = normalizeSA2Id(row['SA2 ID']);
    const sa2Name = String(row['SA2 Name']).trim();
    const metricKey = `${row['Parent Description']} | ${row.Description}`;
    const value = cleanNumericValue(row.Amount);
    
    if (!regionsMap.has(sa2Id)) {
      regionsMap.set(sa2Id, { id: sa2Id, name: sa2Name, metrics: {} });
    }
    
    regionsMap.get(sa2Id).metrics[metricKey] = value;
    addedCount++;
  });
  
  console.log(`✅ Added ${addedCount} economics metrics`);
  return regionsMap;
}

/**
 * Process health data
 */
function processHealth(data, regionsMap) {
  console.log('📊 Processing Health data...');
  let addedCount = 0;
  
  data.forEach(row => {
    const sa2Id = normalizeSA2Id(row['SA2 ID']);
    const sa2Name = String(row['SA2 Name']).trim();
    const metricKey = `${row['Parent Description']} | ${row.Description}`;
    const value = cleanNumericValue(row.Amount);
    
    if (!regionsMap.has(sa2Id)) {
      regionsMap.set(sa2Id, { id: sa2Id, name: sa2Name, metrics: {} });
    }
    
    regionsMap.get(sa2Id).metrics[metricKey] = value;
    addedCount++;
  });
  
  console.log(`✅ Added ${addedCount} health metrics`);
  return regionsMap;
}

/**
 * Process DSS data
 */
function processDSS(data, regionsMap) {
  console.log('📊 Processing DSS data...');
  let addedCount = 0;
  
  data.forEach(row => {
    const sa2Id = normalizeSA2Id(row['SA2 ID']);
    const sa2Name = String(row['SA2 Name']).trim();
    const metricKey = `${row.Category} | ${row.Type}`;
    const value = cleanNumericValue(row.Amount);
    
    if (!regionsMap.has(sa2Id)) {
      regionsMap.set(sa2Id, { id: sa2Id, name: sa2Name, metrics: {} });
    }
    
    regionsMap.get(sa2Id).metrics[metricKey] = value;
    addedCount++;
  });
  
  console.log(`✅ Added ${addedCount} DSS metrics`);
  return regionsMap;
}

/**
 * Calculate medians for all metrics
 */
function calculateMedians(regionsMap) {
  console.log('📊 Calculating medians for all metrics...');
  
  const metricValues = new Map();
  
  // Collect all values for each metric
  regionsMap.forEach(region => {
    Object.entries(region.metrics).forEach(([metric, value]) => {
      if (typeof value === 'number' && !isNaN(value)) {
        if (!metricValues.has(metric)) {
          metricValues.set(metric, []);
        }
        metricValues.get(metric).push(value);
      }
    });
  });
  
  // Calculate medians
  const medians = {};
  metricValues.forEach((values, metric) => {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medians[metric] = sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  });
  
  console.log(`✅ Calculated medians for ${Object.keys(medians).length} metrics`);
  return medians;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Load all source files
    const demographicsData = loadJsonFile(sourceFiles.demographics);
    const economicsData = loadJsonFile(sourceFiles.economics);
    const healthData = loadJsonFile(sourceFiles.health);
    const dssData = loadJsonFile(sourceFiles.dss);
    
    if (!demographicsData.length) {
      throw new Error('Demographics data is required but could not be loaded');
    }
    
    // Process data in sequence
    let regionsMap = processDemographics(demographicsData);
    
    if (economicsData.length) {
      regionsMap = processEconomics(economicsData, regionsMap);
    }
    
    if (healthData.length) {
      regionsMap = processHealth(healthData, regionsMap);
    }
    
    if (dssData.length) {
      regionsMap = processDSS(dssData, regionsMap);
    }
    
    // Convert to array and calculate medians
    const regions = Array.from(regionsMap.values());
    const medians = calculateMedians(regionsMap);
    
    // Get metric count
    const allMetrics = new Set();
    regions.forEach(region => {
      Object.keys(region.metrics).forEach(metric => allMetrics.add(metric));
    });
    
    // Create final output structure
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRegions: regions.length,
        totalMetrics: allMetrics.size,
        sourceFiles: Object.values(sourceFiles),
        medians: medians,
        note: "Generated with 9-digit SA2 codes matching boundary files"
      },
      regions: regions
    };
    
    // Write to file
    console.log('💾 Writing merged file...');
    const outputPath = path.join(process.cwd(), outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ SUCCESS! Merged SA2 data file created:');
    console.log(`📁 File: ${outputFile}`);
    console.log(`📊 Regions: ${regions.length}`);
    console.log(`📈 Metrics: ${allMetrics.size}`);
    console.log(`💾 Size: ${fileSizeMB} MB`);
    console.log(`🎯 Medians: ${Object.keys(medians).length} calculated`);
    
    // Test for Beaudesert
    const beaudesertRegion = regions.find(r => r.id === '311011305');
    if (beaudesertRegion) {
      console.log('🎉 SUCCESS: Beaudesert found in merged data!');
      console.log(`   SA2 ID: ${beaudesertRegion.id}`);
      console.log(`   Name: ${beaudesertRegion.name}`);
      console.log(`   Metrics: ${Object.keys(beaudesertRegion.metrics).length}`);
    } else {
      console.log('⚠️  WARNING: Beaudesert (311011305) not found in merged data');
    }
    
  } catch (error) {
    console.error('❌ Error creating merged file:', error);
    process.exit(1);
  }
}

// Run the script
main(); 