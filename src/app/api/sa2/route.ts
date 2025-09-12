import { NextRequest, NextResponse } from 'next/server';
import { getMergedSA2Data, listAllMetrics, getSA2Row, searchSA2ByName, getMetricMedians } from '../../../../lib/mergeSA2Data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logUsage } from '@/lib/usageServer';

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
  const startTime = Date.now();
  const actionType = getActionType(request);
  let userId = null;
  
  try {
    console.log('🔍 SA2 API called:', request.url);
    const { searchParams } = new URL(request.url);
    const metrics = searchParams.get('metrics');
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const refresh = searchParams.get('refresh');
    
    console.log('📋 Query params:', { metrics, id, search, limit, refresh });
    
    // Get authenticated user for tracking
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (authError) {
      console.error('❌ Auth error in SA2 API:', authError);
      // Continue without authentication - tracking will be skipped
    }
    
    // Clear cache if refresh parameter is provided
    if (refresh === 'true') {
      console.log('🗑️ Clearing SA2 data cache...');
      const { clearCache } = await import('../../../../lib/mergeSA2Data');
      clearCache();
    }

    // Return list of all metrics
    if (metrics === 'true') {
      const allMetrics = await listAllMetrics();
      const response = { 
        success: true,
        metrics: allMetrics,
        count: allMetrics.length
      };
      
      // Track API usage
      trackSA2Usage(userId, 'listMetrics', request.url, 200, startTime);
      
      return NextResponse.json(response);
    }

    // Return data for specific SA2 area
    if (id) {
      const sa2Data = await getSA2Row(id);
      if (!sa2Data) {
        // Track failed lookup
        trackSA2Usage(userId, 'getSA2ById', request.url, 404, startTime);
        
        return NextResponse.json(
          { error: `SA2 area with ID ${id} not found` },
          { status: 404 }
        );
      }
      
      const response = { 
        success: true,
        sa2Id: id,
        data: sa2Data
      };
      
      // Track API usage
      trackSA2Usage(userId, 'getSA2ById', request.url, 200, startTime);
      
      return NextResponse.json(response);
    }

    // Search SA2 areas by name
    if (search) {
      const searchLimit = limit ? parseInt(limit) : 10;
      const results = await searchSA2ByName(search, searchLimit);
      
      const response = { 
        success: true,
        query: search,
        results,
        count: results.length
      };
      
      // Track API usage
      trackSA2Usage(userId, 'searchSA2', request.url, 200, startTime);
      
      return NextResponse.json(response);
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

    const response = {
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
    };
    
    // Track API usage
    trackSA2Usage(userId, 'getAllSA2Data', request.url, 200, startTime);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ SA2 API error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Track error
    trackSA2Usage(userId, 'error', request.url, 500, startTime);
    
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

/**
 * Helper function to get action type based on request parameters
 */
function getActionType(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('metrics') === 'true') {
    return 'listMetrics';
  }
  
  if (searchParams.get('id')) {
    return 'getSA2ById';
  }
  
  if (searchParams.get('search')) {
    return 'searchSA2';
  }
  
  return 'getAllSA2Data';
}

/**
 * Helper function to track SA2 API usage
 */
async function trackSA2Usage(userId: string | null, action: string, endpoint: string, status: number, startTime: number) {
  // Skip tracking if no user ID
  if (!userId) {
    return;
  }
  
  try {
    const duration = Date.now() - startTime;
    const userIdPrefix = userId.substring(0, 6); // For privacy in logs, just show prefix
    console.log(`📊 Tracking SA2 API usage for user ${userIdPrefix}... (${action})`);
    
    await logUsage({
      user_id: userId,
      page: '/api/sa2',
      service: 'sa2',
      action,
      endpoint,
      method: 'GET',
      status,
      duration_ms: duration,
    });
  } catch (error) {
    // Don't let tracking errors affect the main API functionality
    console.error('❌ Failed to track SA2 API usage:', error);
  }
} 