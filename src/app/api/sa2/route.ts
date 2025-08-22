import { NextRequest, NextResponse } from 'next/server';
import { getMergedSA2Data, listAllMetrics, getSA2Row, searchSA2ByName, getMetricMedians } from '../../../../lib/mergeSA2Data';

/**
 * API Route: /api/sa2
 * 
 * Serves merged SA2 data and provides query capabilities for App Router
 * 
 * Endpoints:
 * - GET /api/sa2 - Returns all merged SA2 data
 * - GET /api/sa2?metrics=true - Returns list of all available metrics
 * - GET /api/sa2?id=101021007 - Returns data for specific SA2 area
 * - GET /api/sa2?search=sydney&limit=5 - Search SA2 areas by name
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 SA2 API called:', request.url);
    const { searchParams } = new URL(request.url);
    const metrics = searchParams.get('metrics');
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const refresh = searchParams.get('refresh');
    
    console.log('📋 Query params:', { metrics, id, search, limit, refresh });
    
    // Clear cache if refresh parameter is provided
    if (refresh === 'true') {
      console.log('🗑️ Clearing SA2 data cache...');
      const { clearCache } = await import('../../../../lib/mergeSA2Data');
      clearCache();
    }

    // Return list of all metrics
    if (metrics === 'true') {
      const allMetrics = await listAllMetrics();
      return NextResponse.json({ 
        success: true,
        metrics: allMetrics,
        count: allMetrics.length
      });
    }

    // Return data for specific SA2 area
    if (id) {
      const sa2Data = await getSA2Row(id);
      if (!sa2Data) {
        return NextResponse.json(
          { error: `SA2 area with ID ${id} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ 
        success: true,
        sa2Id: id,
        data: sa2Data
      });
    }

    // Search SA2 areas by name
    if (search) {
      const searchLimit = limit ? parseInt(limit) : 10;
      const results = await searchSA2ByName(search, searchLimit);
      return NextResponse.json({ 
        success: true,
        query: search,
        results,
        count: results.length
      });
    }

    // Return all merged data (default)
    console.log('🚀 Loading merged SA2 data...');
    const mergedData = await getMergedSA2Data();
    console.log('✅ Merged data loaded successfully');
    
    const regionCount = Object.keys(mergedData).length;
    console.log('📊 Region count:', regionCount);
    
    console.log('📈 Getting metrics...');
    const metricCount = await listAllMetrics().then(metrics => metrics.length);
    console.log('📈 Metric count:', metricCount);
    
    console.log('📊 Getting medians...');
    const medians = await getMetricMedians();
    console.log('✅ All data processing complete');

    return NextResponse.json({
      success: true,
      data: mergedData,
      metadata: {
        regionCount,
        metricCount,
        medians,
        datasetSources: [
          'merged_sa2_data_with_postcodes.json (primary)',
          'Demographics_2023_comprehensive.json (fallback)', 
          'econ_stats_comprehensive.json (fallback)',
          'health_stats_comprehensive.json (fallback)',
          'DSS_Cleaned_2024_comprehensive.json (fallback)'
        ],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ SA2 API error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check if this is a specific type of error
    if (error instanceof Error) {
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 