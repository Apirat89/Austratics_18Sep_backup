'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, DollarSign, ArrowLeft, Scale, Shield, Phone, Mail, Heart, Building, Activity } from 'lucide-react';
import type { HomecareProvider } from '@/types/homecare';

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
      console.log('📡 Fetching FULL dataset from /Maps_ABS_CSV/merged_homecare_providers.json...');
      const response = await fetch('/Maps_ABS_CSV/merged_homecare_providers.json');
      
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/homecare')}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Search
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Provider Comparison</h1>
            </div>
          </div>
          <p className="text-gray-600">
            Comparing {providers.length} homecare provider{providers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">
                    Provider Information
                  </th>
                  {providers.map((provider) => (
                    <th key={provider.provider_id} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[250px]">
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900 leading-tight">
                          {provider.provider_info.provider_name}
                        </div>
                        <div className="text-xs text-gray-500 font-normal">
                          {provider.provider_info.address.locality}, {provider.provider_info.address.state} {provider.provider_info.address.postcode}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                
                {/* Contact Information */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      Contact Phone
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      {provider.provider_info.contact.phone || 'N/A'}
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      Email
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      {provider.provider_info.contact.email || 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Website row removed - not available in homecare contact structure */}

                {/* Package Levels */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-600" />
                      Package Levels Offered
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {provider.provider_info.home_care_packages.level_1 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Level 1</span>
                        )}
                        {provider.provider_info.home_care_packages.level_2 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Level 2</span>
                        )}
                        {provider.provider_info.home_care_packages.level_3 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Level 3</span>
                        )}
                        {provider.provider_info.home_care_packages.level_4 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Level 4</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Organization Type */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-600" />
                      Organization Type
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      <span className="capitalize">{provider.provider_info.organization_type || 'N/A'}</span>
                    </td>
                  ))}
                </tr>

                {/* Care Management Costs */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      Level 1 Care Management (Fortnightly)
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm">
                      <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_1_fortnightly, bestLevel1Cost, false)}>
                        {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_1_fortnightly)}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      Level 2 Care Management (Fortnightly)
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm">
                      <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_2_fortnightly, bestLevel2Cost, false)}>
                        {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_2_fortnightly)}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      Level 3 Care Management (Fortnightly)
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm">
                      <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_3_fortnightly, bestLevel3Cost, false)}>
                        {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_3_fortnightly)}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      Level 4 Care Management (Fortnightly)
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm">
                      <span className={getValueColor(provider.cost_info?.management_costs?.care_management?.level_4_fortnightly, bestLevel4Cost, false)}>
                        {formatCurrency(provider.cost_info?.management_costs?.care_management?.level_4_fortnightly)}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Services Offered */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-600" />
                      Services Offered
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {provider.provider_info.services_offered?.slice(0, 5).map((service, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            {service}
                          </span>
                        ))}
                        {provider.provider_info.services_offered?.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{provider.provider_info.services_offered.length - 5} more
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Specialized Care */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-600" />
                      Specialized Care
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {provider.provider_info.specialized_care?.slice(0, 3).map((care, index) => (
                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                            {care}
                          </span>
                        ))}
                        {provider.provider_info.specialized_care?.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{provider.provider_info.specialized_care.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Compliance Status */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-600" />
                      Compliance Status
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      <span className={`px-2 py-1 rounded text-xs ${
                        provider.provider_info.compliance_status === 'No current issues' 
                          ? 'bg-green-100 text-green-800'
                          : provider.provider_info.compliance_status === 'Minor issues'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.provider_info.compliance_status || 'N/A'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Service Area */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-600" />
                      Service Area
                    </div>
                  </td>
                  {providers.map((provider) => (
                    <td key={provider.provider_id} className="px-6 py-4 text-sm text-gray-700">
                      {provider.provider_info.service_area || 'N/A'}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push('/homecare')}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Search
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Print Comparison
          </button>
        </div>
      </div>
    </div>
  );
} 