# Residential Facility Data Documentation

## 📋 Overview

This folder contains comprehensive data and statistics for Australian residential aged care facilities, powering the analytics and visualizations in the Giantash platform.

## 📄 Files in this Directory

### 1. `Residential_May2025_ExcludeMPS_updated_with_finance.json` ⭐ **ENHANCED**
**Primary facility data file containing detailed information for 2,605 residential aged care facilities with enhanced financial data structure**

**Recent Enhancement (June 2025):**
- **📊 Financial Data Reorganization**: Migrated from flat financial structure to hierarchical organization
- **🎯 Sector Comparisons**: Added sector averages and variance percentages for all financial metrics
- **📈 Enhanced Breakdown**: Detailed sub-category financial analysis (care nursing breakdown, cleaning/laundry breakdown, etc.)
- **⏰ Quarterly Context**: Care staff spending with quarterly period information
- **🔄 Data Structure Evolution**: Maintains backward compatibility while providing enhanced analytics

**Source Data:**
- Original Australian government dataset (May 2025)
- Multi-Purpose Services (MPS) excluded to focus on residential care
- Enhanced with calculated achievement percentages
- **NEW**: Enhanced financial data organization and sector comparison analytics

**Key Features:**
- **Service Information**: Names, addresses, provider details, contact information
- **Room Data**: Configurations, costs, sizes for different room types
- **Quality Metrics**: Star ratings for compliance, quality measures, resident experience, staffing
- **🆕 Enhanced Financial Data**: Hierarchical expenditure/income structure with sector comparisons
- **Staffing Metrics**: Care minutes (target vs actual) for registered nurses and total care
- **Achievement Calculations**: Performance percentages for staffing targets

**🆕 Enhanced Financial Structure:**
```json
{
  "Service Name": "Example Aged Care Facility",
  "provider_id": "12345",
  "financial_year": "2024-25",
  "last_updated_finance": "2025-05-15",
  
  "financials": {
    "expenditure": {
      "total_per_day": {
        "value": 450.00,
        "sector_average": 420.00,
        "variance_percentage": 7.1
      },
      "care_nursing": {
        "total": {
          "value": 280.00,
          "sector_average": 260.00,
          "variance_percentage": 7.7
        },
        "breakdown": {
          "registered_nurses": { "value": 120.00, "sector_average": 115.00 },
          "enrolled_nurses": { "value": 80.00, "sector_average": 75.00 },
          "personal_care_workers": { "value": 50.00, "sector_average": 45.00 },
          "care_management_staff": { "value": 15.00, "sector_average": 12.00 },
          "allied_health": { "value": 10.00, "sector_average": 8.00 },
          "lifestyle_recreation": { "value": 5.00, "sector_average": 5.00 }
        }
      },
      "cleaning_laundry": {
        "total": {
          "value": 35.00,
          "sector_average": 32.00,
          "variance_percentage": 9.4
        },
        "breakdown": {
          "cleaning": { "value": 25.00, "sector_average": 23.00 },
          "laundry": { "value": 8.00, "sector_average": 7.50 },
          "covid_infection_control": { "value": 2.00, "sector_average": 1.50 }
        }
      },
      "accommodation_maintenance": {
        "total": {
          "value": 60.00,
          "sector_average": 55.00,
          "variance_percentage": 9.1
        },
        "breakdown": {
          "accommodation": { "value": 40.00, "sector_average": 37.00 },
          "maintenance": { "value": 20.00, "sector_average": 18.00 }
        }
      },
      "administration": {
        "value": 45.00,
        "sector_average": 50.00,
        "variance_percentage": -10.0
      },
      "food_catering": {
        "value": 30.00,
        "sector_average": 28.00,
        "variance_percentage": 7.1
      }
    },
    "income": {
      "total_per_day": {
        "value": 500.00,
        "sector_average": 480.00,
        "variance_percentage": 4.2
      },
      "residents_contribution": {
        "value": 350.00,
        "sector_average": 340.00,
        "variance_percentage": 2.9
      },
      "government_funding": {
        "value": 140.00,
        "sector_average": 130.00,
        "variance_percentage": 7.7
      },
      "other": {
        "value": 10.00,
        "sector_average": 10.00,
        "variance_percentage": 0.0
      }
    },
    "budget_surplus_deficit_per_day": {
      "value": 50.00,
      "sector_average": 35.00
    },
    "care_staff_last_quarter": {
      "quarter_period": "Q1 2025",
      "total": {
        "value": 125000.00,
        "sector_average": 120000.00,
        "variance_percentage": 4.2
      },
      "breakdown": {
        "registered_nurses": { "value": 45000.00, "sector_average": 42000.00 },
        "enrolled_nurses": { "value": 35000.00, "sector_average": 33000.00 },
        "personal_care_workers": { "value": 25000.00, "sector_average": 24000.00 },
        "physiotherapists": { "value": 8000.00, "sector_average": 7500.00 },
        "occupational_therapists": { "value": 6000.00, "sector_average": 5800.00 },
        "dietetics": { "value": 3000.00, "sector_average": 2800.00 },
        "lifestyle_recreation": { "value": 3000.00, "sector_average": 2900.00 }
      }
    }
  }
}
```

### 2. `Residential_Statistics_Analysis.json` ⭐ **ENHANCED**
**Box plot statistics file powering the residential page UI visualizations with enhanced financial field support**

**Recent Enhancement (June 2025):**
- **📊 154 Total Numeric Fields**: Expanded from 78 to 154 fields (added 76 new financial metrics)
- **🎯 Enhanced Financial Analytics**: Box plots for all hierarchical financial data paths
- **📈 Sector Comparison Support**: Statistics for variance percentages and sector averages
- **🔍 Detailed Breakdown Support**: Statistics for all financial sub-categories

**Purpose:**
- Provides min, Q1, median, Q3, max statistics for all facility fields including enhanced financial structure
- Enables box plot comparisons across different geographic levels
- Powers the "Show Box Plots" functionality in the residential page interface
- **NEW**: Supports all enhanced financial field paths with dot notation

**Enhanced Financial Field Support:**
```json
{
  "financials.expenditure.total_per_day.value": {
    "nationwide": { "min": 120.00, "q1": 380.00, "median": 450.00, "q3": 520.00, "max": 890.00 }
  },
  "financials.expenditure.care_nursing.total.value": {
    "nationwide": { "min": 80.00, "q1": 240.00, "median": 280.00, "q3": 320.00, "max": 580.00 }
  },
  "financials.expenditure.care_nursing.breakdown.registered_nurses.value": {
    "nationwide": { "min": 20.00, "q1": 100.00, "median": 120.00, "q3": 140.00, "max": 250.00 }
  },
  // ... 76 total enhanced financial field paths
}
```

**Geographic Levels:**
- **Nationwide**: Statistics across all 2,605 facilities
- **State Level**: Statistics grouped by Australian states/territories (8 groups)
- **Postcode Level**: Statistics grouped by postcode areas (1,152 groups)
- **Locality Level**: Statistics grouped by city/suburb locations (1,523 groups)

**Total Statistics:**
- **154 facility fields** with complete statistics (expanded from 78)
- **2,684 geographic groups** (nationwide + states + postcodes + localities)
- **76 new financial field paths** supporting hierarchical financial structure
- **Enhanced box plot support** for all financial breakdowns and sector comparisons

### 3. Legacy Files (Maintained for Reference)
- `Residential_May2025_ExcludeMPS_updated.json` - Previous flat financial structure (backup)
- Previous statistics files with 78-field support (backup)

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

### 🆕 June 2025 Financial Data Enhancement ⭐

#### 1. Financial Data Structure Migration
**Date**: June 2025
**Purpose**: Migrate from flat financial structure to hierarchical organization with sector comparisons

**Migration Overview:**
- **FROM**: Flat financial fields (`expenditure_total_per_day`, `expenditure_care_nursing`, etc.)
- **TO**: Hierarchical `financials` object with sector analytics and detailed breakdowns

**Enhanced Financial Structure Features:**
1. **Hierarchical Organization**: 
   - `financials.expenditure` → detailed expense categories
   - `financials.income` → comprehensive income streams  
   - `financials.budget_surplus_deficit_per_day` → financial performance
   - `financials.care_staff_last_quarter` → quarterly staff spending analysis

2. **Sector Comparison Analytics**:
   - **Sector Averages**: Comparative values across similar facilities
   - **Variance Percentages**: Performance relative to sector benchmarks
   - **Color-Coded Indicators**: Visual performance indicators (red=above, green=below, gray=neutral)

3. **Detailed Financial Breakdowns**:
   - **Care & Nursing**: 7 subcategories (registered nurses, enrolled nurses, personal care workers, etc.)
   - **Cleaning & Laundry**: 4 subcategories (cleaning, laundry, COVID infection control, other)
   - **Accommodation & Maintenance**: 2 subcategories (accommodation, maintenance)
   - **Care Staff Quarterly**: 12 subcategories (all care staff types with detailed spending)

**Data Processing Pipeline:**
1. **Scripts Used**:
   - `financial_data_organizer.py` - Reorganized scattered financial fields into hierarchical structure
   - `provider_data_merger.py` - Merged data from finance, rooms, and facilities sources
   - `calculate_residential_stats.js` - Updated to handle 154 numeric fields (added 76 financial paths)

2. **Processing Flow**:
   ```
   Raw Financial Data → Organized Financial Structure → Enhanced Statistics → UI Integration
   ```

3. **Field Path Mapping**:
   - Old: `expenditure_total_per_day` → New: `financials.expenditure.total_per_day.value`
   - Old: `expenditure_care_nursing` → New: `financials.expenditure.care_nursing.total.value`
   - **NEW**: `financials.expenditure.care_nursing.breakdown.registered_nurses.value`
   - **NEW**: `financials.expenditure.total_per_day.sector_average`
   - **NEW**: `financials.expenditure.total_per_day.variance_percentage`

#### 2. Enhanced Statistics Generation
**Date**: June 2025
**Purpose**: Generate box plot statistics for all enhanced financial field paths

**Statistical Enhancements:**
- **154 Total Fields**: Expanded from 78 original fields to 154 fields (added 76 enhanced financial metrics)
- **Flattened Path Support**: Statistics for nested financial data using dot notation
- **Geographic Coverage**: All 2,684 geographic groupings per enhanced field
- **Validation Issues**: 6,429 coordinate validation issues identified and logged

**New Financial Field Categories:**
1. **Primary Financial Metrics** (12 fields):
   - Total expenditure/income values, sector averages, variance percentages

2. **Care & Nursing Breakdown** (14 fields):
   - 7 subcategories × 2 metrics (value + sector average)

3. **Cleaning & Laundry Breakdown** (8 fields):
   - 4 subcategories × 2 metrics (value + sector average)

4. **Accommodation & Maintenance Breakdown** (4 fields):
   - 2 subcategories × 2 metrics (value + sector average)

5. **Care Staff Quarterly Breakdown** (24 fields):
   - 12 subcategories × 2 metrics (value + sector average)

6. **Performance Indicators** (14 fields):
   - Variance percentages and sector comparison metrics

**Processing Results:**
- **2,605 Facilities**: Successfully processed with enhanced financial structure
- **154 Numeric Fields**: Complete statistical analysis across all financial metrics
- **Box Plot Integration**: All enhanced fields support geographic scope comparisons
- **UI Enhancement**: "Enhanced Finance & Operations" tab with sector comparison visualizations

## 🎯 Usage in Giantash Platform

### Residential Page Features
1. **Facility Search**: Multi-field search by name, address, locality, provider
2. **Enhanced 7-Tab Interface**: 
   - **Main** (service info, ratings, contact)
   - **Rooms & Costs** (configurations, pricing)
   - **Compliance** (ratings, decision details)
   - **Quality Measures** (health metrics, safety)
   - **Residents' Experience** (satisfaction surveys)
   - **Staffing** (care minutes, achievement percentages)
   - **🆕 Enhanced Finance & Operations** (hierarchical financial analysis with sector comparisons)

### 🆕 Enhanced Financial Tab Features
**Visual Financial Overview:**
- **Color-Coded Summary Cards**: Expenditure (blue), Income (green), Surplus/Deficit (purple)
- **Sector Variance Indicators**: Real-time performance vs sector averages with color coding
- **Financial Year Context**: Display of reporting period and last update information

**Detailed Financial Analysis:**
1. **💰 Expenditure Analysis**:
   - Total daily expenditure with sector comparison
   - Care & nursing breakdown (7 subcategories)
   - Cleaning & laundry breakdown (4 subcategories)  
   - Accommodation & maintenance breakdown (2 subcategories)
   - Administration and food & catering with variance tracking

2. **💵 Income Analysis**:
   - Total daily income with sector benchmarking
   - Residents' contribution analysis
   - Government funding breakdown
   - Other income sources tracking

3. **👥 Care Staff Spending (Quarterly)**:
   - Quarterly period context
   - Total care staff spending with sector comparison
   - Detailed breakdown (12 staff categories)
   - Variance percentage tracking

**Enhanced Data Visualization:**
- **Sector Comparison**: Each metric shows facility value, sector average, and variance percentage
- **Color-Coded Performance**: 
  - 🔴 Red: Above sector average (higher cost/spending)
  - 🟢 Green: Below sector average (lower cost/spending)
  - ⚪ Gray: Within 2% of sector average (neutral)
- **Box Plot Integration**: All 76 enhanced financial metrics support statistical visualization
- **Backward Compatibility**: Automatic fallback to legacy structure for older data

### Box Plot Integration
- **Toggle Control**: "Show Box Plots" checkbox in UI
- **Geographic Scope**: Dropdown selection (Nationwide/State/Postcode/Locality)
- **Enhanced Field Support**: Box plots available for all 154 numeric fields including:
  - Achievement metrics (staffing percentages)
  - **🆕 Hierarchical financial data** (expenditure breakdowns, income analysis, care staff spending)
  - **🆕 Sector comparison metrics** (variance percentages, performance indicators)
- **Visual Comparison**: Red dots show facility values within context of geographic distribution

### Financial Performance Indicators
**Variance Percentage Calculation:**
```javascript
Variance % = ((Facility Value - Sector Average) / Sector Average) × 100
```

**Performance Interpretation:**
- **Positive Variance**: Facility spends more than sector average
- **Negative Variance**: Facility spends less than sector average  
- **Neutral Range**: Within ±2% of sector average (considered typical performance)

**Visual Indicators:**
- Variance percentages displayed with appropriate color coding
- Sector averages shown for context and benchmarking
- Performance trends visible across different financial categories

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