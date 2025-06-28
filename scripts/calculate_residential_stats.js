const fs = require('fs');
const path = require('path');

// Read the residential data
const dataPath = '../public/maps/abs_csv/Residential_May2025_ExcludeMPS_updated_with_finance.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`Loaded ${data.length} residential facilities`);

// Function to extract room cost statistics for a facility
function extractRoomCostStats(facility) {
  if (!facility.rooms_data || !Array.isArray(facility.rooms_data)) {
    return {
      room_cost_min: null,
      room_cost_max: null,
      room_cost_median: null
    };
  }

  // Extract all valid cost_per_day values
  const roomCosts = facility.rooms_data
    .map(room => room.cost_per_day)
    .filter(cost => cost !== null && cost !== undefined && typeof cost === 'number' && !isNaN(cost));

  if (roomCosts.length === 0) {
    return {
      room_cost_min: null,
      room_cost_max: null,
      room_cost_median: null
    };
  }

  // Sort costs for median calculation
  const sortedCosts = roomCosts.slice().sort((a, b) => a - b);
  
  // Calculate statistics
  const min = sortedCosts[0];
  const max = sortedCosts[sortedCosts.length - 1];
  const median = sortedCosts.length % 2 === 0 
    ? (sortedCosts[sortedCosts.length / 2 - 1] + sortedCosts[sortedCosts.length / 2]) / 2
    : sortedCosts[Math.floor(sortedCosts.length / 2)];

  return {
    room_cost_min: Math.round(min * 100) / 100,
    room_cost_max: Math.round(max * 100) / 100,
    room_cost_median: Math.round(median * 100) / 100
  };
}

// NEW: Function to extract nested financial values for flat access patterns
function extractNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

// NEW: Function to flatten financial data for statistical analysis
function flattenFinancialData(facility) {
  const flattened = { ...facility };
  
  if (!facility.financials) {
    return flattened;
  }
  
  // Extract all nested financial values using dot notation
  const financialPaths = [
    'financials.expenditure.total_per_day.value',
    'financials.expenditure.total_per_day.sector_average',
    'financials.expenditure.total_per_day.variance_percentage',
    'financials.expenditure.care_nursing.total.value',
    'financials.expenditure.care_nursing.total.sector_average',
    'financials.expenditure.care_nursing.total.variance_percentage',
    'financials.expenditure.care_nursing.breakdown.registered_nurses.value',
    'financials.expenditure.care_nursing.breakdown.enrolled_nurses.value',
    'financials.expenditure.care_nursing.breakdown.personal_care_workers.value',
    'financials.expenditure.care_nursing.breakdown.care_management_staff.value',
    'financials.expenditure.care_nursing.breakdown.allied_health.value',
    'financials.expenditure.care_nursing.breakdown.lifestyle_recreation.value',
    'financials.expenditure.care_nursing.breakdown.other_care_expenses.value',
    'financials.expenditure.administration.value',
    'financials.expenditure.administration.sector_average',
    'financials.expenditure.administration.variance_percentage',
    'financials.expenditure.cleaning_laundry.total.value',
    'financials.expenditure.cleaning_laundry.total.sector_average',
    'financials.expenditure.cleaning_laundry.total.variance_percentage',
    'financials.expenditure.cleaning_laundry.breakdown.cleaning.value',
    'financials.expenditure.cleaning_laundry.breakdown.laundry.value',
    'financials.expenditure.cleaning_laundry.breakdown.covid_infection_control.value',
    'financials.expenditure.cleaning_laundry.breakdown.other_related.value',
    'financials.expenditure.accommodation_maintenance.total.value',
    'financials.expenditure.accommodation_maintenance.total.sector_average',
    'financials.expenditure.accommodation_maintenance.total.variance_percentage',
    'financials.expenditure.accommodation_maintenance.breakdown.accommodation.value',
    'financials.expenditure.accommodation_maintenance.breakdown.maintenance.value',
    'financials.expenditure.food_catering.value',
    'financials.expenditure.food_catering.sector_average',
    'financials.expenditure.food_catering.variance_percentage',
    'financials.income.total_per_day.value',
    'financials.income.total_per_day.sector_average',
    'financials.income.total_per_day.variance_percentage',
    'financials.income.residents_contribution.value',
    'financials.income.residents_contribution.sector_average',
    'financials.income.residents_contribution.variance_percentage',
    'financials.income.government_funding.value',
    'financials.income.government_funding.sector_average',
    'financials.income.government_funding.variance_percentage',
    'financials.income.other.value',
    'financials.income.other.sector_average',
    'financials.income.other.variance_percentage',
    'financials.budget_surplus_deficit_per_day.value',
    'financials.budget_surplus_deficit_per_day.sector_average',
    'financials.care_staff_last_quarter.total.value',
    'financials.care_staff_last_quarter.total.sector_average',
    'financials.care_staff_last_quarter.total.variance_percentage',
    'financials.care_staff_last_quarter.breakdown.registered_nurses.value',
    'financials.care_staff_last_quarter.breakdown.enrolled_nurses.value',
    'financials.care_staff_last_quarter.breakdown.personal_care_workers.value',
    'financials.care_staff_last_quarter.breakdown.care_management_staff.value',
    'financials.care_staff_last_quarter.breakdown.physiotherapists.value',
    'financials.care_staff_last_quarter.breakdown.occupational_therapists.value',
    'financials.care_staff_last_quarter.breakdown.speech_pathologists.value',
    'financials.care_staff_last_quarter.breakdown.podiatrists.value',
    'financials.care_staff_last_quarter.breakdown.dietetics.value',
    'financials.care_staff_last_quarter.breakdown.allied_health_assistants.value',
    'financials.care_staff_last_quarter.breakdown.other_allied_health.value',
    'financials.care_staff_last_quarter.breakdown.lifestyle_recreation.value'
  ];
  
  // Add flattened financial fields
  financialPaths.forEach(path => {
    const value = extractNestedValue(facility, path);
    if (value !== null) {
      flattened[path] = value;
    }
  });
  
  return flattened;
}

// Function to scan all numeric fields in the dataset
function scanAllNumericFields(data) {
  const numericFields = new Set();
  
  data.forEach(facility => {
    Object.keys(facility).forEach(key => {
      const value = facility[key];
      if (typeof value === 'number' && !isNaN(value)) {
        numericFields.add(key);
      }
    });
  });
  
  return Array.from(numericFields).sort();
}

// Scan for all numeric fields in the dataset
console.log('Scanning dataset for all numeric fields...');
const discoveredFields = scanAllNumericFields(data);
console.log(`Found ${discoveredFields.length} numeric fields in dataset`);

// Define comprehensive numeric fields for analysis
const predefinedFields = [
  // Room Cost Fields (calculated per facility)
  'room_cost_min',
  'room_cost_max', 
  'room_cost_median',
  
  // Enhanced Provider Fields
  'provider_id',
  'food_cost_per_day',
  'food_sector_average',
  'food_resident_satisfaction',
  'latitude',
  'longitude',
  
  // NEW: Enhanced Financial Fields - Flat Access Patterns for Box Plots
  'financials.expenditure.total_per_day.value',
  'financials.expenditure.total_per_day.sector_average',
  'financials.expenditure.total_per_day.variance_percentage',
  
  'financials.expenditure.care_nursing.total.value',
  'financials.expenditure.care_nursing.total.sector_average',
  'financials.expenditure.care_nursing.total.variance_percentage',
  'financials.expenditure.care_nursing.breakdown.registered_nurses.value',
  'financials.expenditure.care_nursing.breakdown.enrolled_nurses.value',
  'financials.expenditure.care_nursing.breakdown.personal_care_workers.value',
  'financials.expenditure.care_nursing.breakdown.care_management_staff.value',
  'financials.expenditure.care_nursing.breakdown.allied_health.value',
  'financials.expenditure.care_nursing.breakdown.lifestyle_recreation.value',
  'financials.expenditure.care_nursing.breakdown.other_care_expenses.value',
  
  'financials.expenditure.administration.value',
  'financials.expenditure.administration.sector_average',
  'financials.expenditure.administration.variance_percentage',
  
  'financials.expenditure.cleaning_laundry.total.value',
  'financials.expenditure.cleaning_laundry.total.sector_average',
  'financials.expenditure.cleaning_laundry.total.variance_percentage',
  'financials.expenditure.cleaning_laundry.breakdown.cleaning.value',
  'financials.expenditure.cleaning_laundry.breakdown.laundry.value',
  'financials.expenditure.cleaning_laundry.breakdown.covid_infection_control.value',
  'financials.expenditure.cleaning_laundry.breakdown.other_related.value',
  
  'financials.expenditure.accommodation_maintenance.total.value',
  'financials.expenditure.accommodation_maintenance.total.sector_average',
  'financials.expenditure.accommodation_maintenance.total.variance_percentage',
  'financials.expenditure.accommodation_maintenance.breakdown.accommodation.value',
  'financials.expenditure.accommodation_maintenance.breakdown.maintenance.value',
  
  'financials.expenditure.food_catering.value',
  'financials.expenditure.food_catering.sector_average',
  'financials.expenditure.food_catering.variance_percentage',
  
  'financials.income.total_per_day.value',
  'financials.income.total_per_day.sector_average',
  'financials.income.total_per_day.variance_percentage',
  'financials.income.residents_contribution.value',
  'financials.income.residents_contribution.sector_average',
  'financials.income.residents_contribution.variance_percentage',
  'financials.income.government_funding.value',
  'financials.income.government_funding.sector_average',
  'financials.income.government_funding.variance_percentage',
  'financials.income.other.value',
  'financials.income.other.sector_average',
  'financials.income.other.variance_percentage',
  
  'financials.budget_surplus_deficit_per_day.value',
  'financials.budget_surplus_deficit_per_day.sector_average',
  
  'financials.care_staff_last_quarter.total.value',
  'financials.care_staff_last_quarter.total.sector_average',
  'financials.care_staff_last_quarter.total.variance_percentage',
  'financials.care_staff_last_quarter.breakdown.registered_nurses.value',
  'financials.care_staff_last_quarter.breakdown.enrolled_nurses.value',
  'financials.care_staff_last_quarter.breakdown.personal_care_workers.value',
  'financials.care_staff_last_quarter.breakdown.care_management_staff.value',
  'financials.care_staff_last_quarter.breakdown.physiotherapists.value',
  'financials.care_staff_last_quarter.breakdown.occupational_therapists.value',
  'financials.care_staff_last_quarter.breakdown.speech_pathologists.value',
  'financials.care_staff_last_quarter.breakdown.podiatrists.value',
  'financials.care_staff_last_quarter.breakdown.dietetics.value',
  'financials.care_staff_last_quarter.breakdown.allied_health_assistants.value',
  'financials.care_staff_last_quarter.breakdown.other_allied_health.value',
  'financials.care_staff_last_quarter.breakdown.lifestyle_recreation.value',
  
  // Legacy Financial Variables (for backward compatibility)
  'expenditure_total_per_day',
  'expenditure_care_nursing', 
  'expenditure_administration',
  'expenditure_cleaning_laundry',
  'expenditure_accommodation_maintenance',
  'expenditure_food_catering',
  'income_total_per_day',
  'income_residents_contribution',
  'income_government_funding',
  'income_other',
  'budget_surplus_per_day',
  'care_staff_spending_last_quarter',
  
  // Rating Variables
  'overall_rating_stars',
  'compliance_rating',
  'quality_measures_rating',
  'residents_experience_rating',
  'staffing_rating',
  
  // Capacity Variables
  'residential_places',
  
  // Star Rating System Variables
  'star_Overall Star Rating',
  'star_Compliance rating',
  'star_Quality Measures rating',
  'star_Residents\' Experience rating',
  'star_Staffing rating',
  'star_[RE] Interview Year',
  
  // Staff Care Minutes
  'star_[S] Registered Nurse Care Minutes - Target',
  'star_[S] Registered Nurse Care Minutes - Actual',
  'star_[S] Total Care Minutes - Target',
  'star_[S] Total Care Minutes - Actual',
  
  // Quality Measures
  'star_[QM] Pressure injuries*',
  'star_[QM] Restrictive practices',
  'star_[QM] Unplanned weight loss*',
  'star_[QM] Falls and major injury - falls*',
  'star_[QM] Falls and major injury - major injury from a fall*',
  'star_[QM] Medication management - polypharmacy',
  'star_[QM] Medication management - antipsychotic',
  
  // Residents' Experience Survey Data (44 fields)
  'star_[RE] Food - Always',
  'star_[RE] Food - Most of the time',
  'star_[RE] Food - Some of the time',
  'star_[RE] Food - Never',
  'star_[RE] Safety - Always',
  'star_[RE] Safety - Most of the time',
  'star_[RE] Safety - Some of the time',
  'star_[RE] Safety - Never',
  'star_[RE] Operation - Always',
  'star_[RE] Operation - Most of the time',
  'star_[RE] Operation - Some of the time',
  'star_[RE] Operation - Never',
  'star_[RE] Care Need - Always',
  'star_[RE] Care Need - Most of the time',
  'star_[RE] Care Need - Some of the time',
  'star_[RE] Care Need - Never',
  'star_[RE] Competent - Always',
  'star_[RE] Competent - Most of the time',
  'star_[RE] Competent - Some of the time',
  'star_[RE] Competent - Never',
  'star_[RE] Independent - Always',
  'star_[RE] Independent - Most of the time',
  'star_[RE] Independent - Some of the time',
  'star_[RE] Independent - Never',
  'star_[RE] Explain - Always',
  'star_[RE] Explain - Most of the time',
  'star_[RE] Explain - Some of the time',
  'star_[RE] Explain - Never',
  'star_[RE] Respect - Always',
  'star_[RE] Respect - Most of the time',
  'star_[RE] Respect - Some of the time',
  'star_[RE] Respect - Never',
  'star_[RE] Follow Up - Always',
  'star_[RE] Follow Up - Most of the time',
  'star_[RE] Follow Up - Some of the time',
  'star_[RE] Follow Up - Never',
  'star_[RE] Caring - Always',
  'star_[RE] Caring - Most of the time',
  'star_[RE] Caring - Some of the time',
  'star_[RE] Caring - Never',
  'star_[RE] Voice - Always',
  'star_[RE] Voice - Most of the time',
  'star_[RE] Voice - Some of the time',
  'star_[RE] Voice - Never',
  'star_[RE] Home - Always',
  'star_[RE] Home - Most of the time',
  'star_[RE] Home - Some of the time',
  'star_[RE] Home - Never'
];

// Combine predefined fields with discovered fields (avoiding duplicates)
const numericFields = [...predefinedFields, ...discoveredFields.filter(field => !predefinedFields.includes(field))];

// Remove duplicates and sort
const uniqueNumericFields = [...new Set(numericFields)].sort();

console.log(`Processing ${uniqueNumericFields.length} total numeric fields (including room cost statistics)`);

// Enhance facility data with room cost statistics and flattened financial data
console.log('Calculating room cost statistics and flattening financial data for each facility...');
const enhancedData = data.map(facility => {
  const roomCostStats = extractRoomCostStats(facility);
  const flattenedFinancialData = flattenFinancialData(facility);
  return {
    ...flattenedFinancialData,
    ...roomCostStats
  };
});

console.log('Room cost statistics and financial data flattening completed for all facilities');

// Function to calculate statistics for an array of values
function calculateStats(values) {
  if (!values || values.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      q1: null,
      q3: null,
      iqr: null
    };
  }
  
  const sorted = values.slice().sort((a, b) => a - b);
  const count = sorted.length;
  
  // Mean
  const mean = values.reduce((sum, val) => sum + val, 0) / count;
  
  // Median
  const median = count % 2 === 0 
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];
  
  // Min and Max
  const min = sorted[0];
  const max = sorted[count - 1];
  
  // Quartiles (using proper percentile calculation)
  const q1Index = Math.ceil(count * 0.25) - 1;
  const q3Index = Math.ceil(count * 0.75) - 1;
  const q1 = sorted[Math.max(0, q1Index)];
  const q3 = sorted[Math.min(count - 1, q3Index)];
  const iqr = q3 - q1;
  
  return {
    count,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100
  };
}

// Function to get valid numeric values for a field
function getValidValues(records, field) {
  return records
    .map(record => record[field])
    .filter(value => value !== null && value !== undefined && typeof value === 'number' && !isNaN(value));
}

// Function to validate that individual values fall within calculated ranges
function validateStatistics(records, field, stats) {
  if (!stats || stats.count === 0) return { valid: true, issues: [] };
  
  const values = getValidValues(records, field);
  const issues = [];
  
  values.forEach((value, index) => {
    if (value < stats.min || value > stats.max) {
      const facility = records.find(r => r[field] === value);
      issues.push({
        facility: facility?.['Service Name'] || `Record ${index}`,
        value: value,
        field: field,
        min: stats.min,
        max: stats.max,
        issue: `Value ${value} is outside calculated range [${stats.min}, ${stats.max}]`
      });
    }
  });
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
}

// Function to calculate statistics for a group of records
function calculateGroupStats(records, groupName) {
  const stats = {
    groupName,
    recordCount: records.length,
    fields: {},
    validationIssues: []
  };
  
  uniqueNumericFields.forEach(field => {
    const values = getValidValues(records, field);
    const fieldStats = calculateStats(values);
    stats.fields[field] = fieldStats;
    
    // Validate that individual values fall within calculated ranges
    const validation = validateStatistics(records, field, fieldStats);
    if (!validation.valid) {
      stats.validationIssues.push(...validation.issues);
    }
  });
  
  return stats;
}

console.log('Calculating statistics...');

// 1. Nationwide statistics
console.log('1. Calculating nationwide statistics...');
const nationwideStats = calculateGroupStats(enhancedData, 'Nationwide');

// 2. Statistics by state (using address_state field)
console.log('2. Calculating statistics by state...');
const stateGroups = {};
enhancedData.forEach(record => {
  const state = record.address_state;
  if (state) {
    if (!stateGroups[state]) stateGroups[state] = [];
    stateGroups[state].push(record);
  }
});

const stateStats = Object.keys(stateGroups).map(state => 
  calculateGroupStats(stateGroups[state], state)
);

// 3. Statistics by postcode (using address_postcode field)
console.log('3. Calculating statistics by postcode...');
const postcodeGroups = {};
enhancedData.forEach(record => {
  const postcode = record.address_postcode;
  if (postcode) {
    if (!postcodeGroups[postcode]) postcodeGroups[postcode] = [];
    postcodeGroups[postcode].push(record);
  }
});

const postcodeStats = Object.keys(postcodeGroups).map(postcode => 
  calculateGroupStats(postcodeGroups[postcode], postcode)
);

// 4. Statistics by locality (using address_locality field)
console.log('4. Calculating statistics by locality...');
const localityGroups = {};
enhancedData.forEach(record => {
  const locality = record.address_locality;
  if (locality) {
    if (!localityGroups[locality]) localityGroups[locality] = [];
    localityGroups[locality].push(record);
  }
});

const localityStats = Object.keys(localityGroups).map(locality => 
  calculateGroupStats(localityGroups[locality], locality)
);

// Collect all validation issues
const allValidationIssues = [
  ...nationwideStats.validationIssues,
  ...stateStats.flatMap(s => s.validationIssues),
  ...postcodeStats.flatMap(s => s.validationIssues),
  ...localityStats.flatMap(s => s.validationIssues)
];

// Log validation issues
if (allValidationIssues.length > 0) {
  console.log(`\n⚠️  Found ${allValidationIssues.length} validation issues:`);
  allValidationIssues.slice(0, 10).forEach(issue => {
    console.log(`   • ${issue.facility}: ${issue.field} = ${issue.value} (outside range [${issue.min}, ${issue.max}])`);
  });
  if (allValidationIssues.length > 10) {
    console.log(`   ... and ${allValidationIssues.length - 10} more issues`);
  }
} else {
  console.log('\n✅ All individual facility values fall within calculated statistical ranges');
}

// Compile final results
const results = {
  metadata: {
    generatedAt: new Date().toISOString(),
    totalRecords: enhancedData.length,
    numericFields: uniqueNumericFields.length,
    roomCostFieldsAdded: ['room_cost_min', 'room_cost_max', 'room_cost_median'],
    validationIssues: allValidationIssues.length,
    geographicLevels: {
      states: Object.keys(stateGroups).length,
      postcodes: Object.keys(postcodeGroups).length,
      localities: Object.keys(localityGroups).length
    },
    fieldList: uniqueNumericFields
  },
  nationwide: nationwideStats,
  byState: stateStats,
  byPostcode: postcodeStats,
  byLocality: localityStats,
  validationReport: {
    totalIssues: allValidationIssues.length,
    issuesByField: allValidationIssues.reduce((acc, issue) => {
      acc[issue.field] = (acc[issue.field] || 0) + 1;
      return acc;
    }, {}),
    sampleIssues: allValidationIssues.slice(0, 20)
  }
};

// Save results to both public and non-public folders
const outputFilename = 'Residential_Statistics_Analysis.json';

// Save to non-public folder
const nonPublicPath = path.join('..', 'Maps_ABS_CSV', outputFilename);
fs.writeFileSync(nonPublicPath, JSON.stringify(results, null, 2));
console.log(`✅ Statistics saved to non-public folder: ${nonPublicPath}`);

// Save to public folder
const publicPath = path.join('..', 'public', 'maps', 'abs_csv', outputFilename);
fs.writeFileSync(publicPath, JSON.stringify(results, null, 2));
console.log(`✅ Statistics saved to public folder: ${publicPath}`);

// Print summary
console.log('\n📊 ENHANCED STATISTICAL ANALYSIS COMPLETE');
console.log('=========================================');
console.log(`📋 Total Records Analyzed: ${enhancedData.length}`);
console.log(`📈 Numeric Fields: ${uniqueNumericFields.length}`);
console.log(`🏠 Room Cost Fields Added: 3 (min, max, median)`);
console.log(`🔍 Validation Issues: ${allValidationIssues.length}`);
console.log(`🌏 Geographic Levels:`);
console.log(`   • Nationwide: 1 group`);
console.log(`   • States: ${Object.keys(stateGroups).length} groups`);
console.log(`   • Postcodes: ${Object.keys(postcodeGroups).length} groups`);
console.log(`   • Localities: ${Object.keys(localityGroups).length} groups`);
console.log(`\n📁 Output Files:`);
console.log(`   • ${nonPublicPath}`);
console.log(`   • ${publicPath}`);
console.log('\n✅ Enhanced analysis complete with room cost data and comprehensive field validation!'); 