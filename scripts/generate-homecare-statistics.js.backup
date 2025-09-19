const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Homecare Statistics Generation...');

// Load homecare provider data
const homecareDataPath = path.join(__dirname, '../public/Maps_ABS_CSV/merged_homecare_providers.json');
const homecareProviders = JSON.parse(fs.readFileSync(homecareDataPath, 'utf8'));

console.log(`📊 Loaded ${homecareProviders.length} homecare providers`);

// Statistical calculation functions
function calculateStatistics(values) {
  if (!values || values.length === 0) return null;
  
  const validValues = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  if (validValues.length === 0) return null;
  
  const n = validValues.length;
  const mean = validValues.reduce((sum, val) => sum + val, 0) / n;
  
  return {
    min: validValues[0],
    q1: validValues[Math.floor(n * 0.25)],
    median: validValues[Math.floor(n * 0.5)],
    q3: validValues[Math.floor(n * 0.75)],
    max: validValues[n - 1],
    mean: parseFloat(mean.toFixed(2)),
    count: n
  };
}

// Extract numeric values from providers
function extractNumericField(providers, fieldPath) {
  const values = [];
  
  providers.forEach(provider => {
    const value = getNestedValue(provider, fieldPath);
    if (typeof value === 'number' && !isNaN(value)) {
      values.push(value);
    }
  });
  
  return values;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

// Generate comprehensive statistics
function generateHomecareStatistics() {
  console.log('📈 Analyzing homecare cost fields...');
  
  // Define all numeric fields we want to analyze - FIXED PATHS
  const numericFields = [
    // Management costs - Care Management
    'cost_info.management_costs.care_management.level_1_fortnightly',
    'cost_info.management_costs.care_management.level_2_fortnightly',
    'cost_info.management_costs.care_management.level_3_fortnightly',
    'cost_info.management_costs.care_management.level_4_fortnightly',
    
    // Management costs - Package Management
    'cost_info.management_costs.package_management.level_1_fortnightly',
    'cost_info.management_costs.package_management.level_2_fortnightly',
    'cost_info.management_costs.package_management.level_3_fortnightly',
    'cost_info.management_costs.package_management.level_4_fortnightly',
    
    // Package budgets
    'cost_info.package_budget.hcp_level_1_fortnightly',
    'cost_info.package_budget.hcp_level_2_fortnightly',
    'cost_info.package_budget.hcp_level_3_fortnightly',
    'cost_info.package_budget.hcp_level_4_fortnightly',
    
    // Service costs - Personal Care
    'cost_info.service_costs.personal_care.weekday',
    'cost_info.service_costs.personal_care.weekend',
    'cost_info.service_costs.personal_care.evening',
    'cost_info.service_costs.personal_care.public_holiday',
    
    // Service costs - Nursing
    'cost_info.service_costs.nursing.weekday',
    'cost_info.service_costs.nursing.weekend',
    'cost_info.service_costs.nursing.evening',
    'cost_info.service_costs.nursing.public_holiday',
    
    // Service costs - Allied Health
    'cost_info.service_costs.allied_health.weekday',
    'cost_info.service_costs.allied_health.weekend',
    'cost_info.service_costs.allied_health.evening',
    'cost_info.service_costs.allied_health.public_holiday',
    
    // Travel costs
    'cost_info.travel_costs.per_km',
    'cost_info.travel_costs.minimum_charge'
  ];
  
  // Generate nationwide statistics
  console.log('🌏 Generating nationwide statistics...');
  const nationwideStats = { fields: {} };
  
  numericFields.forEach(fieldPath => {
    const values = extractNumericField(homecareProviders, fieldPath);
    const stats = calculateStatistics(values);
    if (stats) {
      const fieldName = fieldPath.replace('cost_info.', '').replace(/\./g, '_');
      nationwideStats.fields[fieldName] = stats;
      console.log(`  ✅ ${fieldName}: ${stats.count} values, median $${stats.median}`);
    }
  });
  
  // Generate state-level statistics
  console.log('🏛️ Generating state-level statistics...');
  const stateGroups = {};
  
  homecareProviders.forEach(provider => {
    const state = provider.provider_info?.address?.state;
    if (state) {
      if (!stateGroups[state]) stateGroups[state] = [];
      stateGroups[state].push(provider);
    }
  });
  
  const byState = Object.entries(stateGroups).map(([stateName, stateProviders]) => {
    const stateStats = { groupName: stateName, fields: {} };
    
    numericFields.forEach(fieldPath => {
      const values = extractNumericField(stateProviders, fieldPath);
      const stats = calculateStatistics(values);
      if (stats) {
        const fieldName = fieldPath.replace('cost_info.', '').replace(/\./g, '_');
        stateStats.fields[fieldName] = stats;
      }
    });
    
    console.log(`  📍 ${stateName}: ${stateProviders.length} providers`);
    return stateStats;
  });
  
  // Generate locality-level statistics
  console.log('🏘️ Generating locality-level statistics...');
  const localityGroups = {};
  
  homecareProviders.forEach(provider => {
    const locality = provider.provider_info?.address?.locality;
    if (locality) {
      if (!localityGroups[locality]) localityGroups[locality] = [];
      localityGroups[locality].push(provider);
    }
  });
  
  const byLocality = Object.entries(localityGroups)
    .filter(([_, providers]) => providers.length >= 3) // Only include localities with 3+ providers
    .map(([localityName, localityProviders]) => {
      const localityStats = { groupName: localityName, fields: {} };
      
      numericFields.forEach(fieldPath => {
        const values = extractNumericField(localityProviders, fieldPath);
        const stats = calculateStatistics(values);
        if (stats) {
          const fieldName = fieldPath.replace('cost_info.', '').replace(/\./g, '_');
          localityStats.fields[fieldName] = stats;
        }
      });
      
      return localityStats;
    });
  
  console.log(`  🏘️ Generated statistics for ${byLocality.length} localities (3+ providers each)`);
  
  // Generate service region statistics  
  console.log('🗺️ Generating service region statistics...');
  const serviceRegionGroups = {};
  
  homecareProviders.forEach(provider => {
    const region = provider.cost_info?.service_region;
    if (region) {
      if (!serviceRegionGroups[region]) serviceRegionGroups[region] = [];
      serviceRegionGroups[region].push(provider);
    }
  });
  
  const byServiceRegion = Object.entries(serviceRegionGroups)
    .filter(([_, providers]) => providers.length >= 2)
    .map(([regionName, regionProviders]) => {
      const regionStats = { groupName: regionName, fields: {} };
      
      numericFields.forEach(fieldPath => {
        const values = extractNumericField(regionProviders, fieldPath);
        const stats = calculateStatistics(values);
        if (stats) {
          const fieldName = fieldPath.replace('cost_info.', '').replace(/\./g, '_');
          regionStats.fields[fieldName] = stats;
        }
      });
      
      return regionStats;
    });
  
  console.log(`  🗺️ Generated statistics for ${byServiceRegion.length} service regions`);
  
  // Compile final statistics object
  const statistics = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalProviders: homecareProviders.length,
      numericFields: numericFields.length,
      geographicLevels: {
        states: byState.length,
        localities: byLocality.length,
        serviceRegions: byServiceRegion.length
      },
      fieldList: numericFields
    },
    nationwide: nationwideStats,
    byState,
    byLocality,
    byServiceRegion
  };
  
  return statistics;
}

// Generate and save statistics
try {
  const statistics = generateHomecareStatistics();
  
  // Save to public directory for frontend access
  const outputPath = path.join(__dirname, '../public/Maps_ABS_CSV/homecare_statistics_analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(statistics, null, 2));
  
  console.log('🎉 Homecare statistics generation complete!');
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Generated ${Object.keys(statistics.nationwide.fields).length} field statistics`);
  console.log(`🏛️ ${statistics.byState.length} states analyzed`);
  console.log(`🏘️ ${statistics.byLocality.length} localities analyzed`);
  console.log(`🗺️ ${statistics.byServiceRegion.length} service regions analyzed`);
  
  // Display sample statistics
  console.log('\n📈 Sample Statistics:');
  const sampleField = Object.keys(statistics.nationwide.fields)[0];
  if (sampleField) {
    const sampleStats = statistics.nationwide.fields[sampleField];
    console.log(`  ${sampleField}:`);
    console.log(`    Min: $${sampleStats.min}, Median: $${sampleStats.median}, Max: $${sampleStats.max}`);
    console.log(`    Mean: $${sampleStats.mean}, Count: ${sampleStats.count}`);
  }
  
} catch (error) {
  console.error('❌ Error generating homecare statistics:', error);
  process.exit(1);
} 