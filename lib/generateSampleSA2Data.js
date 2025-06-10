"use strict";
/**
 * Sample SA2 Data Generator
 *
 * Generates additional SA2 regions for testing and demonstration purposes.
 * Based on the existing 3-4 real SA2 regions, creates variations with
 * realistic Australian SA2 IDs and names.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDemographicsData = generateDemographicsData;
exports.generateDSSData = generateDSSData;
exports.generateEconomicsData = generateEconomicsData;
exports.generateHealthStatsData = generateHealthStatsData;
exports.writeSampleDataFiles = writeSampleDataFiles;
// Base templates from existing data
const SA2_TEMPLATES = [
    { id: '101021007', name: 'Homebush Bay - Silverwater', state: 'NSW' },
    { id: '102011013', name: 'Canterbury - Hurlstone Park', state: 'VIC' },
    { id: '103021001', name: 'Brisbane Inner City', state: 'QLD' }
];
// Australian suburb name components for realistic generation
const SUBURB_PREFIXES = [
    'North', 'South', 'East', 'West', 'Upper', 'Lower', 'Mount', 'Port', 'New', 'Old',
    'Greater', 'Little', 'Big', 'Royal', 'Saint', 'Glen', 'Park', 'Valley', 'Hill'
];
const SUBURB_BASES = [
    'Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Darwin', 'Hobart',
    'Richmond', 'Carlton', 'Fitzroy', 'Parkville', 'Brunswick', 'Collingwood',
    'Bondi', 'Manly', 'Parramatta', 'Blacktown', 'Penrith', 'Liverpool',
    'Cairns', 'Townsville', 'Rockhampton', 'Toowoomba', 'Ipswich',
    'Fremantle', 'Joondalup', 'Bunbury', 'Geraldton', 'Kalgoorlie',
    'Glenelg', 'Norwood', 'Morphett', 'Unley', 'Burnside'
];
const SUBURB_SUFFIXES = [
    'Beach', 'Park', 'Gardens', 'Heights', 'Valley', 'Junction', 'Central',
    'East', 'West', 'North', 'South', 'Creek', 'Bay', 'Point', 'Hill'
];
/**
 * Generates a realistic Australian suburb name
 */
function generateSuburbName() {
    const usePrefix = Math.random() < 0.3;
    const useSuffix = Math.random() < 0.4;
    let name = SUBURB_BASES[Math.floor(Math.random() * SUBURB_BASES.length)];
    if (usePrefix) {
        const prefix = SUBURB_PREFIXES[Math.floor(Math.random() * SUBURB_PREFIXES.length)];
        name = `${prefix} ${name}`;
    }
    if (useSuffix) {
        const suffix = SUBURB_SUFFIXES[Math.floor(Math.random() * SUBURB_SUFFIXES.length)];
        name = `${name} ${suffix}`;
    }
    return name;
}
/**
 * Generates a realistic SA2 ID based on state patterns
 */
function generateSA2Id(stateCode, index) {
    const stateDigit = stateCode === 'NSW' ? '1' :
        stateCode === 'VIC' ? '2' :
            stateCode === 'QLD' ? '3' :
                stateCode === 'SA' ? '4' :
                    stateCode === 'WA' ? '5' :
                        stateCode === 'TAS' ? '6' :
                            stateCode === 'NT' ? '7' : '8';
    // Format: XYYYYZZZZ where X=state, YYYY=region, ZZZZ=area
    const region = String(Math.floor(index / 10) + 101).padStart(4, '0');
    const area = String((index % 10) + 1).padStart(4, '0');
    return `${stateDigit}${region}${area}`;
}
/**
 * Generates sample Demographics data
 */
function generateDemographicsData(count = 50) {
    const records = [];
    const descriptions = [
        'Estimated resident population (no.)',
        'Population aged 65 years and over (no.)',
        'Population aged 0-14 years (no.)',
        'Population aged 15-64 years (no.)',
        'Median age (years)',
        'Population density (persons per sq km)'
    ];
    for (let i = 0; i < count; i++) {
        const template = SA2_TEMPLATES[i % SA2_TEMPLATES.length];
        const stateCode = template.state;
        descriptions.forEach((desc, descIndex) => {
            const sa2Id = generateSA2Id(stateCode, i + 1);
            const sa2Name = generateSuburbName();
            let amount;
            switch (desc) {
                case 'Estimated resident population (no.)':
                    amount = Math.floor(Math.random() * 15000) + 1000; // 1K-16K
                    break;
                case 'Population aged 65 years and over (no.)':
                    amount = Math.floor(Math.random() * 3000) + 100; // 100-3.1K
                    break;
                case 'Median age (years)':
                    amount = Math.floor(Math.random() * 30) + 25; // 25-55 years
                    break;
                case 'Population density (persons per sq km)':
                    amount = Math.floor(Math.random() * 5000) + 50; // 50-5050
                    break;
                default:
                    amount = Math.floor(Math.random() * 8000) + 200; // 200-8.2K
            }
            records.push({
                'SA2 ID': sa2Id,
                'SA2 Name': sa2Name,
                Description: desc,
                Amount: amount
            });
        });
    }
    return records;
}
/**
 * Generates sample DSS (healthcare) data
 */
function generateDSSData(count = 50) {
    const records = [];
    const categories = ['Commonwealth Home Support Program', 'Home Care Packages', 'Residential Aged Care'];
    const types = ['Number of Participants', 'Number of Providers', 'Total Spending'];
    for (let i = 0; i < count; i++) {
        const template = SA2_TEMPLATES[i % SA2_TEMPLATES.length];
        const stateCode = template.state;
        categories.forEach(category => {
            types.forEach(type => {
                const sa2Id = generateSA2Id(stateCode, i + 1);
                const sa2Name = generateSuburbName();
                let amount;
                if (type === 'Number of Participants') {
                    amount = Math.floor(Math.random() * 800) + 50; // 50-850
                }
                else if (type === 'Number of Providers') {
                    amount = Math.floor(Math.random() * 20) + 1; // 1-21
                }
                else { // Total Spending
                    amount = Math.floor(Math.random() * 2000000) + 100000; // $100K-$2.1M
                }
                records.push({
                    'SA2 ID': sa2Id,
                    'SA2 Name': sa2Name,
                    Category: category,
                    Type: type,
                    Amount: amount
                });
            });
        });
    }
    return records;
}
/**
 * Generates sample Economics data
 */
function generateEconomicsData(count = 50) {
    const records = [];
    const parentDescriptions = ['Economics', 'Employment', 'Housing'];
    const descriptions = {
        'Economics': ['Median household income ($/week)', 'Mean household income ($/week)', 'SEIFA Index'],
        'Employment': ['Employment rate (%)', 'Unemployment rate (%)', 'Labour force participation (%)'],
        'Housing': ['Median rent ($/week)', 'Median mortgage ($/month)', 'Housing stress (%)']
    };
    for (let i = 0; i < count; i++) {
        const template = SA2_TEMPLATES[i % SA2_TEMPLATES.length];
        const stateCode = template.state;
        parentDescriptions.forEach(parent => {
            descriptions[parent].forEach(desc => {
                const sa2Id = generateSA2Id(stateCode, i + 1);
                const sa2Name = generateSuburbName();
                let amount;
                if (desc.includes('income')) {
                    amount = Math.floor(Math.random() * 1500) + 500; // $500-$2000/week
                }
                else if (desc.includes('rate') || desc.includes('stress')) {
                    amount = Math.random() * 15 + 2; // 2-17%
                }
                else if (desc.includes('SEIFA')) {
                    amount = Math.floor(Math.random() * 400) + 600; // 600-1000
                }
                else if (desc.includes('rent')) {
                    amount = Math.floor(Math.random() * 400) + 200; // $200-$600/week
                }
                else if (desc.includes('mortgage')) {
                    amount = Math.floor(Math.random() * 2000) + 1000; // $1000-$3000/month
                }
                else {
                    amount = Math.random() * 100 + 50; // 50-150%
                }
                records.push({
                    'SA2 ID': sa2Id,
                    'SA2 Name': sa2Name,
                    'Parent Description': parent,
                    Description: desc,
                    Amount: amount
                });
            });
        });
    }
    return records;
}
/**
 * Generates sample Health Stats data
 */
function generateHealthStatsData(count = 50) {
    const records = [];
    const parentDescriptions = ['Health Conditions', 'Health Services', 'Health Outcomes'];
    const descriptions = {
        'Health Conditions': ['Diabetes (%)', 'Heart disease (%)', 'Mental health (%)', 'Arthritis (%)'],
        'Health Services': ['GP visits per capita', 'Hospital admissions per 1000', 'Health expenditure per capita'],
        'Health Outcomes': ['Life expectancy (years)', 'Disability rate (%)', 'Health score (0-100)']
    };
    for (let i = 0; i < count; i++) {
        const template = SA2_TEMPLATES[i % SA2_TEMPLATES.length];
        const stateCode = template.state;
        parentDescriptions.forEach(parent => {
            descriptions[parent].forEach(desc => {
                const sa2Id = generateSA2Id(stateCode, i + 1);
                const sa2Name = generateSuburbName();
                let amount;
                if (desc.includes('%')) {
                    amount = Math.random() * 20 + 5; // 5-25%
                }
                else if (desc.includes('expectancy')) {
                    amount = Math.random() * 10 + 75; // 75-85 years
                }
                else if (desc.includes('score')) {
                    amount = Math.random() * 40 + 60; // 60-100
                }
                else if (desc.includes('visits')) {
                    amount = Math.random() * 8 + 2; // 2-10 visits
                }
                else if (desc.includes('admissions')) {
                    amount = Math.random() * 200 + 50; // 50-250 per 1000
                }
                else { // expenditure
                    amount = Math.floor(Math.random() * 3000) + 1000; // $1000-$4000
                }
                records.push({
                    'SA2 ID': sa2Id,
                    'SA2 Name': sa2Name,
                    'Parent Description': parent,
                    Description: desc,
                    Amount: amount
                });
            });
        });
    }
    return records;
}
/**
 * Writes sample data to files (for development/testing)
 */
async function writeSampleDataFiles(outputDir = 'data/sa2', regionCount = 50) {
    const fs = await Promise.resolve().then(() => require('fs/promises'));
    const path = await Promise.resolve().then(() => require('path'));
    try {
        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });
        // Generate and write Demographics data
        const demographicsData = generateDemographicsData(regionCount);
        await fs.writeFile(path.join(outputDir, 'Demographics_2023_expanded.json'), JSON.stringify(demographicsData, null, 2), 'utf-8');
        // Generate and write DSS data
        const dssData = generateDSSData(regionCount);
        await fs.writeFile(path.join(outputDir, 'DSS_Cleaned_2024_expanded.json'), JSON.stringify(dssData, null, 2), 'utf-8');
        // Generate and write Economics data
        const economicsData = generateEconomicsData(regionCount);
        await fs.writeFile(path.join(outputDir, 'econ_stats_expanded.json'), JSON.stringify(economicsData, null, 2), 'utf-8');
        // Generate and write Health Stats data
        const healthData = generateHealthStatsData(regionCount);
        await fs.writeFile(path.join(outputDir, 'health_stats_expanded.json'), JSON.stringify(healthData, null, 2), 'utf-8');
        console.log(`✅ Generated sample data files with ${regionCount} regions each`);
        console.log(`📁 Files written to: ${outputDir}/`);
    }
    catch (error) {
        console.error('❌ Failed to write sample data files:', error);
        throw error;
    }
}
