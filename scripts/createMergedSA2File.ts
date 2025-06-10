import fs from 'fs/promises';
import path from 'path';

// Import the existing merge functionality
import { getMergedSA2Data, listAllMetrics, convertToLongFormat } from '../lib/mergeSA2Data';

interface MergedDataOutput {
  metadata: {
    regionCount: number;
    metricCount: number;
    datasetSources: string[];
    generatedAt: string;
    medians: { [metric: string]: number };
  };
  data: any;
}

/**
 * Creates a fully merged SA2 data file with all metrics and median calculations
 */
async function createMergedSA2File() {
  console.log('🔄 Starting merged SA2 data file creation...');
  
  try {
    // Get merged data from existing system
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
    const output: MergedDataOutput = {
      metadata: {
        regionCount: Object.keys(mergedData).length,
        metricCount: allMetrics.length,
        datasetSources: [
          'Demographics_2023_expanded.json',
          'econ_stats_expanded.json',
          'health_stats_expanded.json',
          'DSS_Cleaned_2024_expanded.json'
        ],
        generatedAt: new Date().toISOString(),
        medians
      },
      data: mergedData
    };
    
    // Write to file
    const outputPath = path.join(process.cwd(), 'data', 'sa2', 'merged_sa2_data_complete.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`✅ Merged SA2 data file created: ${outputPath}`);
    console.log(`📋 Summary:`);
    console.log(`   - Regions: ${output.metadata.regionCount}`);
    console.log(`   - Metrics: ${output.metadata.metricCount}`);
    console.log(`   - Medians calculated: ${Object.keys(medians).length}`);
    console.log(`   - File size: ${(JSON.stringify(output).length / 1024 / 1024).toFixed(2)} MB`);
    
    return output;
    
  } catch (error) {
    console.error('❌ Error creating merged file:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createMergedSA2File()
    .then(() => console.log('🎉 Merged file creation complete!'))
    .catch(console.error);
}

export { createMergedSA2File }; 