# Residential Facility Data Documentation

## 📋 Overview

This folder contains comprehensive data and statistics for Australian residential aged care facilities, powering the analytics and visualizations in the Giantash platform.

## 📄 Files in this Directory

### 1. `Residential_May2025_ExcludeMPS_updated.json`
**Primary facility data file containing detailed information for 2,606 residential aged care facilities**

**Source Data:**
- Original Australian government dataset (May 2025)
- Multi-Purpose Services (MPS) excluded to focus on residential care
- Enhanced with calculated achievement percentages

**Key Features:**
- **Service Information**: Names, addresses, provider details, contact information
- **Room Data**: Configurations, costs, sizes for different room types
- **Quality Metrics**: Star ratings for compliance, quality measures, resident experience, staffing
- **Financial Data**: Expenditure, income, budget analysis per facility
- **Staffing Metrics**: Care minutes (target vs actual) for registered nurses and total care
- **Achievement Calculations**: Performance percentages for staffing targets (added December 2024)

**Record Structure Example:**
```json
{
  "Service_Name": "Example Aged Care Facility",
  "address_state": "NSW",
  "address_postcode": "2000",
  "address_locality": "Sydney",
  "star_[S] Registered Nurse Care Minutes - Target": 43.0,
  "star_[S] Registered Nurse Care Minutes - Actual": 47.0,
  "star_[S] Registered Nurse Care Minutes - % Achievement": 109.3,
  "star_[S] Total Care Minutes - Target": 208.0,
  "star_[S] Total Care Minutes - Actual": 215.0,
  "star_[S] Total Care Minutes - % Achievement": 103.4,
  // ... 91 total fields per facility
}
```

### 2. `Residential_Statistics_Analysis.json`
**Box plot statistics file powering the residential page UI visualizations**

**Purpose:**
- Provides min, Q1, median, Q3, max statistics for all facility fields
- Enables box plot comparisons across different geographic levels
- Powers the "Show Box Plots" functionality in the residential page interface

**Geographic Levels:**
- **Nationwide**: Statistics across all 2,606 facilities
- **State Level**: Statistics grouped by Australian states/territories
- **Postcode Level**: Statistics grouped by postcode areas
- **Locality Level**: Statistics grouped by city/suburb locations

**Statistics Structure Example:**
```json
{
  "star_[S] Registered Nurse Care Minutes - % Achievement": {
    "nationwide": {
      "groupName": "Nationwide",
      "min": 0,
      "q1": 90.7,
      "median": 100,
      "q3": 111.6,
      "max": 804.3
    },
    "state_NSW": {
      "groupName": "State: NSW",
      "min": 0,
      "q1": 89.8,
      "median": 99.5,
      "q3": 110.2,
      "max": 381.3
    },
    // ... additional geographic groupings
  }
}
```

**Total Statistics:**
- **91 facility fields** with complete statistics
- **2,684 geographic groups** (nationwide + states + postcodes + localities)
- **Achievement percentages** for staffing metrics (added December 2024)

## 🔧 Data Processing History

### Initial Data Setup
- **Source**: Australian government residential aged care dataset (May 2025)
- **Cleaning**: Service name standardization, removal of rating/staffing suffixes
- **Enhancement**: Addition of detailed room cost data and financial metrics

### December 2024 Enhancements

#### 1. Achievement Percentage Calculations
**Date**: December 2024
**Purpose**: Calculate staffing performance metrics

**New Fields Added:**
- `star_[S] Registered Nurse Care Minutes - % Achievement`
- `star_[S] Total Care Minutes - % Achievement`

**Calculation Method:**
```javascript
Achievement % = (Actual ÷ Target) × 100
```

**Process Details:**
- **Data Source**: Existing Target and Actual care minutes fields
- **Processing**: 2,606 facilities processed
- **Results**: 2,521 facilities with calculated percentages, 85 set to null (zero targets)
- **Precision**: Rounded to 1 decimal place
- **Null Handling**: Set to null when target is 0/null/undefined

#### 2. Box Plot Statistics Generation
**Date**: December 2024
**Purpose**: Enable UI box plot comparisons for achievement percentages

**Statistics Calculated:**
- **Min, Q1, Median, Q3, Max** for both new achievement percentage fields
- **Geographic Breakdown**: Nationwide, state, postcode, and locality levels
- **Total Groups**: 2,684 geographic groupings per field

**Process Details:**
- **Null Value Handling**: Excluded from calculations (recommendation: skip nulls for meaningful statistics)
- **Geographic Grouping**: Based on `address_state`, `address_postcode`, `address_locality` fields
- **Precision**: All statistics rounded to 1 decimal place

## 🎯 Usage in Giantash Platform

### Residential Page Features
1. **Facility Search**: Multi-field search by name, address, locality, provider
2. **7-Tab Interface**: 
   - Main (service info, ratings, contact)
   - Rooms & Costs (configurations, pricing)
   - Compliance (ratings, decision details)
   - Quality Measures (health metrics, safety)
   - Residents' Experience (satisfaction surveys)
   - Staffing (care minutes, achievement percentages)
   - Finance & Operations (expenditure, income, budget)

### Box Plot Integration
- **Toggle Control**: "Show Box Plots" checkbox in UI
- **Geographic Scope**: Dropdown selection (Nationwide/State/Postcode/Locality)
- **Achievement Metrics**: Box plots available for both RN and Total care achievement percentages
- **Visual Comparison**: Red dots show facility values within context of geographic distribution

## 🔄 Update Procedures

### Adding New Calculated Fields
1. **Identify Source Fields**: Determine which existing fields to use for calculations
2. **Create Processing Script**: Node.js script to read JSON, calculate values, update both files
3. **Update Statistics**: Calculate box plot statistics for new fields across all geographic levels
4. **File Locations**: Update both public (`/public/maps/abs_csv/`) and private (`/Maps_ABS_CSV/`) copies
5. **Documentation**: Update this README with new field details and processing notes

### Data Refresh Process
1. **Source Data**: Obtain updated Australian government dataset
2. **Data Processing**: Apply same cleaning and enhancement procedures
3. **Calculate Achievements**: Re-run achievement percentage calculations
4. **Update Statistics**: Regenerate complete statistics file with new data
5. **Verify UI**: Test residential page functionality with updated data

## 📊 Data Quality Notes

### Field Coverage
- **91 total fields** per facility record
- **Complete coverage** for core facility information (name, address, ratings)
- **Variable coverage** for optional fields (some facilities may have null values)

### Geographic Distribution
- **Nationwide coverage** across Australian states and territories
- **Urban and rural** facilities included
- **Postcode and locality** data available for geographic analysis

### Achievement Percentage Accuracy
- **Based on official target/actual data** from government reporting
- **Null values represent** facilities with no staffing targets set
- **Range validation**: Achievements can exceed 100% (over-performance) or be below 100% (under-performance)

## 🔧 Technical Specifications

### File Formats
- **JSON**: Human-readable, structured data format
- **UTF-8 Encoding**: Full Unicode character support
- **Pretty Printed**: 2-space indentation for readability

### Performance Considerations
- **File Sizes**: ~2.0MB+ for main data file, larger for statistics file
- **Loading Strategy**: Asynchronous loading recommended for UI integration
- **Caching**: Consider browser/application caching for frequently accessed data

### Backup Strategy
- **Dual Locations**: Public and private copies maintained automatically
- **Version Control**: Git tracking for all changes and updates
- **Pre-update Backups**: Created before any major data modifications

---

**Last Updated**: December 2024  
**Next Review**: When new government data becomes available  
**Maintained By**: Giantash Analytics Platform Development Team 