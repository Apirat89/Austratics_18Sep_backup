'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, DollarSign, ArrowLeft, Scale, Shield, Phone, Mail, Heart, Building, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HomecareProvider } from '@/types/homecare';
import { getMapDataUrl } from '@/lib/supabaseStorage';

export default function HomecareComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<HomecareProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 COMPARISON PAGE DEBUG: useEffect triggered');
    
    // Get provider names from URL parameters
    const providerNames = searchParams?.get('providers');
    console.log('📋 Raw URL providers parameter:', providerNames);
    
    if (!providerNames) {
      console.log('❌ No providers parameter found, redirecting to /homecare');
      router.push('/homecare');
      return;
    }

    const names = providerNames.split(',');
    console.log('📝 Decoded provider names array:', names);
    console.log('🔢 Number of providers to load:', names.length);
    
    loadProviders(names);
  }, [searchParams, router]);

  const loadProviders = async (providerNames: string[]) => {
    console.log('🚀 COMPARISON PAGE DEBUG: loadProviders called');
    console.log('📝 Searching for providers:', providerNames);
    
    try {
      setLoading(true);
      
      // Load the full homecare dataset directly (like main page) - NOT via API to avoid pagination
      console.log('📡 Fetching FULL dataset from Supabase Storage...');
      const response = await fetch(getMapDataUrl('merged_homecare_providers.json'));
      
      if (!response.ok) {
        throw new Error(`Failed to load homecare data: ${response.status}`);
      }
      
      const allProviders: HomecareProvider[] = await response.json();
      console.log('✅ Full dataset loaded directly from JSON file');
      console.log('📊 Total providers in full dataset:', allProviders.length);
      
             // Sample a few provider names for debugging
       if (allProviders && allProviders.length > 0) {
         console.log('📋 Sample provider names from full dataset:');
         allProviders.slice(0, 5).forEach((provider: HomecareProvider, i: number) => {
           console.log(`  ${i + 1}. "${provider.provider_info.provider_name}"`);
         });
       }
       
       // Find providers by name
       console.log('🔍 Filtering providers by exact name match...');
       const selectedProviders = allProviders.filter((provider: HomecareProvider) => {
         const isMatch = providerNames.includes(provider.provider_info.provider_name);
         if (isMatch) {
           console.log('✅ MATCH FOUND:', provider.provider_info.provider_name);
         }
         return isMatch;
       });
      
      console.log('📊 Filtered results:', selectedProviders.length, 'providers found');
      console.log('📝 Found providers:', selectedProviders.map((provider: HomecareProvider) => provider.provider_info.provider_name));
      
      setProviders(selectedProviders);
    } catch (error) {
      console.error('❌ COMPARISON PAGE ERROR: Failed to load providers:', error);
    } finally {
      setLoading(false);
      console.log('🏁 COMPARISON PAGE DEBUG: loadProviders completed');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const getBestValue = (values: (number | undefined)[], higherIsBetter: boolean = true) => {
    const validValues = values.filter(v => v !== undefined && v !== null) as number[];
    if (validValues.length === 0) return undefined;
    
    return higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
  };

  const getValueColor = (value: number | undefined, bestValue: number | undefined, higherIsBetter: boolean = true) => {
    if (!value || !bestValue) return 'text-gray-600';
    
    if (value === bestValue) {
      return 'text-green-600 font-semibold';
    }
    
    const threshold = higherIsBetter ? bestValue * 0.9 : bestValue * 1.1;
    return higherIsBetter 
      ? (value >= threshold ? 'text-yellow-600' : 'text-red-600')
      : (value <= threshold ? 'text-yellow-600' : 'text-red-600');
  };

  // Calculate best values for highlighting
  const packageLevel1Costs = providers.map(p => p.cost_info?.management_costs?.care_management?.level_1_fortnightly);
  const packageLevel2Costs = providers.map(p => p.cost_info?.management_costs?.care_management?.level_2_fortnightly);
  const packageLevel3Costs = providers.map(p => p.cost_info?.management_costs?.care_management?.level_3_fortnightly);
  const packageLevel4Costs = providers.map(p => p.cost_info?.management_costs?.care_management?.level_4_fortnightly);

  const bestLevel1Cost = getBestValue(packageLevel1Costs, false); // Lower is better for costs
  const bestLevel2Cost = getBestValue(packageLevel2Costs, false);
  const bestLevel3Cost = getBestValue(packageLevel3Costs, false);
  const bestLevel4Cost = getBestValue(packageLevel4Costs, false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading provider comparison...</p>
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Providers Found</h1>
          <p className="text-gray-600 mb-4">The selected providers could not be found.</p>
          <button
            onClick={() => router.push('/homecare')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Homecare Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Provider Comparison</h1>
                <p className="text-gray-600 mt-1">Comparing {providers.length} homecare provider{providers.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/homecare')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Homecare
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="main" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Main
            </TabsTrigger>
            <TabsTrigger value="package-costs" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Package Costs
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="service-costs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Service Costs
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Finance
            </TabsTrigger>
            <TabsTrigger value="coverage" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Coverage
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Main Information */}
          <TabsContent value="main">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Main Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Metric
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Provider Name</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{provider.provider_info.provider_name}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Provider ID</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 font-mono text-sm">{provider.provider_info.provider_id}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Organization Type</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 capitalize">{provider.provider_info.organization_type || 'N/A'}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-600" />
                            Contact Phone
                          </div>
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.provider_info.contact.phone ? (
                              <a href={`tel:${provider.provider_info.contact.phone}`} className="text-blue-600 hover:underline">
                                {provider.provider_info.contact.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-600" />
                            Email
                          </div>
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.provider_info.contact.email ? (
                              <a href={`mailto:${provider.provider_info.contact.email}`} className="text-blue-600 hover:underline">
                                {provider.provider_info.contact.email}
                              </a>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Full Address</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <div className="space-y-1">
                              <div>{provider.provider_info.address.street}</div>
                              <div className="text-sm text-gray-600">
                                {provider.provider_info.address.locality}, {provider.provider_info.address.state} {provider.provider_info.address.postcode}
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Service Area</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{provider.provider_info.service_area || 'N/A'}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Last Updated</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 text-sm">
                            {provider.provider_info.last_updated ? 
                              new Date(provider.provider_info.last_updated).toLocaleDateString() : 'N/A'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Services */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Service Information
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Home Care Package Levels
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {provider.provider_info.home_care_packages.level_1 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">Level 1</span>
                              )}
                              {provider.provider_info.home_care_packages.level_2 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">Level 2</span>
                              )}
                              {provider.provider_info.home_care_packages.level_3 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">Level 3</span>
                              )}
                              {provider.provider_info.home_care_packages.level_4 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">Level 4</span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Services Offered
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.provider_info.services_offered && provider.provider_info.services_offered.length > 0 ? (
                              <div className="space-y-1">
                                {provider.provider_info.services_offered.map((service, idx) => (
                                  <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                    {service}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Specialized Care
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.provider_info.specialized_care && provider.provider_info.specialized_care.length > 0 ? (
                              <div className="space-y-1">
                                {provider.provider_info.specialized_care.map((care, idx) => (
                                  <span key={idx} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                    {care}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Costs & Pricing */}
          <TabsContent value="package-costs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Package Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Cost Information
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 1 Care Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_1_fortnightly, bestLevel1Cost, false)}>
                              {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_1_fortnightly)}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 2 Care Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_2_fortnightly, bestLevel2Cost, false)}>
                              {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_2_fortnightly)}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 3 Care Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_3_fortnightly, bestLevel3Cost, false)}>
                              {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_3_fortnightly)}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 4 Care Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_4_fortnightly, bestLevel4Cost, false)}>
                              {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_4_fortnightly)}
                            </span>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Package Management Costs Section */}
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="p-4 font-bold text-blue-900 bg-blue-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Package Management Costs
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 1 Package Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.cost_info?.management_costs?.package_management?.level_1_fortnightly)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 2 Package Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.cost_info?.management_costs?.package_management?.level_2_fortnightly)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 3 Package Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.cost_info?.management_costs?.package_management?.level_3_fortnightly)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Level 4 Package Management (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.cost_info?.management_costs?.package_management?.level_4_fortnightly)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Package Budget Section */}
                      <tr className="border-b border-gray-200 bg-green-50">
                        <td className="p-4 font-bold text-green-900 bg-green-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Package Budgets
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          HCP Level 1 Budget (Fortnightly)
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.cost_info?.package_budget?.hcp_level_1_fortnightly)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Charges Basic Daily Fee
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              provider.cost_info?.package_budget?.charges_basic_daily_fee 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {provider.cost_info?.package_budget?.charges_basic_daily_fee ? 'Yes' : 'No'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Offers Self Management
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              provider.cost_info?.management_costs?.offers_self_management 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {provider.cost_info?.management_costs?.offers_self_management ? 'Yes' : 'No'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Service Costs */}
          <TabsContent value="service-costs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Service Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Service Rate Information
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Personal Care Rates */}
                      <tr className="border-b border-gray-200 bg-purple-50">
                        <td className="p-4 font-bold text-purple-900 bg-purple-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Personal Care Rates (Hourly)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.personal_care?.standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Non-Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.personal_care?.non_standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Saturday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.personal_care?.saturday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Sunday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.personal_care?.sunday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Public Holidays Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.personal_care?.public_holidays)}</td>
                        ))}
                      </tr>

                      {/* Nursing Rates */}
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="p-4 font-bold text-blue-900 bg-blue-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Nursing Care Rates (Hourly)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.nursing?.standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Non-Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.nursing?.non_standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Saturday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.nursing?.saturday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Sunday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.nursing?.sunday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Public Holidays Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.nursing?.public_holidays)}</td>
                        ))}
                      </tr>

                      {/* Cleaning & Household Rates */}
                      <tr className="border-b border-gray-200 bg-green-50">
                        <td className="p-4 font-bold text-green-900 bg-green-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Cleaning & Household Rates (Hourly)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.cleaning_household?.standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Non-Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.cleaning_household?.non_standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Saturday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.cleaning_household?.saturday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Sunday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.cleaning_household?.sunday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Public Holidays Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.cleaning_household?.public_holidays)}</td>
                        ))}
                      </tr>

                      {/* Light Gardening Rates */}
                      <tr className="border-b border-gray-200 bg-yellow-50">
                        <td className="p-4 font-bold text-yellow-900 bg-yellow-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Light Gardening Rates (Hourly)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.light_gardening?.standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Non-Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.light_gardening?.non_standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Saturday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.light_gardening?.saturday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Sunday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.light_gardening?.sunday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Public Holidays Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.light_gardening?.public_holidays)}</td>
                        ))}
                      </tr>

                      {/* In-Home Respite Rates */}
                      <tr className="border-b border-gray-200 bg-indigo-50">
                        <td className="p-4 font-bold text-indigo-900 bg-indigo-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          In-Home Respite Rates (Hourly)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.in_home_respite?.standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Non-Standard Hours</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.in_home_respite?.non_standard_hours)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Saturday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.in_home_respite?.saturday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Sunday Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.in_home_respite?.sunday)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Public Holidays Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.service_costs?.in_home_respite?.public_holidays)}</td>
                        ))}
                      </tr>

                      {/* Travel Costs */}
                      <tr className="border-b border-gray-200 bg-orange-50">
                        <td className="p-4 font-bold text-orange-900 bg-orange-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Travel Costs
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Per Kilometer Rate</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{formatCurrency(provider.cost_info?.travel_costs?.per_km_rate)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Special Conditions</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 text-sm">
                            {provider.cost_info?.travel_costs?.special_conditions || 'Standard conditions apply'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Compliance */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Compliance Information
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Compliance Status
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              provider.provider_info.compliance_status === 'No current issues' 
                                ? 'bg-green-100 text-green-800'
                                : provider.provider_info.compliance_status === 'Minor issues'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {provider.provider_info.compliance_status || provider.compliance_info?.compliance_assessment?.current_status || 'N/A'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Last Updated
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 text-sm">
                            {provider.provider_info.last_updated ? 
                              new Date(provider.provider_info.last_updated).toLocaleDateString() : 'N/A'}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Current Issues */}
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Current Issues
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.compliance_info?.compliance_assessment?.current_issues && 
                             provider.compliance_info.compliance_assessment.current_issues.length > 0 ? (
                              <div className="space-y-1">
                                {provider.compliance_info.compliance_assessment.current_issues.map((issue, idx) => (
                                  <span key={idx} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-green-600 text-sm">No current issues</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Most Compliments */}
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Most Compliments
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.compliance_info?.service_feedback?.most_compliments && 
                             provider.compliance_info.service_feedback.most_compliments.length > 0 ? (
                              <div className="space-y-1">
                                {provider.compliance_info.service_feedback.most_compliments.slice(0, 3).map((compliment, idx) => (
                                  <div key={idx} className="text-xs text-green-700 bg-green-50 p-1 rounded">
                                    • {compliment}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Most Concerns */}
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Most Concerns
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.compliance_info?.service_feedback?.most_concerns && 
                             provider.compliance_info.service_feedback.most_concerns.length > 0 ? (
                              <div className="space-y-1">
                                {provider.compliance_info.service_feedback.most_concerns.slice(0, 3).map((concern, idx) => (
                                  <div key={idx} className="text-xs text-red-700 bg-red-50 p-1 rounded">
                                    • {concern}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Improvement Focus */}
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Improvement Focus
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {provider.compliance_info?.improvement_focus && 
                             provider.compliance_info.improvement_focus.length > 0 ? (
                              <div className="space-y-1">
                                {provider.compliance_info.improvement_focus.map((focus, idx) => (
                                  <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                    {focus}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Finance */}
          <TabsContent value="finance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Finance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Financial Information
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Financial Overview */}
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="p-4 font-bold text-blue-900 bg-blue-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Financial Overview
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Financial Year</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{provider.finance_info?.financial_year || 'N/A'}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Provider ABN</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 font-mono text-sm">{provider.finance_info?.provider_abn || 'N/A'}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Ownership Details</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 text-sm">{provider.finance_info?.ownership_details || 'N/A'}</td>
                        ))}
                      </tr>

                      {/* Income Summary */}
                      <tr className="border-b border-gray-200 bg-green-50">
                        <td className="p-4 font-bold text-green-900 bg-green-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Income Summary
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Total Income</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 font-semibold text-green-700">
                            {formatCurrency(provider.finance_info?.financials?.income?.total)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Direct Care Income</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.finance_info?.financials?.income?.care_income?.breakdown?.direct_care?.value)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Management Service Fees</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.finance_info?.financials?.income?.management_service_fees?.total?.value)}
                          </td>
                        ))}
                      </tr>

                      {/* Expenditure Summary */}
                      <tr className="border-b border-gray-200 bg-red-50">
                        <td className="p-4 font-bold text-red-900 bg-red-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Expenditure Summary
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Total Expenditure</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4 font-semibold text-red-700">
                            {formatCurrency(provider.finance_info?.financials?.expenditure?.total)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Care Expenses</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.finance_info?.financials?.expenditure?.care_expenses?.total?.value)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Administration Support</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            {formatCurrency(provider.finance_info?.financials?.expenditure?.administration_support?.value)}
                          </td>
                        ))}
                      </tr>

                      {/* Performance */}
                      <tr className="border-b border-gray-200 bg-purple-50">
                        <td className="p-4 font-bold text-purple-900 bg-purple-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Financial Performance
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Budget Surplus/Deficit</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <span className={`font-semibold ${
                              (provider.finance_info?.financials?.budget_surplus_deficit?.value || 0) >= 0 
                                ? 'text-green-700' 
                                : 'text-red-700'
                            }`}>
                              {formatCurrency(provider.finance_info?.financials?.budget_surplus_deficit?.value)}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Staff Pay Rates */}
                      <tr className="border-b border-gray-200 bg-orange-50">
                        <td className="p-4 font-bold text-orange-900 bg-orange-100 sticky left-0 z-10 min-w-[200px]" colSpan={providers.length + 1}>
                          Staff Pay Rates (Hourly)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Registered Nurse</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <div className="space-y-1">
                              <div>{formatCurrency(provider.finance_info?.financials?.staff_pay_rates?.registered_nurse?.hourly_rate)}</div>
                              <div className="text-xs text-gray-500">
                                Sector avg: {formatCurrency(provider.finance_info?.financials?.staff_pay_rates?.registered_nurse?.sector_average)}
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">Home Care Worker</td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">
                            <div className="space-y-1">
                              <div>{formatCurrency(provider.finance_info?.financials?.staff_pay_rates?.home_care_worker?.hourly_rate)}</div>
                              <div className="text-xs text-gray-500">
                                Sector avg: {formatCurrency(provider.finance_info?.financials?.staff_pay_rates?.home_care_worker?.sector_average)}
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 7: Coverage */}
          <TabsContent value="coverage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Coverage Information
                        </th>
                        {providers.map((provider, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{provider.provider_info.provider_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Service Area
                        </td>
                        {providers.map((provider, index) => (
                          <td key={index} className="p-4">{provider.provider_info.service_area || 'N/A'}</td>
                        ))}
                      </tr>

                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
} 