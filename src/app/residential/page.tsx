'use client';

import React, { useState, useEffect } from 'react';
import { Search, Building, Star, Phone, Mail, Globe, MapPin, Users, DollarSign, FileText, Activity, Heart, Award, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResidentialBoxPlots from '@/components/residential/ResidentialBoxPlots';

interface ResidentialFacility {
  "Service Name": string;
  provider_abn?: string;
  provider_name?: string;
  ownership_details?: string;
  overall_rating_stars?: number;
  overall_rating_text?: string;
  compliance_rating?: number;
  quality_measures_rating?: number;
  residents_experience_rating?: number;
  staffing_rating?: number;
  formatted_address?: string;
  address_locality?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  specialized_care?: string[];
  features?: string[];
  residential_places?: number;
  rooms_data?: {
    name: string;
    configuration: string;
    cost_per_day: number;
    room_size: string;
  }[];
  // Star ratings for compliance
  "star_Compliance rating"?: number;
  "star_[C] Decision type"?: string;
  "star_[C] Date Decision Applied"?: string;
  "star_[C] Date Decision Ends"?: string;
  // Quality measures
  "star_Quality Measures rating"?: number;
  "star_[QM] Pressure injuries*"?: number;
  "star_[QM] Restrictive practices"?: number;
  "star_[QM] Unplanned weight loss*"?: number;
  "star_[QM] Falls and major injury - falls*"?: number;
  "star_[QM] Falls and major injury - major injury from a fall*"?: number;
  "star_[QM] Medication management - polypharmacy"?: number;
  "star_[QM] Medication management - antipsychotic"?: number;
  // Residents' Experience
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
  // Staffing
  "star_Staffing rating"?: number;
  "star_[S] Registered Nurse Care Minutes - Target"?: number;
  "star_[S] Registered Nurse Care Minutes - Actual"?: number;
  "star_[S] Total Care Minutes - Target"?: number;
  "star_[S] Total Care Minutes - Actual"?: number;
  // Finance
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

export default function ResidentialPage() {
  const [facilities, setFacilities] = useState<ResidentialFacility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<ResidentialFacility[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<ResidentialFacility | null>(null);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await fetch('/maps/abs_csv/Residential_May2025_ExcludeMPS_updated.json');
        const data = await response.json();
        setFacilities(data);
        setFilteredFacilities([]); // Start with empty list
      } catch (error) {
        console.error('Error loading facilities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFacilities([]); // Show no facilities when search is empty
    } else {
      const filtered = facilities.filter(facility =>
        facility["Service Name"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.formatted_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.address_locality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFacilities(filtered);
    }
  }, [searchTerm, facilities]);

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-gray-400">No rating</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const renderField = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') return null;
    
    return (
      <div className="mb-3">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="text-gray-900">{value}</dd>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading residential facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Building className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Residential Aged Care Facilities</h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by facility name, address, locality, or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <p className="mt-2 text-sm text-gray-600">
            {searchTerm.trim() === '' 
              ? `Search through ${facilities.length} residential facilities using the search bar above`
              : `Showing ${filteredFacilities.length} of ${facilities.length} facilities`
            }
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedFacility ? (
          /* Facility List */
          <div>
            {searchTerm.trim() === '' ? (
              /* Empty State - No Search */
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Residential Facilities</h3>
                <p className="text-gray-600 mb-4">
                  Use the search bar above to find residential aged care facilities by name, address, locality, or provider.
                </p>
                <p className="text-sm text-gray-500">
                  {facilities.length} facilities available to search through
                </p>
              </div>
            ) : filteredFacilities.length > 0 ? (
              /* Facility Results */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFacilities.map((facility, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedFacility(facility)}>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {facility["Service Name"]}
                      </CardTitle>
                      {facility.formatted_address && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {facility.formatted_address}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {facility.overall_rating_stars && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Overall Rating</p>
                            {renderStarRating(facility.overall_rating_stars)}
                          </div>
                        )}
                        
                        {facility.rooms_data && facility.rooms_data.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            {facility.rooms_data.length} room types available
                          </div>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFacility(facility);
                          }}
                          className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* No Results */
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No facilities found</h3>
                <p className="text-gray-600 mb-4">
                  No residential facilities match your search criteria.
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search terms or browse all {facilities.length} available facilities.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Facility Details */
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setSelectedFacility(null)}
              className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to facilities list
            </button>
            
            <div className="bg-white rounded-lg shadow-lg">
              {/* Header */}
              <div className="p-6 border-b">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedFacility["Service Name"]}
                </h1>
                {selectedFacility.formatted_address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {selectedFacility.formatted_address}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="main" className="p-6">
                <TabsList className="grid grid-cols-8 gap-2 mb-6">
                  <TabsTrigger value="main">Main</TabsTrigger>
                  <TabsTrigger value="rooms">Rooms</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="quality">Quality Measures</TabsTrigger>
                  <TabsTrigger value="experience">Residents' Experience</TabsTrigger>
                  <TabsTrigger value="staffing">Staff Rating</TabsTrigger>
                  <TabsTrigger value="finance">Finance</TabsTrigger>
                  <TabsTrigger value="statistics">Statistics</TabsTrigger>
                </TabsList>

                {/* Tab 1: Main */}
                <TabsContent value="main">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Facility Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          {renderField("Service Name", selectedFacility["Service Name"])}
                          {renderField("Provider ABN", selectedFacility.provider_abn)}
                          {renderField("Ownership Details", selectedFacility.ownership_details)}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Ratings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedFacility.overall_rating_stars && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Overall Rating</p>
                            {renderStarRating(selectedFacility.overall_rating_stars)}
                            {selectedFacility.overall_rating_text && (
                              <p className="text-sm text-gray-600">({selectedFacility.overall_rating_text})</p>
                            )}
                          </div>
                        )}
                        {renderField("Compliance Rating", selectedFacility.compliance_rating)}
                        {renderField("Quality Measures Rating", selectedFacility.quality_measures_rating)}
                        {renderField("Residents Experience Rating", selectedFacility.residents_experience_rating)}
                        {renderField("Staffing Rating", selectedFacility.staffing_rating)}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          {renderField("Address", selectedFacility.formatted_address)}
                          {selectedFacility.contact_phone && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Phone</dt>
                              <dd>
                                <a href={`tel:${selectedFacility.contact_phone}`} 
                                   className="text-blue-600 hover:text-blue-800">
                                  {selectedFacility.contact_phone}
                                </a>
                              </dd>
                            </div>
                          )}
                          {selectedFacility.contact_email && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Email</dt>
                              <dd>
                                <a href={`mailto:${selectedFacility.contact_email}`} 
                                   className="text-blue-600 hover:text-blue-800">
                                  {selectedFacility.contact_email}
                                </a>
                              </dd>
                            </div>
                          )}
                          {selectedFacility.contact_website && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Website</dt>
                              <dd>
                                <a href={selectedFacility.contact_website} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                  <Globe className="w-4 h-4" />
                                  Visit Website
                                </a>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Care & Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedFacility.specialized_care && selectedFacility.specialized_care.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Specialized Care</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedFacility.specialized_care.map((care, index) => (
                                <span key={index} className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-900">{care}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedFacility.features && selectedFacility.features.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-2">Features</p>
                            <div className="space-y-1">
                              {selectedFacility.features.map((feature, index) => (
                                <p key={index} className="text-sm text-gray-600">• {feature}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 2: Rooms */}
                <TabsContent value="rooms">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Room Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderField("Service Name", selectedFacility["Service Name"])}
                      {renderField("Residential Places", selectedFacility.residential_places)}
                      
                      {selectedFacility.rooms_data && selectedFacility.rooms_data.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-semibold mb-4">Available Room Types</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedFacility.rooms_data.map((room, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                {renderField("Room Name", room.name)}
                                {renderField("Configuration", room.configuration)}
                                {renderField("Cost per Day", formatCurrency(room.cost_per_day))}
                                {renderField("Room Size", room.room_size)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 3: Compliance */}
                <TabsContent value="compliance">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Compliance Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Compliance Rating", selectedFacility["star_Compliance rating"])}
                        {renderField("Decision Type", selectedFacility["star_[C] Decision type"])}
                        {renderField("Date Decision Applied", selectedFacility["star_[C] Date Decision Applied"])}
                        {renderField("Date Decision Ends", selectedFacility["star_[C] Date Decision Ends"])}
                      </dl>
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
                      <dl className="space-y-2">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Quality Measures Rating", selectedFacility["star_Quality Measures rating"])}
                        {renderField("Pressure Injuries", selectedFacility["star_[QM] Pressure injuries*"])}
                        {renderField("Restrictive Practices", selectedFacility["star_[QM] Restrictive practices"])}
                        {renderField("Unplanned Weight Loss", selectedFacility["star_[QM] Unplanned weight loss*"])}
                        {renderField("Falls and Major Injury - Falls", selectedFacility["star_[QM] Falls and major injury - falls*"])}
                        {renderField("Falls and Major Injury - Major Injury", selectedFacility["star_[QM] Falls and major injury - major injury from a fall*"])}
                        {renderField("Medication Management - Polypharmacy", selectedFacility["star_[QM] Medication management - polypharmacy"])}
                        {renderField("Medication Management - Antipsychotic", selectedFacility["star_[QM] Medication management - antipsychotic"])}
                      </dl>
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
                      <div className="space-y-6">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Residents' Experience Rating", selectedFacility["star_Residents' Experience rating"])}
                        {renderField("Interview Year", selectedFacility["star_[RE] Interview Year"])}
                        
                        {/* Food Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Food Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Food - Always"] && renderField("Always", selectedFacility["star_[RE] Food - Always"] + '%')}
                            {selectedFacility["star_[RE] Food - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Food - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Food - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Food - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Food - Never"] && renderField("Never", selectedFacility["star_[RE] Food - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Safety Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Safety Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Safety - Always"] && renderField("Always", selectedFacility["star_[RE] Safety - Always"] + '%')}
                            {selectedFacility["star_[RE] Safety - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Safety - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Safety - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Safety - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Safety - Never"] && renderField("Never", selectedFacility["star_[RE] Safety - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Operation Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Operation Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Operation - Always"] && renderField("Always", selectedFacility["star_[RE] Operation - Always"] + '%')}
                            {selectedFacility["star_[RE] Operation - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Operation - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Operation - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Operation - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Operation - Never"] && renderField("Never", selectedFacility["star_[RE] Operation - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Care Need Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Care Need Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Care Need - Always"] && renderField("Always", selectedFacility["star_[RE] Care Need - Always"] + '%')}
                            {selectedFacility["star_[RE] Care Need - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Care Need - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Care Need - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Care Need - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Care Need - Never"] && renderField("Never", selectedFacility["star_[RE] Care Need - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Competent Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Competent Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Competent - Always"] && renderField("Always", selectedFacility["star_[RE] Competent - Always"] + '%')}
                            {selectedFacility["star_[RE] Competent - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Competent - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Competent - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Competent - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Competent - Never"] && renderField("Never", selectedFacility["star_[RE] Competent - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Independence Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Independence Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Independent - Always"] && renderField("Always", selectedFacility["star_[RE] Independent - Always"] + '%')}
                            {selectedFacility["star_[RE] Independent - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Independent - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Independent - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Independent - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Independent - Never"] && renderField("Never", selectedFacility["star_[RE] Independent - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Explanation Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Explanation Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Explain - Always"] && renderField("Always", selectedFacility["star_[RE] Explain - Always"] + '%')}
                            {selectedFacility["star_[RE] Explain - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Explain - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Explain - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Explain - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Explain - Never"] && renderField("Never", selectedFacility["star_[RE] Explain - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Respect Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Respect Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Respect - Always"] && renderField("Always", selectedFacility["star_[RE] Respect - Always"] + '%')}
                            {selectedFacility["star_[RE] Respect - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Respect - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Respect - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Respect - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Respect - Never"] && renderField("Never", selectedFacility["star_[RE] Respect - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Follow Up Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Follow Up Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Follow Up - Always"] && renderField("Always", selectedFacility["star_[RE] Follow Up - Always"] + '%')}
                            {selectedFacility["star_[RE] Follow Up - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Follow Up - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Follow Up - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Follow Up - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Follow Up - Never"] && renderField("Never", selectedFacility["star_[RE] Follow Up - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Caring Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Caring Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Caring - Always"] && renderField("Always", selectedFacility["star_[RE] Caring - Always"] + '%')}
                            {selectedFacility["star_[RE] Caring - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Caring - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Caring - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Caring - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Caring - Never"] && renderField("Never", selectedFacility["star_[RE] Caring - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Voice Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Voice Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Voice - Always"] && renderField("Always", selectedFacility["star_[RE] Voice - Always"] + '%')}
                            {selectedFacility["star_[RE] Voice - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Voice - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Voice - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Voice - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Voice - Never"] && renderField("Never", selectedFacility["star_[RE] Voice - Never"] + '%')}
                          </dl>
                        </div>

                        {/* Home Experience */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Home Experience</h4>
                          <dl className="space-y-1 ml-4">
                            {selectedFacility["star_[RE] Home - Always"] && renderField("Always", selectedFacility["star_[RE] Home - Always"] + '%')}
                            {selectedFacility["star_[RE] Home - Most of the time"] && renderField("Most of the time", selectedFacility["star_[RE] Home - Most of the time"] + '%')}
                            {selectedFacility["star_[RE] Home - Some of the time"] && renderField("Some of the time", selectedFacility["star_[RE] Home - Some of the time"] + '%')}
                            {selectedFacility["star_[RE] Home - Never"] && renderField("Never", selectedFacility["star_[RE] Home - Never"] + '%')}
                          </dl>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 6: Staff Rating */}
                <TabsContent value="staffing">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Staff Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Staffing Rating", selectedFacility["star_Staffing rating"])}
                        {renderField("Registered Nurse Care Minutes - Target", selectedFacility["star_[S] Registered Nurse Care Minutes - Target"])}
                        {renderField("Registered Nurse Care Minutes - Actual", selectedFacility["star_[S] Registered Nurse Care Minutes - Actual"])}
                        {renderField("Total Care Minutes - Target", selectedFacility["star_[S] Total Care Minutes - Target"])}
                        {renderField("Total Care Minutes - Actual", selectedFacility["star_[S] Total Care Minutes - Actual"])}
                      </dl>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 7: Finance */}
                <TabsContent value="finance">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Financial Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Expenditure (per day)</h4>
                          <dl className="space-y-2">
                            {renderField("Service Name", selectedFacility["Service Name"])}
                            {renderField("Total Expenditure", formatCurrency(selectedFacility.expenditure_total_per_day))}
                            {renderField("Care & Nursing", formatCurrency(selectedFacility.expenditure_care_nursing))}
                            {renderField("Administration", formatCurrency(selectedFacility.expenditure_administration))}
                            {renderField("Cleaning & Laundry", formatCurrency(selectedFacility.expenditure_cleaning_laundry))}
                            {renderField("Accommodation & Maintenance", formatCurrency(selectedFacility.expenditure_accommodation_maintenance))}
                            {renderField("Food & Catering", formatCurrency(selectedFacility.expenditure_food_catering))}
                          </dl>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Income (per day)</h4>
                          <dl className="space-y-2">
                            {renderField("Total Income", formatCurrency(selectedFacility.income_total_per_day))}
                            {renderField("Residents Contribution", formatCurrency(selectedFacility.income_residents_contribution))}
                            {renderField("Government Funding", formatCurrency(selectedFacility.income_government_funding))}
                            {renderField("Other Income", formatCurrency(selectedFacility.income_other))}
                            {renderField("Budget Surplus", formatCurrency(selectedFacility.budget_surplus_per_day))}
                            {renderField("Care Staff Spending (Last Quarter)", formatCurrency(selectedFacility.care_staff_spending_last_quarter))}
                          </dl>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 8: Statistics */}
                <TabsContent value="statistics">
                  <ResidentialBoxPlots selectedFacility={selectedFacility} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 