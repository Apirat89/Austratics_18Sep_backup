'use client';

import React from 'react';
import { Star, MapPin, DollarSign, Users, Activity, Heart, Award, X, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  address_state?: string;
  address_postcode?: string;
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
  "star_Compliance rating"?: number;
  "star_Quality Measures rating"?: number;
  "star_Residents' Experience rating"?: number;
  "star_Staffing rating"?: number;
  expenditure_total_per_day?: number;
  income_total_per_day?: number;
  budget_surplus_per_day?: number;
  // Add more fields as needed
}

interface ComparisonTableProps {
  facilities: ResidentialFacility[];
  onRemoveFacility: (facility: ResidentialFacility) => void;
  onClose: () => void;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ 
  facilities, 
  onRemoveFacility, 
  onClose 
}) => {
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

  const getAverageRoomCost = (facility: ResidentialFacility) => {
    if (!facility.rooms_data || facility.rooms_data.length === 0) return undefined;
    const totalCost = facility.rooms_data.reduce((sum, room) => sum + room.cost_per_day, 0);
    return totalCost / facility.rooms_data.length;
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

  // Calculate best values for comparison
  const overallRatings = facilities.map(f => f.overall_rating_stars);
  const complianceRatings = facilities.map(f => f["star_Compliance rating"]);
  const qualityRatings = facilities.map(f => f["star_Quality Measures rating"]);
  const experienceRatings = facilities.map(f => f["star_Residents' Experience rating"]);
  const staffingRatings = facilities.map(f => f["star_Staffing rating"]);
  const roomCosts = facilities.map(f => getAverageRoomCost(f));
  const budgetSurplus = facilities.map(f => f.budget_surplus_per_day);

  const bestOverall = getBestValue(overallRatings);
  const bestCompliance = getBestValue(complianceRatings);
  const bestQuality = getBestValue(qualityRatings);
  const bestExperience = getBestValue(experienceRatings);
  const bestStaffing = getBestValue(staffingRatings);
  const bestRoomCost = getBestValue(roomCosts, false); // Lower is better for cost
  const bestBudget = getBestValue(budgetSurplus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" />
              Facility Comparison
            </h2>
            <p className="text-gray-600 mt-1">Comparing {facilities.length} residential facilities</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 font-semibold">
                    Metric
                  </th>
                  {facilities.map((facility, index) => (
                    <th key={index} className="text-left p-4 border-b-2 border-gray-200 bg-gray-50 min-w-[200px]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">{facility["Service Name"]}</div>
                          {facility.formatted_address && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{facility.address_locality}, {facility.address_state}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveFacility(facility)}
                          className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 ml-2"
                          title="Remove from comparison"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Overall Rating</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className={getValueColor(facility.overall_rating_stars, bestOverall)}>
                        {renderStarRating(facility.overall_rating_stars)}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Compliance Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Compliance Rating</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className={getValueColor(facility["star_Compliance rating"], bestCompliance)}>
                        {renderStarRating(facility["star_Compliance rating"])}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Quality Measures Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Quality Measures</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className={getValueColor(facility["star_Quality Measures rating"], bestQuality)}>
                        {renderStarRating(facility["star_Quality Measures rating"])}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Experience Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Residents' Experience</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className={getValueColor(facility["star_Residents' Experience rating"], bestExperience)}>
                        {renderStarRating(facility["star_Residents' Experience rating"])}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Staffing Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Staffing</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className={getValueColor(facility["star_Staffing rating"], bestStaffing)}>
                        {renderStarRating(facility["star_Staffing rating"])}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Average Room Cost */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Avg. Room Cost/Day</td>
                  {facilities.map((facility, index) => {
                    const avgCost = getAverageRoomCost(facility);
                    return (
                      <td key={index} className="p-4">
                        <div className={getValueColor(avgCost, bestRoomCost, false)}>
                          {avgCost ? formatCurrency(avgCost) : 'N/A'}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Total Expenditure */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Total Expenditure/Day</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className="text-gray-900">
                        {formatCurrency(facility.expenditure_total_per_day)}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Budget Surplus */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Budget Surplus/Day</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className={getValueColor(facility.budget_surplus_per_day, bestBudget)}>
                        {formatCurrency(facility.budget_surplus_per_day)}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Residential Places */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Residential Places</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className="text-gray-900">
                        {facility.residential_places || 'N/A'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Room Types Available */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-900">Room Types</td>
                  {facilities.map((facility, index) => (
                    <td key={index} className="p-4">
                      <div className="text-gray-900">
                        {facility.rooms_data?.length || 0} types
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Color Legend</h3>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>Best Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span>Good Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>Needs Attention</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTable; 