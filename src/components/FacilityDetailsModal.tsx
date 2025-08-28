'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Phone, Mail, Globe, Home, Building, Building2, Users, Calendar, Award, ExternalLink } from 'lucide-react';

interface FacilityData {
  OBJECTID: number;
  Service_Name: string;
  Physical_Address: string;
  Physical_Suburb: string;
  Physical_State: string;
  Physical_Post_Code: number;
  Care_Type: string;
  Residential_Places: number | null;
  Home_Care_Places: number | null;
  Home_Care_Max_Places: number | null;
  Restorative_Care_Places: number | null;
  Provider_Name: string;
  Organisation_Type: string;
  ABS_Remoteness: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  Latitude: number;
  Longitude: number;
  F2019_Aged_Care_Planning_Region: string;
  F2016_SA2_Name: string;
  F2016_SA3_Name: string;
  F2016_LGA_Name: string;
  facilityType: 'residential' | 'multipurpose_others' | 'home' | 'retirement';
}

interface FacilityDetailsModalProps {
  facility: FacilityData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FacilityDetailsModal({ facility, isOpen, onClose }: FacilityDetailsModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !facility) return null;

  const getFacilityTypeColor = (type: string) => {
    switch (type) {
      case 'residential':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'multipurpose_others':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'home':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'retirement':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFacilityTypeIcon = (type: string) => {
    switch (type) {
      case 'residential':
        return <Building className="w-4 h-4" />;
      case 'multipurpose_others':
        return <Building2 className="w-4 h-4" />;
      case 'home':
        return <Home className="w-4 h-4" />;
      case 'retirement':
        return <Users className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  const formatAddress = () => {
    const parts = [
      facility.Physical_Address,
      facility.Physical_Suburb,
      facility.Physical_State,
      facility.Physical_Post_Code
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getTotalPlaces = () => {
    const residential = facility.Residential_Places || 0;
    const homeCare = facility.Home_Care_Max_Places || facility.Home_Care_Places || 0;
    const restorative = facility.Restorative_Care_Places || 0;
    return residential + homeCare + restorative;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className={`relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getFacilityTypeColor(facility.facilityType)}`}>
                {getFacilityTypeIcon(facility.facilityType)}
                <span className="text-xs font-medium uppercase tracking-wider">
                  {facility.Care_Type}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {facility.Service_Name}
            </h2>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{formatAddress()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            
            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {facility.Residential_Places && facility.Residential_Places > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Residential Care</span>
                  </div>
                  <div className="text-2xl font-bold text-red-700">{facility.Residential_Places}</div>
                  <div className="text-xs text-red-600">Available places</div>
                </div>
              )}
              
              {((facility.Home_Care_Places && facility.Home_Care_Places > 0) || 
                (facility.Home_Care_Max_Places && facility.Home_Care_Max_Places > 0)) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Home Care</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {facility.Home_Care_Max_Places || facility.Home_Care_Places}
                  </div>
                  <div className="text-xs text-green-600">
                    {facility.Home_Care_Max_Places ? 'Max places' : 'Current places'}
                  </div>
                </div>
              )}
              
              {facility.Restorative_Care_Places && facility.Restorative_Care_Places > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Restorative Care</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">{facility.Restorative_Care_Places}</div>
                  <div className="text-xs text-blue-600">Available places</div>
                </div>
              )}
            </div>

            {/* Provider Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Provider Name</label>
                  <p className="text-gray-900 font-medium">{facility.Provider_Name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Organisation Type</label>
                  <p className="text-gray-900">{facility.Organisation_Type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Planning Region</label>
                  <p className="text-gray-900">{facility.F2019_Aged_Care_Planning_Region}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Remoteness Area</label>
                  <p className="text-gray-900">{facility.ABS_Remoteness}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-900">{formatAddress()}</p>
                  </div>
                </div>
                
                {facility.Phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a 
                      href={`tel:${facility.Phone}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {facility.Phone}
                    </a>
                  </div>
                )}
                
                {facility.Email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a 
                      href={`mailto:${facility.Email}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {facility.Email}
                    </a>
                  </div>
                )}
                
                {facility.Website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <a 
                      href={facility.Website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Statistical Area 2 (SA2)</label>
                  <p className="text-gray-900">{facility.F2016_SA2_Name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Statistical Area 3 (SA3)</label>
                  <p className="text-gray-900">{facility.F2016_SA3_Name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Local Government Area</label>
                  <p className="text-gray-900">{facility.F2016_LGA_Name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Coordinates</label>
                  <p className="text-gray-900 font-mono text-sm">
                    {facility.Latitude.toFixed(6)}, {facility.Longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Facility ID: {facility.OBJECTID}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 