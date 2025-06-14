'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Building2, Users, DollarSign, Award, Heart, Shield, Clock } from 'lucide-react';
import type { ResidentialFacility } from '@/lib/ResidentialFacilityService';

interface ResidentialFacilityDetailsProps {
  facility: ResidentialFacility;
  onClose: () => void;
}

export function ResidentialFacilityDetails({ facility, onClose }: ResidentialFacilityDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Helper function to render star rating
  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // Helper function to render progress bar
  const renderProgressBar = (value: number, max: number, label: string) => {
    const percentage = (value / max) * 100;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-[800px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{facility.service_name}</h2>
              <p className="text-sm sm:text-base text-gray-600">{facility.formatted_address}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4 sm:p-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Provider Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Provider Name</dt>
                      <dd>{facility.provider_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Provider ID</dt>
                      <dd>{facility.provider_id}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Overall Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderStarRating(facility.overall_rating_stars)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Expenditure</dt>
                      <dd>${facility.expenditure_total_per_day.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Income</dt>
                      <dd>${facility.income_total_per_day.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Surplus</dt>
                      <dd className={facility.budget_surplus_per_day >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${facility.budget_surplus_per_day.toFixed(2)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Room Occupancy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderProgressBar(
                    facility.rooms_data.occupied_rooms,
                    facility.rooms_data.total_rooms,
                    'Room Occupancy'
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Specialized Care
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {facility.specialized_care.map((care, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        {care}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Features & Amenities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {facility.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Capacity Tab */}
          <TabsContent value="capacity">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Room Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {facility.rooms_data.room_types.map((type, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{type.type}</span>
                          <span className="text-sm text-gray-600">
                            {type.count} rooms
                          </span>
                        </div>
                        {renderProgressBar(type.occupancy, type.count, 'Occupancy')}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Rooms</dt>
                      <dd className="text-2xl font-bold">{facility.rooms_data.total_rooms}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Occupied Rooms</dt>
                      <dd className="text-2xl font-bold">{facility.rooms_data.occupied_rooms}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Available Rooms</dt>
                      <dd className="text-2xl font-bold text-green-600">
                        {facility.rooms_data.available_rooms}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Quality Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Overall Rating</dt>
                      <dd>{renderStarRating(facility.overall_rating_stars)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Compliance Rating</dt>
                      <dd>{facility.compliance_rating}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Quality Measures</dt>
                      <dd>{facility.quality_measures_rating}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Staffing Rating</dt>
                      <dd>{facility.staffing_rating}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Resident Experience</dt>
                      <dd>{facility.residents_experience_rating}</dd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Revenue</dt>
                      <dd className="text-2xl font-bold text-green-600">
                        ${facility.income_total_per_day.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Expenses</dt>
                      <dd className="text-2xl font-bold text-red-600">
                        ${facility.expenditure_total_per_day.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Surplus</dt>
                      <dd className={`text-2xl font-bold ${
                        facility.budget_surplus_per_day >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${facility.budget_surplus_per_day.toFixed(2)}
                      </dd>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Occupancy Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Occupancy Rate</dt>
                      <dd className="text-2xl font-bold">
                        {((facility.rooms_data.occupied_rooms / facility.rooms_data.total_rooms) * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Available Capacity</dt>
                      <dd className="text-2xl font-bold text-blue-600">
                        {facility.rooms_data.available_rooms} rooms
                      </dd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 