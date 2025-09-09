import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, getAccessibleCompanyIds, canAccessCompany } from '@/lib/adminAuth';

// GET /api/admin/usage/company - Company usage analytics
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
    const companyId = searchParams.get('companyId');
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = searchParams.get('to') || new Date().toISOString();
    const endpoint = searchParams.get('endpoint') || '';
    const status = searchParams.get('status') || '';
    const groupBy = searchParams.get('groupBy') || 'summary'; // 'summary', 'endpoint', 'user', 'time'
    const format = searchParams.get('format') || 'json'; // 'json', 'csv'

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Determine which companies the user can access
    let targetCompanyIds: string[] = [];
    
    if (companyId) {
      // Specific company requested
      if (!canAccessCompany(authResult.user, companyId)) {
        return NextResponse.json(
          { error: 'Access denied to this company' },
          { status: 403 }
        );
      }
      targetCompanyIds = [companyId];
    } else {
      // All accessible companies
      const accessibleIds = getAccessibleCompanyIds(authResult.user);
      if (accessibleIds.length > 0) {
        targetCompanyIds = accessibleIds;
      } else {
        // Owner can see all companies - get all company IDs
        const { data: allCompanies } = await supabase
          .from('companies')
          .select('id');
        targetCompanyIds = allCompanies?.map(c => c.id) || [];
      }
    }

    if (targetCompanyIds.length === 0) {
      return NextResponse.json({
        message: 'No companies accessible',
        data: []
      });
    }

    // Build base query
    let baseQuery = supabase
      .from('api_calls')
      .select(`
        ts,
        endpoint,
        method,
        status_code,
        latency_ms,
        user_id,
        company_id,
        error_code,
        ip
      `)
      .in('company_id', targetCompanyIds)
      .gte('ts', fromDate.toISOString())
      .lte('ts', toDate.toISOString());

    // Apply filters
    if (endpoint) {
      baseQuery = baseQuery.ilike('endpoint', `%${endpoint}%`);
    }

    if (status) {
      if (status === 'error') {
        baseQuery = baseQuery.gte('status_code', 400);
      } else if (status === 'success') {
        baseQuery = baseQuery.lt('status_code', 400);
      } else {
        const statusCode = parseInt(status);
        if (!isNaN(statusCode)) {
          baseQuery = baseQuery.eq('status_code', statusCode);
        }
      }
    }

    switch (groupBy) {
      case 'summary': {
        // Get summary statistics using SQL functions
        const summaryPromises = targetCompanyIds.map(async (cid) => {
          const { data: summary } = await supabase.rpc('get_company_usage_summary', {
            p_company_id: cid,
            p_from_date: fromDate.toISOString(),
            p_to_date: toDate.toISOString()
          });

          const { data: company } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', cid)
            .single();

          return {
            companyId: cid,
            companyName: company?.name || 'Unknown',
            totalCalls: summary?.[0]?.total_calls || 0,
            uniqueUsers: summary?.[0]?.unique_users || 0,
            avgLatency: summary?.[0]?.avg_latency_ms || 0,
            errorRate: summary?.[0]?.error_rate || 0,
            totalErrors: summary?.[0]?.total_errors || 0
          };
        });

        const summaryData = await Promise.all(summaryPromises);

        if (format === 'csv') {
          const csvHeader = 'Company ID,Company Name,Total Calls,Unique Users,Avg Latency (ms),Error Rate (%),Total Errors\n';
          const csvData = summaryData.map(row => 
            `${row.companyId},"${row.companyName}",${row.totalCalls},${row.uniqueUsers},${row.avgLatency},${row.errorRate},${row.totalErrors}`
          ).join('\n');
          
          return new Response(csvHeader + csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename=company-usage-summary.csv'
            }
          });
        }

        return NextResponse.json({
          groupBy: 'summary',
          dateRange: { from, to },
          companies: summaryData,
          totalCompanies: summaryData.length
        });
      }

      case 'endpoint': {
        // Get usage by endpoint using SQL functions
        const endpointPromises = targetCompanyIds.map(async (cid) => {
          const { data: endpoints } = await supabase.rpc('get_company_usage_by_endpoint', {
            p_company_id: cid,
            p_from_date: fromDate.toISOString(),
            p_to_date: toDate.toISOString()
          });

          const { data: company } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', cid)
            .single();

          return {
            companyId: cid,
            companyName: company?.name || 'Unknown',
            endpoints: endpoints?.map((ep: { endpoint: string; method: string; total_calls: number; total_errors: number; avg_latency_ms: number }) => ({
              endpoint: ep.endpoint,
              method: ep.method,
              totalCalls: ep.total_calls,
              totalErrors: ep.total_errors,
              avgLatency: ep.avg_latency_ms
            })) || []
          };
        });

        const endpointData = await Promise.all(endpointPromises);

        if (format === 'csv') {
          const csvHeader = 'Company ID,Company Name,Endpoint,Method,Total Calls,Total Errors,Avg Latency (ms)\n';
          const csvRows: string[] = [];
          
          endpointData.forEach(company => {
            company.endpoints.forEach((ep: { endpoint: string; method: string; totalCalls: number; totalErrors: number; avgLatency: number }) => {
              csvRows.push(`${company.companyId},"${company.companyName}","${ep.endpoint}",${ep.method},${ep.totalCalls},${ep.totalErrors},${ep.avgLatency}`);
            });
          });
          
          return new Response(csvHeader + csvRows.join('\n'), {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename=company-usage-by-endpoint.csv'
            }
          });
        }

        return NextResponse.json({
          groupBy: 'endpoint',
          dateRange: { from, to },
          companies: endpointData
        });
      }

      case 'user': {
        // Get usage by user using SQL functions  
        const userPromises = targetCompanyIds.map(async (cid) => {
          const { data: users } = await supabase.rpc('get_company_usage_by_user', {
            p_company_id: cid,
            p_from_date: fromDate.toISOString(),
            p_to_date: toDate.toISOString()
          });

          const { data: company } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', cid)
            .single();

          return {
            companyId: cid,
            companyName: company?.name || 'Unknown',
            users: users?.map((user: { user_id: string; user_email: string; total_calls: number; total_errors: number; last_call_at: string }) => ({
              userId: user.user_id,
              userEmail: user.user_email,
              totalCalls: user.total_calls,
              totalErrors: user.total_errors,
              lastCallAt: user.last_call_at
            })) || []
          };
        });

        const userData = await Promise.all(userPromises);

        if (format === 'csv') {
          const csvHeader = 'Company ID,Company Name,User ID,User Email,Total Calls,Total Errors,Last Call\n';
          const csvRows: string[] = [];
          
          userData.forEach(company => {
            company.users.forEach((user: { userId: string; userEmail: string; totalCalls: number; totalErrors: number; lastCallAt: string }) => {
              csvRows.push(`${company.companyId},"${company.companyName}",${user.userId},"${user.userEmail}",${user.totalCalls},${user.totalErrors},"${user.lastCallAt || ''}"`);
            });
          });
          
          return new Response(csvHeader + csvRows.join('\n'), {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename=company-usage-by-user.csv'
            }
          });
        }

        return NextResponse.json({
          groupBy: 'user',
          dateRange: { from, to },
          companies: userData
        });
      }

      case 'time': {
        // Get usage aggregated by time periods (daily)
        const { data: rawCalls } = await baseQuery
          .order('ts', { ascending: true });

        // Group by day
        const dailyStats = new Map();
        
        rawCalls?.forEach(call => {
          const day = call.ts.split('T')[0]; // Get YYYY-MM-DD
          if (!dailyStats.has(day)) {
            dailyStats.set(day, {
              date: day,
              totalCalls: 0,
              totalErrors: 0,
              totalLatency: 0,
              uniqueUsers: new Set()
            });
          }
          
          const dayData = dailyStats.get(day);
          dayData.totalCalls++;
          if (call.status_code >= 400) dayData.totalErrors++;
          dayData.totalLatency += call.latency_ms || 0;
          if (call.user_id) dayData.uniqueUsers.add(call.user_id);
        });

        const timeData = Array.from(dailyStats.values()).map(day => ({
          date: day.date,
          totalCalls: day.totalCalls,
          totalErrors: day.totalErrors,
          avgLatency: day.totalCalls > 0 ? Math.round(day.totalLatency / day.totalCalls) : 0,
          uniqueUsers: day.uniqueUsers.size,
          errorRate: day.totalCalls > 0 ? ((day.totalErrors / day.totalCalls) * 100).toFixed(2) : '0.00'
        }));

        if (format === 'csv') {
          const csvHeader = 'Date,Total Calls,Total Errors,Avg Latency (ms),Unique Users,Error Rate (%)\n';
          const csvData = timeData.map(row => 
            `${row.date},${row.totalCalls},${row.totalErrors},${row.avgLatency},${row.uniqueUsers},${row.errorRate}`
          ).join('\n');
          
          return new Response(csvHeader + csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename=company-usage-by-time.csv'
            }
          });
        }

        return NextResponse.json({
          groupBy: 'time',
          dateRange: { from, to },
          timeSeriesData: timeData
        });
      }

      default: {
        return NextResponse.json(
          { error: `Unknown groupBy value: ${groupBy}` },
          { status: 400 }
        );
      }
    }

  } catch (error) {
    console.error('Company usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 