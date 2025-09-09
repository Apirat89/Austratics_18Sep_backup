import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, canAccessResource } from '@/lib/adminAuth';

// GET /api/admin/usage/user - User usage analytics and detailed call logs
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const from = searchParams.get('from') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const to = searchParams.get('to') || new Date().toISOString();
    const endpoint = searchParams.get('endpoint') || '';
    const status = searchParams.get('status') || '';
    const method = searchParams.get('method') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 1000);
    const format = searchParams.get('format') || 'json'; // 'json', 'csv'
    const view = searchParams.get('view') || 'calls'; // 'calls', 'summary'
    const offset = (page - 1) * pageSize;

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get user details and check access
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, company_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check access to this user
    if (!canAccessResource(authResult.user, userId, user.company_id)) {
      return NextResponse.json(
        { error: 'Access denied to this user' },
        { status: 403 }
      );
    }

    if (view === 'summary') {
      // Get user usage summary
      const [
        { count: totalCalls },
        { count: totalErrors },
        { data: latencyData },
        { data: endpointBreakdown },
        { data: dailyStats }
      ] = await Promise.all([
        // Total calls
        supabase
          .from('api_calls')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('ts', fromDate.toISOString())
          .lte('ts', toDate.toISOString()),

        // Total errors
        supabase
          .from('api_calls')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('status_code', 400)
          .gte('ts', fromDate.toISOString())
          .lte('ts', toDate.toISOString()),

        // Latency data for average
        supabase
          .from('api_calls')
          .select('latency_ms')
          .eq('user_id', userId)
          .gte('ts', fromDate.toISOString())
          .lte('ts', toDate.toISOString())
          .not('latency_ms', 'is', null),

        // Endpoint breakdown
        supabase
          .from('api_calls')
          .select('endpoint, status_code, latency_ms')
          .eq('user_id', userId)
          .gte('ts', fromDate.toISOString())
          .lte('ts', toDate.toISOString()),

        // Daily stats
        supabase
          .from('api_calls')
          .select('ts, status_code')
          .eq('user_id', userId)
          .gte('ts', fromDate.toISOString())
          .lte('ts', toDate.toISOString())
          .order('ts', { ascending: true })
      ]);

      // Calculate average latency
      const avgLatency = latencyData && latencyData.length > 0
        ? Math.round(latencyData.reduce((sum, call) => sum + (call.latency_ms || 0), 0) / latencyData.length)
        : 0;

      // Group endpoint data
      const endpointMap = new Map();
      endpointBreakdown?.forEach(call => {
        if (!endpointMap.has(call.endpoint)) {
          endpointMap.set(call.endpoint, {
            endpoint: call.endpoint,
            totalCalls: 0,
            totalErrors: 0,
            totalLatency: 0
          });
        }
        const ep = endpointMap.get(call.endpoint);
        ep.totalCalls++;
        if (call.status_code >= 400) ep.totalErrors++;
        ep.totalLatency += call.latency_ms || 0;
      });

      const topEndpoints = Array.from(endpointMap.values())
        .map(ep => ({
          endpoint: ep.endpoint,
          totalCalls: ep.totalCalls,
          totalErrors: ep.totalErrors,
          avgLatency: ep.totalCalls > 0 ? Math.round(ep.totalLatency / ep.totalCalls) : 0,
          errorRate: ep.totalCalls > 0 ? ((ep.totalErrors / ep.totalCalls) * 100).toFixed(2) : '0.00'
        }))
        .sort((a, b) => b.totalCalls - a.totalCalls)
        .slice(0, 10);

      // Group daily data
      const dailyMap = new Map();
      dailyStats?.forEach(call => {
        const day = call.ts.split('T')[0];
        if (!dailyMap.has(day)) {
          dailyMap.set(day, { date: day, calls: 0, errors: 0 });
        }
        const dayData = dailyMap.get(day);
        dayData.calls++;
        if (call.status_code >= 400) dayData.errors++;
      });

      const dailyActivity = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      const summary = {
        user: {
          id: user.id,
          email: user.email
        },
        dateRange: { from, to },
        totals: {
          totalCalls: totalCalls || 0,
          totalErrors: totalErrors || 0,
          avgLatency,
          errorRate: totalCalls ? ((totalErrors || 0) / totalCalls * 100).toFixed(2) : '0.00'
        },
        topEndpoints,
        dailyActivity
      };

      if (format === 'csv') {
        const csvRows = [
          `User: ${user.email}`,
          `Date Range: ${from} to ${to}`,
          '',
          'Summary,Value',
          `Total Calls,${summary.totals.totalCalls}`,
          `Total Errors,${summary.totals.totalErrors}`,
          `Average Latency (ms),${summary.totals.avgLatency}`,
          `Error Rate (%),${summary.totals.errorRate}`,
          '',
          'Top Endpoints',
          'Endpoint,Total Calls,Total Errors,Avg Latency (ms),Error Rate (%)',
          ...topEndpoints.map(ep => `"${ep.endpoint}",${ep.totalCalls},${ep.totalErrors},${ep.avgLatency},${ep.errorRate}`)
        ];

        return new Response(csvRows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=user-usage-summary-${userId}.csv`
          }
        });
      }

      return NextResponse.json(summary);
    }

    // Detailed call logs (default view)
    let callsQuery = supabase
      .from('api_calls')
      .select(`
        id,
        request_id,
        ts,
        endpoint,
        method,
        status_code,
        latency_ms,
        error_code,
        error_message,
        ip,
        user_agent,
        request_size_bytes,
        response_size_bytes
      `, { count: 'exact' })
      .eq('user_id', userId)
      .gte('ts', fromDate.toISOString())
      .lte('ts', toDate.toISOString());

    // Apply filters
    if (endpoint) {
      callsQuery = callsQuery.ilike('endpoint', `%${endpoint}%`);
    }

    if (method) {
      callsQuery = callsQuery.eq('method', method.toUpperCase());
    }

    if (status) {
      if (status === 'error') {
        callsQuery = callsQuery.gte('status_code', 400);
      } else if (status === 'success') {
        callsQuery = callsQuery.lt('status_code', 400);
      } else {
        const statusCode = parseInt(status);
        if (!isNaN(statusCode)) {
          callsQuery = callsQuery.eq('status_code', statusCode);
        }
      }
    }

    // Apply pagination and ordering
    const { data: calls, error, count } = await callsQuery
      .order('ts', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('User calls query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user calls' },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    if (format === 'csv') {
      const csvHeader = 'Timestamp,Request ID,Endpoint,Method,Status Code,Latency (ms),Error Code,Error Message,IP Address,User Agent,Request Size (bytes),Response Size (bytes)\n';
      const csvData = (calls || []).map(call => 
        `"${call.ts}","${call.request_id}","${call.endpoint}","${call.method}",${call.status_code},${call.latency_ms || ''},"${call.error_code || ''}","${call.error_message || ''}","${call.ip || ''}","${call.user_agent || ''}",${call.request_size_bytes || ''},${call.response_size_bytes || ''}`
      ).join('\n');

      return new Response(csvHeader + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=user-calls-${userId}.csv`
        }
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      dateRange: { from, to },
      filters: { endpoint, status, method },
      calls: calls?.map(call => ({
        id: call.id,
        requestId: call.request_id,
        timestamp: call.ts,
        endpoint: call.endpoint,
        method: call.method,
        statusCode: call.status_code,
        latency: call.latency_ms,
        errorCode: call.error_code,
        errorMessage: call.error_message,
        ip: call.ip,
        userAgent: call.user_agent,
        requestSize: call.request_size_bytes,
        responseSize: call.response_size_bytes
      })) || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages
      }
    });

  } catch (error) {
    console.error('User usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 