'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, MapPin, DollarSign, Users, Activity, Heart, ArrowLeft, Scale, Building, Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ResidentialFacility {
  // Enhanced Provider Information
  provider_id?: string;
  "Service Name": string;
  provider_abn?: string;
  provider_name?: string;
  ownership_details?: string;
  last_updated_finance?: string;
  financial_year?: string;
  previous_name?: string;
  
  // Enhanced Location & Contact Information
  overall_rating_stars?: number;
  overall_rating_text?: string;
  compliance_rating?: number;
  quality_measures_rating?: number;
  residents_experience_rating?: number;
  staffing_rating?: number;
  formatted_address?: string;
  address_locality?: string;
  address_state?: string;
  address_postcode?: string;
  address_street?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  latitude?: number;
  longitude?: number;
  
  // Enhanced Room Information
  specialized_care?: string[];
  features?: string[];
  residential_places?: number;
  last_updated_rooms?: string;
  currently_available?: boolean;
  waitlist_available?: boolean;
  rooms_data?: {
    name: string;
    configuration: string;
    cost_per_day: number;
    room_size: string;
  }[];
  
  // Enhanced Food Information
  food_cost_per_day?: number;
  food_sector_average?: number;
  food_resident_satisfaction?: number;
  "star_Compliance rating"?: number;
  "star_[C] Decision type"?: string;
  "star_[C] Date Decision Applied"?: string;
  "star_[C] Date Decision Ends"?: string;
  "star_Quality Measures rating"?: number;
  "star_[QM] Pressure injuries*"?: number;
  "star_[QM] Restrictive practices"?: number;
  "star_[QM] Unplanned weight loss*"?: number;
  "star_[QM] Falls and major injury - falls*"?: number;
  "star_[QM] Falls and major injury - major injury from a fall*"?: number;
  "star_[QM] Medication management - polypharmacy"?: number;
  "star_[QM] Medication management - antipsychotic"?: number;
  "star_Residents' Experience rating"?: number;
  "star_[RE] Interview Year"?: number;
  "star_[RE] Food - Always"?: number;
  "star_[RE] Food - Most of the time"?: number;
  "star_[RE] Food - Some of the time"?: number;
  "star_[RE] Food - Never"?: number;
  "star_[RE] Safety - Always"?: number;
  "star_[RE] Safety - Most of the time"?: number;
  "star_[RE] Safety - Some of the time"?: number;
  "star_[RE] Safety - Never"?: number;
  "star_[RE] Operation - Always"?: number;
  "star_[RE] Operation - Most of the time"?: number;
  "star_[RE] Operation - Some of the time"?: number;
  "star_[RE] Operation - Never"?: number;
  "star_[RE] Care Need - Always"?: number;
  "star_[RE] Care Need - Most of the time"?: number;
  "star_[RE] Care Need - Some of the time"?: number;
  "star_[RE] Care Need - Never"?: number;
  "star_[RE] Competent - Always"?: number;
  "star_[RE] Competent - Most of the time"?: number;
  "star_[RE] Competent - Some of the time"?: number;
  "star_[RE] Competent - Never"?: number;
  "star_[RE] Independent - Always"?: number;
  "star_[RE] Independent - Most of the time"?: number;
  "star_[RE] Independent - Some of the time"?: number;
  "star_[RE] Independent - Never"?: number;
  "star_[RE] Explain - Always"?: number;
  "star_[RE] Explain - Most of the time"?: number;
  "star_[RE] Explain - Some of the time"?: number;
  "star_[RE] Explain - Never"?: number;
  "star_[RE] Respect - Always"?: number;
  "star_[RE] Respect - Most of the time"?: number;
  "star_[RE] Respect - Some of the time"?: number;
  "star_[RE] Respect - Never"?: number;
  "star_[RE] Follow Up - Always"?: number;
  "star_[RE] Follow Up - Most of the time"?: number;
  "star_[RE] Follow Up - Some of the time"?: number;
  "star_[RE] Follow Up - Never"?: number;
  "star_[RE] Caring - Always"?: number;
  "star_[RE] Caring - Most of the time"?: number;
  "star_[RE] Caring - Some of the time"?: number;
  "star_[RE] Caring - Never"?: number;
  "star_[RE] Voice - Always"?: number;
  "star_[RE] Voice - Most of the time"?: number;
  "star_[RE] Voice - Some of the time"?: number;
  "star_[RE] Voice - Never"?: number;
  "star_[RE] Home - Always"?: number;
  "star_[RE] Home - Most of the time"?: number;
  "star_[RE] Home - Some of the time"?: number;
  "star_[RE] Home - Never"?: number;
  "star_Staffing rating"?: number;
  "star_[S] Registered Nurse Care Minutes - Target"?: number;
  "star_[S] Registered Nurse Care Minutes - Actual"?: number;
  "star_[S] Registered Nurse Care Minutes - % Achievement"?: number;
  "star_[S] Total Care Minutes - Target"?: number;
  "star_[S] Total Care Minutes - Actual"?: number;
  "star_[S] Total Care Minutes - % Achievement"?: number;
  // NEW: Enhanced Financial Structure
  financials?: {
    expenditure: {
      total_per_day: { value: number; sector_average: number; variance_percentage: number; };
      care_nursing: {
        total: { value: number; sector_average: number; variance_percentage: number; };
        breakdown: {
          registered_nurses: { value: number; sector_average: number; };
          enrolled_nurses: { value: number; sector_average: number; };
          personal_care_workers: { value: number; sector_average: number; };
          care_management_staff: { value: number; sector_average: number; };
          allied_health: { value: number; sector_average: number; };
          lifestyle_recreation: { value: number; sector_average: number; };
          other_care_expenses: { value: number; sector_average: number; };
        };
      };
      administration: { value: number; sector_average: number | null; variance_percentage: number; };
      cleaning_laundry: {
        total: { value: number; sector_average: number; variance_percentage: number; };
        breakdown: {
          cleaning: { value: number; sector_average: number; };
          laundry: { value: number; sector_average: number; };
          covid_infection_control: { value: number; sector_average: number; };
          other_related: { value: number; sector_average: number; };
        };
      };
      accommodation_maintenance: {
        total: { value: number; sector_average: number; variance_percentage: number; };
        breakdown: {
          accommodation: { value: number; sector_average: number; };
          maintenance: { value: number; sector_average: number; };
        };
      };
      food_catering: { value: number; sector_average: number | null; variance_percentage: number; };
    };
    income: {
      total_per_day: { value: number; sector_average: number; variance_percentage: number; };
      residents_contribution: { value: number; sector_average: number | null; variance_percentage: number; };
      government_funding: { value: number; sector_average: number | null; variance_percentage: number; };
      other: { value: number; sector_average: number | null; variance_percentage: number; };
    };
    budget_surplus_deficit_per_day: { value: number; sector_average: number; };
    care_staff_last_quarter: {
      quarter_period: string;
      total: { value: number; sector_average: number | null; variance_percentage: number | null; };
      breakdown: {
        registered_nurses: { value: number; sector_average: number; };
        enrolled_nurses: { value: number; sector_average: number; };
        personal_care_workers: { value: number; sector_average: number; };
        care_management_staff: { value: number; sector_average: number; };
        physiotherapists: { value: number; sector_average: number; };
        occupational_therapists: { value: number; sector_average: number; };
        speech_pathologists: { value: number; sector_average: number; };
        podiatrists: { value: number; sector_average: number; };
        dietetics: { value: number; sector_average: number; };
        allied_health_assistants: { value: number; sector_average: number; };
        other_allied_health: { value: number; sector_average: number; };
        lifestyle_recreation: { value: number; sector_average: number; };
      };
    };
  };
  
  // DEPRECATED: Old flat financial fields
  expenditure_total_per_day?: number;
  expenditure_care_nursing?: number;
  expenditure_administration?: number;
  expenditure_cleaning_laundry?: number;
  expenditure_accommodation_maintenance?: number;
  expenditure_food_catering?: number;
  income_total_per_day?: number;
  income_residents_contribution?: number;
  income_government_funding?: number;
  income_other?: number;
  budget_surplus_per_day?: number;
  care_staff_spending_last_quarter?: number;
}

// Loading component for Suspense fallback
function LoadingResidentialCompare() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900">Loading comparison data...</h1>
      </div>
    </div>
  );
}

// Main content component that uses useSearchParams
function ResidentialCompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [facilities, setFacilities] = useState<ResidentialFacility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get facility names from URL parameters
    const facilityNames = searchParams?.get('facilities');
    if (!facilityNames) {
      router.push('/residential');
      return;
    }

    const names = facilityNames.split(',');
    loadFacilities(names);
  }, [searchParams, router]);

  const loadFacilities = async (facilityNames: string[]) => {
    try {
      setLoading(true);
      
      // Load the residential data
      const response = await fetch('/maps/abs_csv/Residential_May2025_ExcludeMPS_updated_with_finance.json');
      const data = await response.json();
      
      // Find facilities by name
      const selectedFacilities = data.filter((facility: ResidentialFacility) => 
        facilityNames.includes(facility["Service Name"])
      );
      
      setFacilities(selectedFacilities);
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-gray-400">No rating</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-gray-600">({rating})</span>
      </div>
    );
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const hasValidValue = (value: unknown): boolean => {
    return value !== null && value !== undefined && value !== '' && value !== 0;
  };

  const hasValidValueForExperience = (value: unknown): boolean => {
    return value !== null && value !== undefined && typeof value === 'number';
  };

  const renderComparisonRow = (label: string, fieldKey: keyof ResidentialFacility, isPercentage?: boolean, isCurrency?: boolean, isRating?: boolean) => {
    // Check if any facility has a valid value for this field
    const hasAnyValue = facilities.some(facility => {
      const value = facility[fieldKey];
      return fieldKey.includes('[RE]') ? hasValidValueForExperience(value) : hasValidValue(value);
    });

    if (!hasAnyValue) return null;

    return (
      <tr className="border-b border-gray-100">
        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
          {label}
        </td>
        {facilities.map((facility, index) => {
          const value = facility[fieldKey];
          let displayValue = 'N/A';

          if (value !== null && value !== undefined) {
            if (isRating) {
              return (
                <td key={index} className="p-4 text-center">
                  {renderStarRating(value as number)}
                </td>
              );
            } else if (isCurrency) {
              displayValue = formatCurrency(value as number);
            } else if (isPercentage) {
              displayValue = `${(value as number).toFixed(1)}%`;
            } else {
              displayValue = String(value);
            }
          }

          return (
            <td key={index} className="p-4 text-center">
              {displayValue}
            </td>
          );
        })}
      </tr>
    );
  };

  // Enhanced function for nested financial data
  const renderEnhancedFinancialRow = (label: string, fieldPath: string, isPercentage?: boolean) => {
    // Helper function to get nested value using dot notation
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    // Check if any facility has a valid value for this field path
    const hasAnyValue = facilities.some(facility => {
      const value = getNestedValue(facility, fieldPath);
      return hasValidValue(value);
    });

    if (!hasAnyValue) return null;

    return (
      <tr className="border-b border-gray-100">
        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
          {label}
        </td>
        {facilities.map((facility, index) => {
          const value = getNestedValue(facility, fieldPath);
          let displayValue = 'N/A';

          if (value !== null && value !== undefined && typeof value === 'number') {
            if (isPercentage) {
              displayValue = `${value.toFixed(1)}%`;
            } else {
              displayValue = formatCurrency(value);
            }
          }

          return (
            <td key={index} className="p-4 text-center">
              {displayValue}
            </td>
          );
        })}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facility comparison...</p>
        </div>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No facilities found for comparison.</p>
          <button
            onClick={() => router.push('/residential')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Residential Page
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
                <h1 className="text-3xl font-bold text-gray-900">Facility Comparison</h1>
                <p className="text-gray-600 mt-1">Comparing {facilities.length} residential facilities</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/residential')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Residential
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
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Rooms & Costs
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Quality Measures
            </TabsTrigger>
            <TabsTrigger value="experience" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Residents' Experience
            </TabsTrigger>
            <TabsTrigger value="staffing" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staffing
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Finance & Operations
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
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900 mb-1">{facility["Service Name"]}</div>
                            {facility.formatted_address && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{facility.address_locality}, {facility.address_state}</span>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {renderComparisonRow("Overall Rating", "overall_rating_stars", false, false, true)}
                      {renderComparisonRow("Provider Name", "provider_name")}
                      {renderComparisonRow("Provider ABN", "provider_abn")}
                      {renderComparisonRow("Ownership Details", "ownership_details")}
                      {renderComparisonRow("Address", "formatted_address")}
                      {renderComparisonRow("Phone", "contact_phone")}
                      {renderComparisonRow("Email", "contact_email")}
                      {renderComparisonRow("Website", "contact_website")}
                      {renderComparisonRow("Residential Places", "residential_places")}
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Specialized Care
                        </td>
                        {facilities.map((facility, index) => (
                          <td key={index} className="p-4">
                            {facility.specialized_care && facility.specialized_care.length > 0 ? (
                              <div className="space-y-1">
                                {facility.specialized_care.map((care, idx) => (
                                  <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
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
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Features
                        </td>
                        {facilities.map((facility, index) => (
                          <td key={index} className="p-4">
                            {facility.features && facility.features.length > 0 ? (
                              <div className="space-y-1">
                                {facility.features.map((feature, idx) => (
                                  <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                    {feature}
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

          {/* Tab 2: Rooms & Costs */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Rooms & Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Room Information
                        </th>
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900">{facility["Service Name"]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                          Available Room Types
                        </td>
                        {facilities.map((facility, index) => (
                          <td key={index} className="p-4">
                            {facility.rooms_data && facility.rooms_data.length > 0 ? (
                              <div className="space-y-3">
                                {facility.rooms_data.map((room, idx) => (
                                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="font-medium text-gray-900">{room.name}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      <div>Configuration: {room.configuration}</div>
                                      <div>Cost: {formatCurrency(room.cost_per_day)}/day</div>
                                      <div>Size: {room.room_size}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">No room data available</span>
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

          {/* Tab 3: Compliance */}
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
                          Metric
                        </th>
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900">{facility["Service Name"]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {renderComparisonRow("Compliance Rating", "star_Compliance rating", false, false, true)}
                      {renderComparisonRow("Decision Type", "star_[C] Decision type")}
                      {renderComparisonRow("Date Decision Applied", "star_[C] Date Decision Applied")}
                      {renderComparisonRow("Date Decision Ends", "star_[C] Date Decision Ends")}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Quality Measures */}
          <TabsContent value="quality">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Quality Measures
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
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900">{facility["Service Name"]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {renderComparisonRow("Quality Measures Rating", "star_Quality Measures rating", false, false, true)}
                      {renderComparisonRow("Pressure Injuries (%)", "star_[QM] Pressure injuries*", true)}
                      {renderComparisonRow("Restrictive Practices (%)", "star_[QM] Restrictive practices", true)}
                      {renderComparisonRow("Unplanned Weight Loss (%)", "star_[QM] Unplanned weight loss*", true)}
                      {renderComparisonRow("Falls (%)", "star_[QM] Falls and major injury - falls*", true)}
                      {renderComparisonRow("Falls with Major Injury (%)", "star_[QM] Falls and major injury - major injury from a fall*", true)}
                      {renderComparisonRow("Polypharmacy (%)", "star_[QM] Medication management - polypharmacy", true)}
                      {renderComparisonRow("Antipsychotic Medication (%)", "star_[QM] Medication management - antipsychotic", true)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Residents' Experience */}
          <TabsContent value="experience">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Residents' Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold sticky left-0 z-20 min-w-[200px]">
                          Survey Question
                        </th>
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900">{facility["Service Name"]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {renderComparisonRow("Residents' Experience Rating", "star_Residents' Experience rating", false, false, true)}
                      {renderComparisonRow("Interview Year", "star_[RE] Interview Year")}
                      
                      {/* Survey Questions with breakdown */}
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do staff treat you with respect?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Respect - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Respect - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Respect - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Respect - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do you feel safe here?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Safety - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Safety - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Safety - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Safety - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Is this place well run?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Operation - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Operation - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Operation - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Operation - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do you get the care you need?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Care Need - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Care Need - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Care Need - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Care Need - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do staff know what they are doing?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Competent - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Competent - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Competent - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Competent - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Are you encouraged to do as much as possible for yourself?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Independent - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Independent - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Independent - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Independent - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do staff explain things to you?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Explain - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Explain - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Explain - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Explain - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do you like the food here?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Food - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Food - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Food - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Food - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do staff follow up when you raise things with them?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Follow Up - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Follow Up - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Follow Up - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Follow Up - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Are staff kind and caring?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Caring - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Caring - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Caring - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Caring - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: Do you have a say in your daily activities?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Voice - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Voice - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Voice - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Voice - Never", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Survey Question: How likely are you to recommend this residential aged care home?
                        </td>
                      </tr>
                      {renderComparisonRow("Always (%)", "star_[RE] Home - Always", true)}
                      {renderComparisonRow("Most of the time (%)", "star_[RE] Home - Most of the time", true)}
                      {renderComparisonRow("Some of the time (%)", "star_[RE] Home - Some of the time", true)}
                      {renderComparisonRow("Never (%)", "star_[RE] Home - Never", true)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Staffing */}
          <TabsContent value="staffing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staffing
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
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900">{facility["Service Name"]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {renderComparisonRow("Staffing Rating", "star_Staffing rating", false, false, true)}
                      {renderComparisonRow("RN Care Minutes - Target", "star_[S] Registered Nurse Care Minutes - Target")}
                      {renderComparisonRow("RN Care Minutes - Actual", "star_[S] Registered Nurse Care Minutes - Actual")}
                      {renderComparisonRow("RN Care Minutes - % Achievement", "star_[S] Registered Nurse Care Minutes - % Achievement", true)}
                      {renderComparisonRow("Total Care Minutes - Target", "star_[S] Total Care Minutes - Target")}
                      {renderComparisonRow("Total Care Minutes - Actual", "star_[S] Total Care Minutes - Actual")}
                      {renderComparisonRow("Total Care Minutes - % Achievement", "star_[S] Total Care Minutes - % Achievement", true)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 7: Finance & Operations */}
          <TabsContent value="finance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Finance & Operations
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
                        {facilities.map((facility, index) => (
                          <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                            <div className="font-semibold text-gray-900">{facility["Service Name"]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Total Daily Expenditure
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Total Daily Expenditure", "financials.expenditure.total_per_day.value")}
                      {renderEnhancedFinancialRow("Sector Average", "financials.expenditure.total_per_day.sector_average")}
                      {renderEnhancedFinancialRow("Variance %", "financials.expenditure.total_per_day.variance_percentage", true)}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Care & Nursing Expenditure
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Care & Nursing Total", "financials.expenditure.care_nursing.total.value")}
                      {renderEnhancedFinancialRow("Registered Nurses", "financials.expenditure.care_nursing.breakdown.registered_nurses.value")}
                      {renderEnhancedFinancialRow("Enrolled Nurses", "financials.expenditure.care_nursing.breakdown.enrolled_nurses.value")}
                      {renderEnhancedFinancialRow("Personal Care Workers", "financials.expenditure.care_nursing.breakdown.personal_care_workers.value")}
                      {renderEnhancedFinancialRow("Care Management Staff", "financials.expenditure.care_nursing.breakdown.care_management_staff.value")}
                      {renderEnhancedFinancialRow("Allied Health", "financials.expenditure.care_nursing.breakdown.allied_health.value")}
                      {renderEnhancedFinancialRow("Lifestyle Recreation", "financials.expenditure.care_nursing.breakdown.lifestyle_recreation.value")}
                      {renderEnhancedFinancialRow("Other Care Expenses", "financials.expenditure.care_nursing.breakdown.other_care_expenses.value")}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Cleaning & Laundry Expenditure
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Cleaning & Laundry Total", "financials.expenditure.cleaning_laundry.total.value")}
                      {renderEnhancedFinancialRow("Cleaning", "financials.expenditure.cleaning_laundry.breakdown.cleaning.value")}
                      {renderEnhancedFinancialRow("Laundry", "financials.expenditure.cleaning_laundry.breakdown.laundry.value")}
                      {renderEnhancedFinancialRow("COVID Infection Control", "financials.expenditure.cleaning_laundry.breakdown.covid_infection_control.value")}
                      {renderEnhancedFinancialRow("Other Related", "financials.expenditure.cleaning_laundry.breakdown.other_related.value")}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Accommodation & Maintenance
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Accommodation & Maintenance Total", "financials.expenditure.accommodation_maintenance.total.value")}
                      {renderEnhancedFinancialRow("Accommodation", "financials.expenditure.accommodation_maintenance.breakdown.accommodation.value")}
                      {renderEnhancedFinancialRow("Maintenance", "financials.expenditure.accommodation_maintenance.breakdown.maintenance.value")}

                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-blue-900">
                          Other Expenditure
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Administration", "financials.expenditure.administration.value")}
                      {renderEnhancedFinancialRow("Food & Catering", "financials.expenditure.food_catering.value")}

                      <tr className="border-b border-gray-200 bg-green-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-green-900">
                          Total Daily Income
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Total Daily Income", "financials.income.total_per_day.value")}
                      {renderEnhancedFinancialRow("Sector Average", "financials.income.total_per_day.sector_average")}
                      {renderEnhancedFinancialRow("Variance %", "financials.income.total_per_day.variance_percentage", true)}

                      <tr className="border-b border-gray-200 bg-green-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-green-900">
                          Income Sources
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Residents' Contribution", "financials.income.residents_contribution.value")}
                      {renderEnhancedFinancialRow("Government Funding", "financials.income.government_funding.value")}
                      {renderEnhancedFinancialRow("Other Income", "financials.income.other.value")}

                      <tr className="border-b border-gray-200 bg-purple-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-purple-900">
                          Financial Performance
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Budget Surplus/Deficit Per Day", "financials.budget_surplus_deficit_per_day.value")}
                      
                      <tr className="border-b border-gray-200 bg-orange-50">
                        <td colSpan={facilities.length + 1} className="p-4 font-semibold text-orange-900">
                          Care Staff Spending (Last Quarter)
                        </td>
                      </tr>
                      {renderEnhancedFinancialRow("Care Staff Total", "financials.care_staff_last_quarter.total.value")}
                      {renderEnhancedFinancialRow("Registered Nurses", "financials.care_staff_last_quarter.breakdown.registered_nurses.value")}
                      {renderEnhancedFinancialRow("Enrolled Nurses", "financials.care_staff_last_quarter.breakdown.enrolled_nurses.value")}
                      {renderEnhancedFinancialRow("Personal Care Workers", "financials.care_staff_last_quarter.breakdown.personal_care_workers.value")}
                      {renderEnhancedFinancialRow("Care Management Staff", "financials.care_staff_last_quarter.breakdown.care_management_staff.value")}
                      {renderEnhancedFinancialRow("Physiotherapists", "financials.care_staff_last_quarter.breakdown.physiotherapists.value")}
                      {renderEnhancedFinancialRow("Occupational Therapists", "financials.care_staff_last_quarter.breakdown.occupational_therapists.value")}
                      {renderEnhancedFinancialRow("Speech Pathologists", "financials.care_staff_last_quarter.breakdown.speech_pathologists.value")}
                      {renderEnhancedFinancialRow("Podiatrists", "financials.care_staff_last_quarter.breakdown.podiatrists.value")}
                      {renderEnhancedFinancialRow("Dietetics", "financials.care_staff_last_quarter.breakdown.dietetics.value")}
                      {renderEnhancedFinancialRow("Allied Health Assistants", "financials.care_staff_last_quarter.breakdown.allied_health_assistants.value")}
                      {renderEnhancedFinancialRow("Other Allied Health", "financials.care_staff_last_quarter.breakdown.other_allied_health.value")}
                      {renderEnhancedFinancialRow("Lifestyle Recreation", "financials.care_staff_last_quarter.breakdown.lifestyle_recreation.value")}
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

// Main page component with Suspense boundary
export default function ResidentialCompare() {
  return (
    <Suspense fallback={<LoadingResidentialCompare />}>
      <ResidentialCompareContent />
    </Suspense>
  );
} 