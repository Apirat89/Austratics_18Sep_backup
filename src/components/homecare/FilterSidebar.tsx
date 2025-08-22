import React from 'react';
import { X, Filter, Home, Building, DollarSign, Shield, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HomecareFilters } from '@/types/homecare';

interface HomecareFilterSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  filters: HomecareFilters;
  onFiltersChange: (filters: HomecareFilters) => void;
  onClearFilters: () => void;
}

export default function HomecareFilterSidebar({
  isVisible,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters
}: HomecareFilterSidebarProps) {
  if (!isVisible) return null;

  const handleFilterChange = (key: keyof HomecareFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleArrayFilterChange = (key: keyof HomecareFilters, item: string, checked: boolean) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = checked 
      ? [...currentArray, item]
      : currentArray.filter(i => i !== item);
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const packageLevels = ['1', '2', '3', '4'];
  const organizationTypes = [
    'for-profit',
    'not-for-profit', 
    'government',
    'other'
  ];
  
  const serviceTypes = [
    'personal care',
    'nursing',
    'cleaning',
    'meal preparation',
    'transport',
    'physiotherapy',
    'occupational therapy',
    'social support',
    'respite care'
  ];

  const complianceStatuses = [
    'No current issues',
    'Minor issues',
    'Major issues',
    'Under review'
  ];

  const specializedCareTypes = [
    'Dementia care',
    'Disability support',
    'Mental health support',
    'Palliative care',
    'Complex care needs',
    'Cultural specific care',
    'LGBTI+ friendly',
    'Rural/remote services'
  ];

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && 
    (!Array.isArray(value) || value.length > 0) &&
    (typeof value !== 'object' || Object.keys(value).length > 0)
  ).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Filter Providers
            </h2>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-red-600 hover:text-red-800 hover:underline"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Package Levels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Home className="w-4 h-4 mr-2 text-blue-600" />
                Care Package Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                {packageLevels.map((level) => (
                  <label key={level} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(filters.packageLevels || []).includes(level)}
                      onChange={(e) => handleArrayFilterChange('packageLevels', level, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Level {level}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Organization Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Building className="w-4 h-4 mr-2 text-green-600" />
                Organization Type
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {organizationTypes.map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(filters.organizationTypes || []).includes(type)}
                      onChange={(e) => handleArrayFilterChange('organizationTypes', type, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {type.replace('-', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Services Offered */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Heart className="w-4 h-4 mr-2 text-red-600" />
                Services Offered
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {serviceTypes.map((service) => (
                  <label key={service} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(filters.serviceTypes || []).includes(service)}
                      onChange={(e) => handleArrayFilterChange('serviceTypes', service, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {service}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Shield className="w-4 h-4 mr-2 text-purple-600" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {complianceStatuses.map((status) => (
                  <label key={status} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(filters.complianceStatus || []).includes(status)}
                      onChange={(e) => handleArrayFilterChange('complianceStatus', status, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{status}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Specialized Care */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Heart className="w-4 h-4 mr-2 text-pink-600" />
                Specialized Care
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {specializedCareTypes.map((care) => (
                  <label key={care} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(filters.specializedCare || []).includes(care)}
                      onChange={(e) => handleArrayFilterChange('specializedCare', care, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{care}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-yellow-600" />
                Cost Range (Fortnightly)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Minimum Cost ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="e.g. 50"
                    value={filters.costRange?.min || ''}
                    onChange={(e) => handleFilterChange('costRange', {
                      ...filters.costRange,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Maximum Cost ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="e.g. 500"
                    value={filters.costRange?.max || ''}
                    onChange={(e) => handleFilterChange('costRange', {
                      ...filters.costRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cost Type
                  </label>
                  <select
                    value={filters.costRange?.type || ''}
                    onChange={(e) => handleFilterChange('costRange', {
                      ...filters.costRange,
                      type: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">All cost types</option>
                    <option value="care_management">Care Management</option>
                    <option value="package_management">Package Management</option>
                    <option value="personal_care">Personal Care</option>
                    <option value="nursing">Nursing</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 