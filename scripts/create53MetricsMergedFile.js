const fs = require('fs').promises;
const path = require('path');

/**
 * Create merged SA2 file with ALL 53 metrics matching HeatmapDataService
 * Includes pre-calculated medians for optimal performance
 */

async function create53MetricsMergedFile() {
  console.log('🔄 Creating merged SA2 file with all 53 metrics...');
  
  const dataDir = path.join(process.cwd(), 'data', 'sa2');
  
  try {
    // Load all comprehensive data files
    console.log('📥 Loading comprehensive data files...');
    
    const [demographicsData, econData, healthData, dssData] = await Promise.all([
      fs.readFile(path.join(dataDir, 'Demographics_2023_comprehensive.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(dataDir, 'econ_stats_comprehensive.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(dataDir, 'health_stats_comprehensive.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(dataDir, 'DSS_Cleaned_2024_comprehensive.json'), 'utf8').then(JSON.parse)
    ]);
    
    console.log(`📊 Loaded data files:`);
    console.log(`   - Demographics: ${demographicsData.length} records`);
    console.log(`   - Economics: ${econData.length} records`);
    console.log(`   - Health: ${healthData.length} records`);
    console.log(`   - DSS: ${dssData.length} records`);
    
    // Get all unique SA2 regions
    const allSA2Ids = new Set();
    demographicsData.forEach(d => allSA2Ids.add(d['SA2 ID']));
    econData.forEach(d => allSA2Ids.add(d['SA2 ID']));
    healthData.forEach(d => allSA2Ids.add(d['SA2 ID']));
    dssData.forEach(d => allSA2Ids.add(d['SA2 ID']));
    
    console.log(`🗺️ Found ${allSA2Ids.size} unique SA2 regions`);
    
    // Create merged data structure
    const mergedData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRegions: allSA2Ids.size,
        totalMetrics: 53,
        sourceFiles: [
          'Demographics_2023_comprehensive.json',
          'econ_stats_comprehensive.json', 
          'health_stats_comprehensive.json',
          'DSS_Cleaned_2024_comprehensive.json'
        ],
        metricsBreakdown: {
          demographics: 9,
          economics: 10,
          healthStats: 16,
          healthcare: 18
        },
        medians: {}
      },
      regions: []
    };
    
    // Process each SA2 region
    console.log('🔄 Merging data by SA2 region...');
    
    for (const sa2Id of allSA2Ids) {
      // Get SA2 name (use first available)
      let sa2Name = 'Unknown';
      const demoRecord = demographicsData.find(d => d['SA2 ID'] === sa2Id);
      const econRecord = econData.find(d => d['SA2 ID'] === sa2Id);
      const healthRecord = healthData.find(d => d['SA2 ID'] === sa2Id);
      const dssRecord = dssData.find(d => d['SA2 ID'] === sa2Id);
      
      if (demoRecord) sa2Name = demoRecord['SA2 Name'];
      else if (econRecord) sa2Name = econRecord['SA2 Name'];
      else if (healthRecord) sa2Name = healthRecord['SA2 Name'];
      else if (dssRecord) sa2Name = dssRecord['SA2 Name'];
      
      const regionData = {
        id: sa2Id,
        name: sa2Name,
        metrics: {}
      };
      
      // Add demographics metrics (9 metrics)
      demographicsData
        .filter(d => d['SA2 ID'] === sa2Id)
        .forEach(record => {
          const metricKey = `Demographics_${record.Description}`;
          regionData.metrics[metricKey] = record.Amount;
        });
      
      // Add economics metrics (10 metrics)
      econData
        .filter(d => d['SA2 ID'] === sa2Id)
        .forEach(record => {
          const metricKey = `Economics_${record.Description}`;
          regionData.metrics[metricKey] = record.Amount;
        });
      
      // Add health statistics metrics (16 metrics)
      healthData
        .filter(d => d['SA2 ID'] === sa2Id)
        .forEach(record => {
          const metricKey = `Health_${record.Description}`;
          regionData.metrics[metricKey] = record.Amount;
        });
      
      // Add healthcare/DSS metrics (18 metrics)
      dssData
        .filter(d => d['SA2 ID'] === sa2Id)
        .forEach(record => {
          const metricKey = `Healthcare_${record.Category}_${record.Type}`;
          regionData.metrics[metricKey] = record.Amount;
        });
      
      mergedData.regions.push(regionData);
    }
    
    // Calculate medians for all metrics
    console.log('📊 Calculating medians for all 53 metrics...');
    
    const allMetricKeys = new Set();
    mergedData.regions.forEach(region => {
      Object.keys(region.metrics).forEach(key => allMetricKeys.add(key));
    });
    
    console.log(`🔍 Found ${allMetricKeys.size} unique metrics`);
    
    for (const metricKey of allMetricKeys) {
      const values = mergedData.regions
        .map(region => region.metrics[metricKey])
        .filter(value => value != null && !isNaN(value))
        .sort((a, b) => a - b);
      
      if (values.length > 0) {
        const midIndex = Math.floor(values.length / 2);
        const median = values.length % 2 === 0
          ? (values[midIndex - 1] + values[midIndex]) / 2
          : values[midIndex];
        
        // Store median with the pipe-separated format that matches the loading system
        const formattedKey = metricKey.replace(/_(.*)/, ' | $1');
        mergedData.metadata.medians[formattedKey] = median;
      }
    }
    
    // Update metadata with actual counts
    mergedData.metadata.totalMetrics = allMetricKeys.size;
    mergedData.metadata.mediansCalculated = Object.keys(mergedData.metadata.medians).length;
    
    // Write merged file
    const outputPath = path.join(dataDir, 'merged_sa2_data_comprehensive.json');
    await fs.writeFile(outputPath, JSON.stringify(mergedData, null, 2));
    
    // Get file size
    const stats = await fs.stat(outputPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('✅ Merged SA2 data file created successfully!');
    console.log(`📍 Location: ${outputPath}`);
    console.log(`📊 Regions: ${mergedData.regions.length}`);
    console.log(`📈 Metrics: ${allMetricKeys.size}/53`);
    console.log(`📊 Medians: ${Object.keys(mergedData.metadata.medians).length}`);
    console.log(`💾 File size: ${fileSizeMB} MB`);
    
    // Verify we have exactly 53 metrics
    if (allMetricKeys.size === 53) {
      console.log('🎉 SUCCESS: All 53 metrics present and accounted for!');
    } else {
      console.log(`⚠️  WARNING: Expected 53 metrics, found ${allMetricKeys.size}`);
    }
    
    return {
      totalRegions: mergedData.regions.length,
      totalMetrics: allMetricKeys.size,
      filePath: outputPath,
      fileSizeMB: parseFloat(fileSizeMB)
    };
    
  } catch (error) {
    console.error('❌ Error creating merged file:', error);
    throw error;
  }
}

// Run the merge process
create53MetricsMergedFile()
  .then(result => {
    console.log('🎯 Merge complete! System ready with 53 metrics.');
    console.log(`   📊 ${result.totalRegions} regions × ${result.totalMetrics} metrics`);
    console.log(`   💾 Output: ${result.fileSizeMB} MB merged file`);
  })
  .catch(console.error); 