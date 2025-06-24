import fs from 'fs/promises';
import path from 'path';

/**
 * Generates comprehensive SA2 data covering all major Australian regions
 * Based on real SA2 structure but with generated healthcare data
 * MATCHES the 53 metrics from HeatmapDataService for maps page compatibility
 */

interface SA2Record {
  'SA2 ID': string;
  'SA2 Name': string;
  [key: string]: string | number;
}

interface DemographicsRecord extends SA2Record {
  'Description': string;
  'Amount': number;
}

interface EconHealthRecord extends SA2Record {
  'Parent Description': string;
  'Description': string;
  'Amount': number;
}

interface DSSRecord extends SA2Record {
  'Category': string;
  'Type': string;  
  'Amount': number;
}

// Match exactly with HeatmapDataService - 53 total metrics
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COMPREHENSIVE_METRICS = {
  // Healthcare - 18 metrics (3 programs × 6 metrics each)
  healthcare: {
    'Commonwealth Home Support Program': [
      'Number of Participants', 'Spending', 'Number of Providers',
      'Participants per provider', 'Spending per provider', 'Spending per participant'
    ],
    'Home Care': [
      'Number of Participants', 'Spending', 'Number of Providers', 
      'Participants per provider', 'Spending per provider', 'Spending per participant'
    ],
    'Residential Care': [
      'Number of Participants', 'Spending', 'Number of Providers',
      'Participants per provider', 'Spending per provider', 'Spending per participant'
    ]
  },
  
  // Demographics - 9 metrics
  demographics: {
    'Population': [
      'Estimated resident population (no.)',
      'Population density (persons/km2)'
    ],
    'Age Groups': [
      'Median age - persons (years)',
      'Persons - 55-64 years (%)',
      'Persons - 55-64 years (no.)',
      'Persons - 65 years and over (%)',
      'Persons - 65 years and over (no.)'
    ],
    'Working Age': [
      'Working age population (aged 15-64 years) (%)',
      'Working age population (aged 15-64 years) (no.)'
    ]
  },
  
  // Economics - 10 metrics
  economics: {
    'Employment': [
      '% of total Census responding population employed',
      'Unemployment rate (%)'
    ],
    'Income': [
      'Median employee income ($)',
      'Median superannuation and annuity income ($)'
    ],
    'Housing': [
      'Median price of attached dwelling transfers ($)',
      'Median weekly household rental payment ($)',
      'Owned outright (%)',
      'Owned outright (no.)'
    ],
    'Socio-Economic Index': [
      'SEIFA Index of relative socio-economic advantage and disadvantage (IRSAD) - rank within Australia (decile)',
      'SEIFA Index of relative socio-economic disadvantage (IRSD) - rank within Australia (decile)'
    ]
  },
  
  // Health Statistics - 16 metrics
  healthStats: {
    'Core Activity Need': [
      'Persons who have need for assistance with core activities (%)',
      'Persons who have need for assistance with core activities (no.)'
    ],
    'Household Composition': [
      'Lone person households (no.)',
      'Provided unpaid assistance (%)'
    ],
    'Health Conditions': [
      'Arthritis (%)',
      'Asthma (%)',
      'Cancer (including remission) (%)',
      'Dementia (including Alzheimer\'s) (%)',
      'Diabetes (excluding gestational diabetes) (%)',
      'Heart disease (including heart attack or angina) (%)',
      'Kidney disease (%)',
      'Lung condition (including COPD or emphysema) (%)',
      'Mental health condition (including depression or anxiety) (%)',
      'Stroke (%)',
      'Other long-term health condition(s) (%)',
      'No long-term health condition(s) (%)'
    ]
  }
};

// Australian states and major regions - realistic structure
const stateRegions = {
  NSW: {
    code: '1',
    regions: [
      'Sydney', 'Newcastle', 'Wollongong', 'Central Coast', 'Blue Mountains', 'Hawkesbury', 'Richmond', 'Camden', 'Liverpool', 'Blacktown',
      'Parramatta', 'Penrith', 'Canterbury', 'Bankstown', 'Fairfield', 'Cabramatta', 'Campbelltown', 'Sutherland', 'Cronulla', 'Miranda',
      'Hurstville', 'Kogarah', 'Rockdale', 'Botany', 'Randwick', 'Waverley', 'Woollahra', 'Mosman', 'North Sydney', 'Willoughby',
      'Lane Cove', 'Ryde', 'Hunters Hill', 'Eastwood', 'Epping', 'Hornsby', 'Ku-ring-gai', 'Warringah', 'Pittwater', 'Manly',
      'Albury', 'Wagga Wagga', 'Orange', 'Bathurst', 'Dubbo', 'Tamworth', 'Armidale', 'Grafton', 'Lismore', 'Byron Bay',
      'Tweed Heads', 'Ballina', 'Casino', 'Coffs Harbour', 'Port Macquarie', 'Taree', 'Forster', 'Nelson Bay', 'Maitland', 'Cessnock'
    ]
  },
  VIC: {
    code: '2',
    regions: [
      'Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Warrnambool', 'Horsham', 'Sale', 'Moe', 'Wonthaggi',
      'Brighton', 'St Kilda', 'Richmond', 'Collingwood', 'Fitzroy', 'Carlton', 'Brunswick', 'Coburg', 'Preston', 'Reservoir',
      'Heidelberg', 'Ivanhoe', 'Kew', 'Hawthorn', 'Camberwell', 'Toorak', 'South Yarra', 'Prahran', 'Windsor', 'Southbank',
      'Docklands', 'Port Melbourne', 'Albert Park', 'Middle Park', 'Elwood', 'Caulfield', 'Glen Iris', 'Malvern', 'Armadale', 'Kooyong',
      'Frankston', 'Dandenong', 'Pakenham', 'Cranbourne', 'Berwick', 'Narre Warren', 'Hallam', 'Noble Park', 'Springvale', 'Clayton'
    ]
  },
  QLD: {
    code: '3',
    regions: [
      'Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns', 'Toowoomba', 'Rockhampton', 'Mackay', 'Bundaberg', 'Hervey Bay',
      'Ipswich', 'Logan', 'Redland', 'Moreton Bay', 'Pine Rivers', 'Caboolture', 'Bribie Island', 'Caloundra', 'Maroochydore', 'Noosa',
      'Southport', 'Surfers Paradise', 'Robina', 'Nerang', 'Broadbeach', 'Burleigh Heads', 'Coolangatta', 'Tweed', 'Byron', 'Ballina',
      'Mount Isa', 'Charters Towers', 'Ayr', 'Bowen', 'Proserpine', 'Cannonvale', 'Airlie Beach', 'Emerald', 'Clermont', 'Moranbah',
      'Gladstone', 'Yeppoon', 'Biloela', 'Chinchilla', 'Dalby', 'Kingaroy', 'Maryborough', 'Gympie', 'Cooroy', 'Tewantin'
    ]
  },
  WA: {
    code: '5',
    regions: [
      'Perth', 'Fremantle', 'Joondalup', 'Rockingham', 'Mandurah', 'Bunbury', 'Geraldton', 'Kalgoorlie', 'Albany', 'Broome',
      'Subiaco', 'Nedlands', 'Claremont', 'Cottesloe', 'Mosman Park', 'Peppermint Grove', 'East Fremantle', 'Melville', 'Canning', 'Gosnells',
      'Armadale', 'Serpentine', 'Mundaring', 'Kalamunda', 'Swan', 'Chittering', 'Toodyay', 'York', 'Northam', 'Beverley',
      'Port Hedland', 'Karratha', 'Newman', 'Tom Price', 'Paraburdoo', 'Onslow', 'Exmouth', 'Carnarvon', 'Shark Bay', 'Kalbarri',
      'Jurien Bay', 'Cervantes', 'Lancelin', 'Gingin', 'Chittering', 'Bindoon', 'Gidgegannup', 'Mundaring', 'Sawyers Valley', 'Paulls Valley'
    ]
  },
  SA: {
    code: '4',
    regions: [
      'Adelaide', 'Mount Gambier', 'Whyalla', 'Port Augusta', 'Port Pirie', 'Murray Bridge', 'Victor Harbor', 'Goolwa', 'Strathalbyn', 'Mount Barker',
      'Unley', 'Burnside', 'Norwood', 'Payneham', 'St Peters', 'Walkerville', 'Prospect', 'Enfield', 'Port Adelaide', 'West Torrens',
      'Marion', 'Holdfast Bay', 'Brighton', 'Mitcham', 'Blackwood', 'Aberfoyle Park', 'Happy Valley', 'Morphett Vale', 'Onkaparinga', 'Aldinga',
      'Renmark', 'Berri', 'Loxton', 'Waikerie', 'Barmera', 'Tanunda', 'Nuriootpa', 'Angaston', 'Gawler', 'Elizabeth',
      'Salisbury', 'Tea Tree Gully', 'Modbury', 'Golden Grove', 'Greenwith', 'Hope Valley', 'Ridgehaven', 'Highbury', 'Dernancourt', 'Fairview Park'
    ]
  },
  TAS: {
    code: '6',
    regions: [
      'Hobart', 'Launceston', 'Devonport', 'Burnie', 'Ulverstone', 'Wynyard', 'Somerset', 'Smithton', 'Scottsdale', 'St Helens',
      'Battery Point', 'South Hobart', 'Mount Wellington', 'Glenorchy', 'Claremont', 'Rosny Park', 'Bellerive', 'Howrah', 'Sorell', 'Richmond',
      'New Norfolk', 'Brighton', 'Pontville', 'Kempton', 'Oatlands', 'Campbell Town', 'Ross', 'Longford', 'Perth', 'Westbury',
      'George Town', 'Low Head', 'Bridport', 'Lilydale', 'Derby', 'Ringarooma', 'Branxholm', 'Winnaleah', 'Gladstone', 'Currie'
    ]
  },
  NT: {
    code: '7',
    regions: [
      'Darwin', 'Alice Springs', 'Katherine', 'Tennant Creek', 'Nhulunbuy', 'Palmerston', 'Humpty Doo', 'Howard Springs', 'Batchelor', 'Pine Creek',
      'Casuarina', 'Nakara', 'Wanguri', 'Jingili', 'Anula', 'Malak', 'Marrara', 'Leanyer', 'Sanderson', 'Holmes',
      'Jabiru', 'Gunbalanya', 'Maningrida', 'Ramingining', 'Galiwin-ku', 'Gapuwiyak', 'Yirrkala', 'Groote Eylandt', 'Numbulwar', 'Ngukurr',
      'Daly Waters', 'Elliott', 'Mataranka', 'Larrimah', 'Adelaide River', 'Hayes Creek', 'Noonamah', 'Virginia', 'Berry Springs', 'Litchfield'
    ]
  },
  ACT: {
    code: '8',
    regions: [
      'Canberra', 'Belconnen', 'Woden', 'Tuggeranong', 'Gungahlin', 'Civic', 'Barton', 'Parkes', 'Russell', 'Acton',
      'Turner', 'Braddon', 'Reid', 'Campbell', 'Forrest', 'Yarralumla', 'Deakin', 'Red Hill', 'Garran', 'Hughes',
      'Curtin', 'Weston', 'Holder', 'Duffy', 'Rivett', 'Chapman', 'Stirling', 'Fisher', 'Waramanga', 'Cook',
      'Hawker', 'Page', 'Scullin', 'Higgins', 'Holt', 'Latham', 'Macgregor', 'Dunlop', 'Fraser', 'Charnwood'
    ]
  }
};

// Generate comprehensive SA2 data matching HeatmapDataService exactly
function generateComprehensiveSA2Data() {
  const demographicsData: DemographicsRecord[] = [];
  const econData: EconHealthRecord[] = [];
  const healthData: EconHealthRecord[] = [];
  const dssData: DSSRecord[] = [];

  let sa2Counter = 1;

  // Generate for each state/territory
  Object.entries(stateRegions).forEach(([, stateInfo]) => {
    stateInfo.regions.forEach((regionBase, regionIndex) => {
      // Generate multiple SA2s per region (suburbs/areas)
      const variations = ['North', 'South', 'East', 'West', 'Central', 'Inner', 'Outer'];
      const numSA2s = Math.floor(Math.random() * 8) + 3; // 3-10 SA2s per region
      
      for (let i = 0; i < numSA2s; i++) {
        const sa2Id = `${stateInfo.code}${String(regionIndex + 1).padStart(2, '0')}${String(sa2Counter).padStart(3, '0')}`;
        const variation = i < variations.length ? variations[i] : `Area ${i + 1}`;
        const sa2Name = i === 0 ? regionBase : `${regionBase} ${variation}`;
        
        // Base demographics influenced by state and region type
        const isMetropolitan = regionIndex < 20; // First 20 regions per state are metro
        const populationBase = isMetropolitan ? 8000 + Math.random() * 12000 : 2000 + Math.random() * 6000;
        const ageMedian = 35 + Math.random() * 20;
        const densityBase = isMetropolitan ? 1500 + Math.random() * 2000 : 100 + Math.random() * 500;
        
        // DEMOGRAPHICS - 9 metrics matching HeatmapDataService exactly
        const demographics = [
          { desc: 'Estimated resident population (no.)', value: Math.floor(populationBase) },
          { desc: 'Population density (persons/km2)', value: Math.floor(densityBase) },
          { desc: 'Median age - persons (years)', value: Math.floor(ageMedian) },
          { desc: 'Persons - 55-64 years (%)', value: 8 + Math.random() * 15 },
          { desc: 'Persons - 55-64 years (no.)', value: Math.floor(populationBase * (0.08 + Math.random() * 0.15)) },
          { desc: 'Persons - 65 years and over (%)', value: 12 + Math.random() * 18 },
          { desc: 'Persons - 65 years and over (no.)', value: Math.floor(populationBase * (0.12 + Math.random() * 0.18)) },
          { desc: 'Working age population (aged 15-64 years) (%)', value: 60 + Math.random() * 15 },
          { desc: 'Working age population (aged 15-64 years) (no.)', value: Math.floor(populationBase * (0.60 + Math.random() * 0.15)) }
        ];
        
        demographics.forEach(demo => {
          demographicsData.push({
            'SA2 ID': sa2Id,
            'SA2 Name': sa2Name,
            'Description': demo.desc,
            'Amount': demo.value
          });
        });

        // ECONOMICS - 10 metrics matching HeatmapDataService exactly
        const economics = [
          { parent: 'Employment', desc: '% of total Census responding population employed', value: 50 + Math.random() * 25 },
          { parent: 'Employment', desc: 'Unemployment rate (%)', value: 3 + Math.random() * 12 },
          { parent: 'Income', desc: 'Median employee income ($)', value: Math.floor(40000 + Math.random() * 60000) },
          { parent: 'Income', desc: 'Median superannuation and annuity income ($)', value: Math.floor(5000 + Math.random() * 25000) },
          { parent: 'Housing', desc: 'Median price of attached dwelling transfers ($)', value: Math.floor(400000 + Math.random() * 800000) },
          { parent: 'Housing', desc: 'Median weekly household rental payment ($)', value: Math.floor(200 + Math.random() * 400) },
          { parent: 'Housing', desc: 'Owned outright (%)', value: 20 + Math.random() * 40 },
          { parent: 'Housing', desc: 'Owned outright (no.)', value: Math.floor(populationBase * 0.3 * (0.20 + Math.random() * 0.40)) },
          { parent: 'Socio-Economic Index', desc: 'SEIFA Index of relative socio-economic advantage and disadvantage (IRSAD) - rank within Australia (decile)', value: Math.floor(1 + Math.random() * 10) },
          { parent: 'Socio-Economic Index', desc: 'SEIFA Index of relative socio-economic disadvantage (IRSD) - rank within Australia (decile)', value: Math.floor(1 + Math.random() * 10) }
        ];
        
        economics.forEach(econ => {
          econData.push({
            'SA2 ID': sa2Id,
            'SA2 Name': sa2Name,
            'Parent Description': econ.parent,
            'Description': econ.desc,
            'Amount': econ.value
          });
        });

        // HEALTH STATISTICS - 16 metrics matching HeatmapDataService exactly
        const healthConditions = [
          { parent: 'Core Activity Need', desc: 'Persons who have need for assistance with core activities (%)', value: 4 + Math.random() * 8 },
          { parent: 'Core Activity Need', desc: 'Persons who have need for assistance with core activities (no.)', value: Math.floor(populationBase * (0.04 + Math.random() * 0.08)) },
          { parent: 'Household Composition', desc: 'Lone person households (no.)', value: Math.floor(populationBase * 0.4 * (0.20 + Math.random() * 0.20)) },
          { parent: 'Household Composition', desc: 'Provided unpaid assistance (%)', value: 8 + Math.random() * 15 },
          { parent: 'Health Conditions', desc: 'Arthritis (%)', value: 8 + Math.random() * 20 },
          { parent: 'Health Conditions', desc: 'Asthma (%)', value: 6 + Math.random() * 12 },
          { parent: 'Health Conditions', desc: 'Cancer (including remission) (%)', value: 2 + Math.random() * 8 },
          { parent: 'Health Conditions', desc: 'Dementia (including Alzheimer\'s) (%)', value: 1 + Math.random() * 4 },
          { parent: 'Health Conditions', desc: 'Diabetes (excluding gestational diabetes) (%)', value: 4 + Math.random() * 12 },
          { parent: 'Health Conditions', desc: 'Heart disease (including heart attack or angina) (%)', value: 3 + Math.random() * 12 },
          { parent: 'Health Conditions', desc: 'Kidney disease (%)', value: 1 + Math.random() * 6 },
          { parent: 'Health Conditions', desc: 'Lung condition (including COPD or emphysema) (%)', value: 2 + Math.random() * 8 },
          { parent: 'Health Conditions', desc: 'Mental health condition (including depression or anxiety) (%)', value: 8 + Math.random() * 20 },
          { parent: 'Health Conditions', desc: 'Stroke (%)', value: 1 + Math.random() * 5 },
          { parent: 'Health Conditions', desc: 'Other long-term health condition(s) (%)', value: 10 + Math.random() * 25 },
          { parent: 'Health Conditions', desc: 'No long-term health condition(s) (%)', value: 30 + Math.random() * 40 }
        ];
        
        healthConditions.forEach(condition => {
          healthData.push({
            'SA2 ID': sa2Id,
            'SA2 Name': sa2Name,
            'Parent Description': condition.parent,
            'Description': condition.desc,
            'Amount': condition.value
          });
        });

        // HEALTHCARE/DSS - 18 metrics matching HeatmapDataService exactly
        const healthcarePrograms = [
          // Commonwealth Home Support Program - 6 metrics
          { category: 'Commonwealth Home Support Program', type: 'Number of Participants', value: Math.floor(200 + Math.random() * 600) },
          { category: 'Commonwealth Home Support Program', type: 'Spending', value: Math.floor(300000 + Math.random() * 1200000) },
          { category: 'Commonwealth Home Support Program', type: 'Number of Providers', value: Math.floor(5 + Math.random() * 20) },
          { category: 'Commonwealth Home Support Program', type: 'Participants per provider', value: Math.floor(10 + Math.random() * 50) },
          { category: 'Commonwealth Home Support Program', type: 'Spending per provider', value: Math.floor(50000 + Math.random() * 200000) },
          { category: 'Commonwealth Home Support Program', type: 'Spending per participant', value: Math.floor(1000 + Math.random() * 5000) },
          
          // Home Care - 6 metrics
          { category: 'Home Care', type: 'Number of Participants', value: Math.floor(300 + Math.random() * 500) },
          { category: 'Home Care', type: 'Spending', value: Math.floor(500000 + Math.random() * 1000000) },
          { category: 'Home Care', type: 'Number of Providers', value: Math.floor(8 + Math.random() * 15) },
          { category: 'Home Care', type: 'Participants per provider', value: Math.floor(15 + Math.random() * 40) },
          { category: 'Home Care', type: 'Spending per provider', value: Math.floor(60000 + Math.random() * 150000) },
          { category: 'Home Care', type: 'Spending per participant', value: Math.floor(1500 + Math.random() * 4000) },
          
          // Residential Care - 6 metrics
          { category: 'Residential Care', type: 'Number of Participants', value: Math.floor(200 + Math.random() * 600) },
          { category: 'Residential Care', type: 'Spending', value: Math.floor(400000 + Math.random() * 1200000) },
          { category: 'Residential Care', type: 'Number of Providers', value: Math.floor(5 + Math.random() * 20) },
          { category: 'Residential Care', type: 'Participants per provider', value: Math.floor(20 + Math.random() * 60) },
          { category: 'Residential Care', type: 'Spending per provider', value: Math.floor(80000 + Math.random() * 250000) },
          { category: 'Residential Care', type: 'Spending per participant', value: Math.floor(2000 + Math.random() * 8000) }
        ];
        
        healthcarePrograms.forEach(program => {
          dssData.push({
            'SA2 ID': sa2Id,
            'SA2 Name': sa2Name,
            'Category': program.category,
            'Type': program.type,
            'Amount': program.value
          });
        });

        sa2Counter++;
      }
    });
  });

  return {
    demographics: demographicsData,
    economics: econData,
    health: healthData,
    dss: dssData,
    totalSA2s: sa2Counter - 1
  };
}

// Generate and save comprehensive dataset matching HeatmapDataService
async function createComprehensiveDataFiles() {
  console.log('🔄 Generating comprehensive SA2 dataset with 53 metrics (matching HeatmapDataService)...');
  
  const data = generateComprehensiveSA2Data();
  
  console.log(`📊 Generated data for ${data.totalSA2s} SA2 regions`);
  console.log(`   - Demographics records: ${data.demographics.length} (9 metrics × ${data.totalSA2s} regions)`);
  console.log(`   - Economics records: ${data.economics.length} (10 metrics × ${data.totalSA2s} regions)`);
  console.log(`   - Health records: ${data.health.length} (16 metrics × ${data.totalSA2s} regions)`);
  console.log(`   - DSS records: ${data.dss.length} (18 metrics × ${data.totalSA2s} regions)`);
  console.log(`   - TOTAL EXPECTED METRICS: 53 (9+10+16+18)`);
  
  const dataDir = path.join(process.cwd(), 'data', 'sa2');
  
  // Write comprehensive files
  await fs.writeFile(
    path.join(dataDir, 'Demographics_2023_comprehensive.json'),
    JSON.stringify(data.demographics, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'econ_stats_comprehensive.json'),
    JSON.stringify(data.economics, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'health_stats_comprehensive.json'),
    JSON.stringify(data.health, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'DSS_Cleaned_2024_comprehensive.json'),
    JSON.stringify(data.dss, null, 2)
  );
  
  console.log('✅ Comprehensive SA2 data files created (53 metrics total):');
  console.log('   - Demographics_2023_comprehensive.json (9 metrics)');
  console.log('   - econ_stats_comprehensive.json (10 metrics)');
  console.log('   - health_stats_comprehensive.json (16 metrics)');
  console.log('   - DSS_Cleaned_2024_comprehensive.json (18 metrics)');
  
  return data;
}

// Run if called directly
if (require.main === module) {
  createComprehensiveDataFiles()
    .then(() => console.log('🎉 Comprehensive dataset creation complete! 53 metrics matching HeatmapDataService.'))
    .catch(console.error);
}

export { createComprehensiveDataFiles, generateComprehensiveSA2Data }; 