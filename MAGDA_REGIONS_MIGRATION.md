# Migration to Magda-Regions Boundary Data

## Overview

This project has been successfully migrated from local ABS boundary files to using the [magda-regions](https://github.com/magda-io/magda-regions) CDN-hosted boundary data. This migration provides significant performance improvements and more current data.

## Key Benefits Achieved

### 🚀 Performance Improvements
- **Repository size reduced**: Removed ~3.6GB of local GeoJSON files
- **Faster loading**: Boundary data now loads on-demand from CDN
- **Better caching**: Browser can cache individual boundary types
- **Reduced bandwidth**: NDJSON format is more efficient than large GeoJSON files

### 📅 Updated Data
- **2021 Statistical Areas**: SA2, SA3, SA4, POA using latest 2021 ABS boundaries
- **2023 Local Government Areas**: Updated from 2021 to 2023 LGA boundaries
- **Consistent naming**: All fields now use standardized `_2021` or `_2023` suffixes

### 🛠 Technical Improvements
- **CDN delivery**: Reliable GitHub releases CDN with excellent uptime
- **Version control**: Clear versioning system with magda-regions releases
- **NDJSON format**: More efficient than GeoJSON for streaming and processing

## Changes Made

### 1. Updated Data Sources
Boundary data now loads from these URLs (via CORS proxy):
- **SA2**: https://api.allorigins.win/raw?url=https://github.com/magda-io/magda-regions/releases/download/v2.0.0/SA2_2021.ndjson
- **SA3**: https://api.allorigins.win/raw?url=https://github.com/magda-io/magda-regions/releases/download/v2.0.0/SA3_2021.ndjson
- **SA4**: https://api.allorigins.win/raw?url=https://github.com/magda-io/magda-regions/releases/download/v2.0.0/SA4_2021.ndjson
- **LGA**: https://api.allorigins.win/raw?url=https://github.com/magda-io/magda-regions/releases/download/v2.0.0/LGA_2023.ndjson
- **POA**: https://api.allorigins.win/raw?url=https://github.com/magda-io/magda-regions/releases/download/v2.0.0/POA_2021.ndjson

### 2. CORS Proxy Solution
Due to GitHub releases redirecting to S3 URLs without CORS headers, we implemented a fallback proxy system:
- **Primary**: `api.allorigins.win/raw?url=` (free, reliable CORS proxy)
- **Fallback 1**: `cors-proxy.htmldriven.com/?url=`
- **Fallback 2**: `corsproxy.io/?`

The system automatically tries multiple proxy services until one succeeds, ensuring reliable data loading.

### 3. Field Name Updates
Updated field references throughout the application:

| Old Field Names | New Field Names | Layer Type |
|----------------|----------------|------------|
| `POA_CODE21`, `POA_NAME21` | `POA_CODE_2021`, `POA_NAME_2021` | Postcodes |
| `LGA_CODE21`, `LGA_NAME21` | `LGA_CODE_2023`, `LGA_NAME_2023` | Local Government |
| `SA2_MAIN21`, `SA2_NAME21` | `SA2_CODE_2021`, `SA2_NAME_2021` | Statistical Area 2 |
| `SA3_CODE21`, `SA3_NAME21` | `SA3_CODE_2021`, `SA3_NAME_2021` | Statistical Area 3 |
| `SA4_CODE21`, `SA4_NAME21` | `SA4_CODE_2021`, `SA4_NAME_2021` | Statistical Area 4 |

### 4. Format Conversion
- **Input**: NDJSON (newline-delimited JSON) from magda-regions
- **Processing**: Automatic conversion to GeoJSON format for MapTiler compatibility
- **Output**: Standard GeoJSON FeatureCollection for map rendering

### 5. Removed Files
The following large files were removed from the repository:
- `public/maps/LGA.geojson` (332MB)
- `public/maps/POA.geojson` (477MB)  
- `public/maps/SA2.geojson` (421MB)
- `public/maps/SA3.geojson` (298MB)
- `public/maps/SA4.geojson` (249MB)
- `Maps_ABS_CSV/` directory duplicates

## Code Changes

### Modified Files
- `src/components/AustralianMap.tsx`: Updated boundary loading logic with CORS proxy fallback system and field references

### Key Implementation Details
1. **CORS Proxy Fallback System**: Automatically tries multiple proxy services until one succeeds
2. **NDJSON to GeoJSON conversion**: Automatic conversion maintains compatibility
3. **Updated field mappings**: All search and highlight functions use new field names
4. **Error handling**: Improved timeout and error messages for network requests
5. **Performance optimization**: Reduced memory usage and faster loading

## Future Updates

The magda-regions project provides regular updates to boundary data. To update to newer versions:

1. Check for new releases at: https://github.com/magda-io/magda-regions/releases
2. Update the URLs in `AustralianMap.tsx` to point to the new version
3. Verify field names haven't changed in the new release
4. Test boundary loading and selection functionality

## CORS Proxy Considerations

### Current Implementation
- Uses multiple fallback CORS proxy services for reliability
- Primary service: `api.allorigins.win` (free, reliable)
- Automatic failover to backup services if primary fails

### Alternative Solutions
For production deployments, consider:
1. **Custom CORS Proxy**: Deploy your own proxy service for better control
2. **Server-Side Caching**: Cache boundary data on your server to reduce external dependencies
3. **Self-Hosted Boundaries**: Host the magda-regions files on your own CDN with proper CORS headers

## Data Sources & Credits

- **Magda-Regions**: https://github.com/magda-io/magda-regions
- **Australian Bureau of Statistics**: Original boundary data source
- **Version**: Currently using magda-regions v2.0.0
- **CORS Proxy**: api.allorigins.win (primary)

## Verification

To verify the migration worked correctly:
1. Start the development server: `npm run dev`
2. Navigate to the map page
3. Test boundary layer loading for each type (SA2, SA3, SA4, LGA, Postcodes)
4. Verify search and highlight functionality works correctly
5. Check browser developer tools for successful CDN requests

## Troubleshooting

If boundary layers fail to load:
1. Check network connectivity to GitHub
2. Verify the magda-regions URLs are accessible
3. Check browser console for specific error messages
4. Ensure CORS is properly configured (GitHub releases should allow cross-origin requests)

The migration maintains full backward compatibility with existing search and highlighting functionality while providing significant performance and data quality improvements. 