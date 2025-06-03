'use client';

import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, TrendingUp, Users, Heart } from 'lucide-react';

interface DataLayersProps {
  className?: string;
}

export default function DataLayers({
  className = ""
}: DataLayersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dataCategories = [
    {
      key: 'economics',
      label: 'Economics',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      key: 'demographics',
      label: 'Demographics', 
      icon: Users,
      color: 'text-blue-600'
    },
    {
      key: 'health',
      label: 'Health',
      icon: Heart,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 transition-colors text-left rounded-t-lg"
      >
        <Database className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Data Layers</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Coming soon
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-100">
          <div className="space-y-2">
            {dataCategories.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-3 p-2 rounded bg-gray-50 opacity-60">
                <div className="w-3 h-3 border border-gray-300 rounded"></div>
                <Icon className={`h-3 w-3 ${color}`} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                Additional data layers will be available here in future updates
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 