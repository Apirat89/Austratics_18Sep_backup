'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResidentialFacility } from '@/lib/ResidentialFacilityService';

interface FacilityAnalyticsProps {
  facility: ResidentialFacility;
}

export function FacilityAnalytics({ facility }: FacilityAnalyticsProps) {
  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper function to format percentage
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  // Calculate occupancy rate
  const occupancyRate = (facility.rooms_data.occupied_rooms / facility.rooms_data.total_rooms) * 100;

  // Helper function to calculate financial health score
  const calculateFinancialHealthScore = (facility: ResidentialFacility) => {
    const surplusRatio = facility.budget_surplus_per_day / facility.expenditure_total_per_day;
    const score = Math.min(100, Math.max(0, (surplusRatio + 1) * 50));
    return Math.round(score);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Daily Revenue</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(facility.income_total_per_day)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Daily Expenses</span>
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(facility.expenditure_total_per_day)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Daily Surplus</span>
                <span className={`text-sm font-medium ${
                  facility.budget_surplus_per_day >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(facility.budget_surplus_per_day)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    facility.budget_surplus_per_day >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Occupancy Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Occupancy Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Overall Occupancy</span>
                <span className="text-sm font-medium">
                  {((facility.rooms_data.occupied_rooms / facility.rooms_data.total_rooms) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(facility.rooms_data.occupied_rooms / facility.rooms_data.total_rooms) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Available Rooms</span>
                <span className="text-sm font-medium text-blue-600">
                  {facility.rooms_data.available_rooms}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(facility.rooms_data.available_rooms / facility.rooms_data.total_rooms) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Overall Rating</span>
                <span className="text-sm font-medium">
                  {facility.overall_rating_stars.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${(facility.overall_rating_stars / 5) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Compliance Rating</span>
                <span className="text-sm font-medium">
                  {facility.compliance_rating}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Financial Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Financial Health Score</span>
                <span className={`text-sm font-medium ${
                  facility.budget_surplus_per_day >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {calculateFinancialHealthScore(facility)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    facility.budget_surplus_per_day >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${calculateFinancialHealthScore(facility)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 