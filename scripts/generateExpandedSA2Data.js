#!/usr/bin/env node

/**
 * Generate Expanded SA2 Data Script
 * 
 * Creates expanded sample SA2 data files with 100 regions for testing
 * the scatter plot visualization with many more data points.
 */

const { writeSampleDataFiles } = require('../lib/generateSampleSA2Data');

async function main() {
  try {
    console.log('🏗️ Generating expanded SA2 data files...');
    console.log('📊 Creating 100 sample SA2 regions across NSW, VIC, QLD');
    
    await writeSampleDataFiles('data/sa2', 100);
    
    console.log('');
    console.log('✅ Success! Expanded SA2 data files created:');
    console.log('   📁 data/sa2/Demographics_2023_expanded.json');
    console.log('   📁 data/sa2/DSS_Cleaned_2024_expanded.json');
    console.log('   📁 data/sa2/econ_stats_expanded.json');
    console.log('   📁 data/sa2/health_stats_expanded.json');
    console.log('');
    console.log('📈 Each file contains data for 100 SA2 regions');
    console.log('🎯 Your scatter plots will now show many more data points!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Update your data loading to use the expanded files');
    console.log('   2. Restart your development server');
    console.log('   3. Create a new scatter plot to see 100+ regions');
    
  } catch (error) {
    console.error('❌ Failed to generate expanded data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 