const fs = require('fs');
const path = require('path');

async function mergeSA2Correspondence() {
  console.log('🚀 Starting SA2 correspondence merge...');
  
  try {
    // Read the correspondence file
    console.log('📖 Reading SA2_2021_AUST.json...');
    const correspondenceData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/sa2/SA2_2021_AUST.json'), 'utf8')
    );
    
    // Create a lookup map for faster searching
    console.log('🗺️  Creating correspondence lookup map...');
    const correspondenceMap = new Map();
    correspondenceData.forEach(record => {
      correspondenceMap.set(record.SA2_CODE_2021, {
        SA3_CODE_2021: record.SA3_CODE_2021,
        SA3_NAME_2021: record.SA3_NAME_2021,
        SA4_CODE_2021: record.SA4_CODE_2021,
        SA4_NAME_2021: record.SA4_NAME_2021,
        STATE_CODE_2021: record.STATE_CODE_2021,
        STATE_NAME_2021: record.STATE_NAME_2021
      });
    });
    
    console.log(`✅ Loaded ${correspondenceMap.size} correspondence records`);
    
    // Read the merged SA2 data
    console.log('📖 Reading merged_sa2_data_comprehensive.json...');
    const mergedData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/sa2/merged_sa2_data_comprehensive.json'), 'utf8')
    );
    
    console.log(`✅ Loaded ${mergedData.regions.length} SA2 records`);
    
    // Merge the data
    console.log('🔄 Merging correspondence data...');
    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedIds = [];
    
    mergedData.regions.forEach((sa2Record, index) => {
      const correspondenceInfo = correspondenceMap.get(sa2Record.id);
      
      if (correspondenceInfo) {
        // Add the correspondence fields to the SA2 record
        sa2Record.SA3_CODE_2021 = correspondenceInfo.SA3_CODE_2021;
        sa2Record.SA3_NAME_2021 = correspondenceInfo.SA3_NAME_2021;
        sa2Record.SA4_CODE_2021 = correspondenceInfo.SA4_CODE_2021;
        sa2Record.SA4_NAME_2021 = correspondenceInfo.SA4_NAME_2021;
        sa2Record.STATE_CODE_2021 = correspondenceInfo.STATE_CODE_2021;
        sa2Record.STATE_NAME_2021 = correspondenceInfo.STATE_NAME_2021;
        matchedCount++;
        
                 if (index % 500 === 0) {
           console.log(`   Processed ${index + 1}/${mergedData.regions.length} records...`);
         }
      } else {
        unmatchedCount++;
        unmatchedIds.push(sa2Record.id);
        console.log(`⚠️  No correspondence found for SA2 ID: ${sa2Record.id} (${sa2Record.name})`);
      }
    });
    
    // Update metadata
    mergedData.metadata.lastCorrespondenceUpdate = new Date().toISOString();
    mergedData.metadata.correspondenceMatched = matchedCount;
    mergedData.metadata.correspondenceUnmatched = unmatchedCount;
    
    // Create backup of original file
    const backupPath = path.join(__dirname, '../data/sa2/merged_sa2_data_comprehensive_backup.json');
    console.log('💾 Creating backup of original file...');
    fs.copyFileSync(
      path.join(__dirname, '../data/sa2/merged_sa2_data_comprehensive.json'),
      backupPath
    );
    
    // Write the updated data
    console.log('💾 Writing updated merged_sa2_data_comprehensive.json...');
    fs.writeFileSync(
      path.join(__dirname, '../data/sa2/merged_sa2_data_comprehensive.json'),
      JSON.stringify(mergedData, null, 2),
      'utf8'
    );
    
    console.log('✅ Merge completed successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total SA2 records: ${mergedData.regions.length}`);
    console.log(`   - Successfully matched: ${matchedCount}`);
    console.log(`   - Unmatched: ${unmatchedCount}`);
    
    if (unmatchedIds.length > 0 && unmatchedIds.length <= 10) {
      console.log(`⚠️  Unmatched SA2 IDs: ${unmatchedIds.join(', ')}`);
    } else if (unmatchedIds.length > 10) {
      console.log(`⚠️  First 10 unmatched SA2 IDs: ${unmatchedIds.slice(0, 10).join(', ')}...`);
    }
    
    console.log(`💾 Backup saved to: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Error during merge:', error);
    process.exit(1);
  }
}

// Run the merge
mergeSA2Correspondence(); 