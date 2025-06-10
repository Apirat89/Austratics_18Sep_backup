import fs from 'fs/promises';
import path from 'path';

// Import the existing merge functionality
import { getMergedSA2Data, listAllMetrics, clearCache } from '../lib/mergeSA2Data';

interface ComprehensiveMergedDataOutput {
  metadata: {
    regionCount: number;
    metricCount: number;
    datasetSources: string[];
    generatedAt: string;
    medians: { [metric: string]: number };
    description: string;
  };
  data: any;
}

/**
 * Creates a comprehensive merged SA2 data file with all regions and median calculations
 */
async function createComprehensiveMergedFile() {
  console.log('🔄 Starting comprehensive merged SA2 data file creation...');
  
  try {
    // Clear cache to force reload of new comprehensive files
    clearCache();
    
    // Get merged data from existing system (now using comprehensive files)
    const mergedData = await getMergedSA2Data();
    const allMetrics = await listAllMetrics();
    
    console.log(`📊 Loaded ${Object.keys(mergedData).length} SA2 regions`);
    console.log(`📊 Found ${allMetrics.length} unique metrics`);
    
    // Calculate medians for all metrics
    console.log('🔢 Calculating medians for all metrics...');
    const medians: { [metric: string]: number } = {};
    
    for (const metric of allMetrics) {
      const values: number[] = [];
      
      // Collect all values for this metric across all SA2 regions
      for (const sa2Id in mergedData) {
        const sa2Data = mergedData[sa2Id];
        const value = sa2Data[metric];
        if (typeof value === 'number' && !isNaN(value)) {
          values.push(value);
        }
      }
      
      // Calculate median
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        if (values.length % 2 === 0) {
          medians[metric] = (values[mid - 1] + values[mid]) / 2;
        } else {
          medians[metric] = values[mid];
        }
      }
    }
    
    console.log(`✅ Calculated medians for ${Object.keys(medians).length} metrics`);
    
    // Create output structure
    const output: ComprehensiveMergedDataOutput = {
      metadata: {
        regionCount: Object.keys(mergedData).length,
        metricCount: allMetrics.length,
        datasetSources: [
          'Demographics_2023_comprehensive.json',
          'econ_stats_comprehensive.json',
          'health_stats_comprehensive.json',
          'DSS_Cleaned_2024_comprehensive.json'
        ],
        generatedAt: new Date().toISOString(),
        medians,
        description: 'Comprehensive SA2 data covering all major Australian regions with healthcare, demographics, economics, and aged care metrics. Generated from 4 comprehensive datasets with realistic healthcare data across 2,456+ SA2 regions.'
      },
      data: mergedData
    };
    
    // Write to file
    const outputPath = path.join(process.cwd(), 'data', 'sa2', 'merged_sa2_data_comprehensive.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`✅ Comprehensive merged SA2 data file created: ${outputPath}`);
    console.log(`📋 Summary:`);
    console.log(`   - Regions: ${output.metadata.regionCount}`);
    console.log(`   - Metrics: ${output.metadata.metricCount}`);
    console.log(`   - Medians calculated: ${Object.keys(medians).length}`);
    console.log(`   - File size: ${(JSON.stringify(output).length / 1024 / 1024).toFixed(2)} MB`);
    
    // Also create a compact version for API use (without metadata bloat)
    const compactOutputPath = path.join(process.cwd(), 'data', 'sa2', 'merged_sa2_compact.json');
    const compactOutput = {
      regionCount: output.metadata.regionCount,
      metricCount: output.metadata.metricCount,
      medians: output.metadata.medians,
      data: output.data
    };
    
    await fs.writeFile(compactOutputPath, JSON.stringify(compactOutput, null, 2));
    console.log(`✅ Compact version created: merged_sa2_compact.json`);
    
    return output;
    
  } catch (error) {
    console.error('❌ Error creating comprehensive merged file:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createComprehensiveMergedFile()
    .then(() => console.log('🎉 Comprehensive merged file creation complete!'))
    .catch(console.error);
}

export { createComprehensiveMergedFile }; 