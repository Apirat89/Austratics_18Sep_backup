'use client';

import React, { useState } from 'react';
import { 
  Save, 
  Clock, 
  Trash2, 
  Edit3, 
  BarChart3, 
  TrendingUp, 
  GitBranch, 
  Circle, 
  PieChart, 
  AreaChart,
  ChevronRight,
  ChevronDown 
} from 'lucide-react';
import { EnhancedChartConfiguration } from './InsightsDataService';

interface AnalysisSidebarProps {
  savedAnalyses: EnhancedChartConfiguration[];
  recentAnalyses: EnhancedChartConfiguration[];
  onLoadAnalysis: (config: EnhancedChartConfiguration) => void;
  onDeleteAnalysis: (id: string) => void;
  onRenameAnalysis: (id: string, newName: string) => void;
  sidebarCollapsed: boolean;
}

const chartIcons = {
  bar: BarChart3,
  line: TrendingUp,
  scatter: GitBranch,
  bubble: Circle,
  pie: PieChart,
  area: AreaChart
};

const dataTypeColors = {
  healthcare: 'text-purple-600',
  demographics: 'text-blue-600',
  economics: 'text-green-600',
  'health-statistics': 'text-red-600'
};

export default function AnalysisSidebar({
  savedAnalyses,
  recentAnalyses,
  onLoadAnalysis,
  onDeleteAnalysis,
  onRenameAnalysis,
  sidebarCollapsed
}: AnalysisSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<'saved' | 'recent' | null>('saved');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (analysis: EnhancedChartConfiguration) => {
    setEditingId(analysis.id);
    setEditingName(analysis.name);
  };

  const handleFinishRename = (id: string) => {
    if (editingName.trim()) {
      onRenameAnalysis(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const renderAnalysisItem = (analysis: ChartConfiguration, isRecent: boolean = false) => {
    const ChartIcon = chartIcons[analysis.chartType] || BarChart3;
    const isEditing = editingId === analysis.id;
    
    return (
      <div
        key={analysis.id}
        className="group p-2 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Chart Type Icon */}
          <div className={`flex-shrink-0 p-1 rounded ${dataTypeColors[analysis.dataType] || 'text-gray-600'}`}>
            <ChartIcon className="h-4 w-4" />
          </div>
          
          {/* Analysis Info */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleFinishRename(analysis.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename(analysis.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full text-sm font-medium bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onLoadAnalysis(analysis)}
                className="w-full text-left"
              >
                <div className="text-sm font-medium text-gray-900 truncate">
                  {analysis.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {analysis.chartType} • {analysis.dataType.replace('-', ' ')}
                </div>
                {isRecent && (
                  <div className="text-xs text-gray-400">
                    {formatDate(analysis.createdAt)}
                  </div>
                )}
              </button>
            )}
          </div>
          
          {/* Actions */}
          {!sidebarCollapsed && (
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={() => handleStartRename(analysis)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                    title="Rename"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => onDeleteAnalysis(analysis.id)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    analyses: ChartConfiguration[],
    sectionKey: 'saved' | 'recent',
    isRecent: boolean = false
  ) => {
    const isExpanded = expandedSection === sectionKey;
    
    return (
      <div className="mb-4">
        <button
          onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
          className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {icon}
          {!sidebarCollapsed && (
            <>
              <span className="text-sm font-medium text-gray-700 flex-1 text-left">
                {title} ({analyses.length})
              </span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </>
          )}
        </button>
        
        {isExpanded && !sidebarCollapsed && (
          <div className="mt-1 space-y-1">
            {analyses.length === 0 ? (
              <div className="px-4 py-2 text-xs text-gray-500 italic">
                No {isRecent ? 'recent' : 'saved'} analyses
              </div>
            ) : (
              analyses.map(analysis => renderAnalysisItem(analysis, isRecent))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Saved Analyses */}
      {renderSection(
        'Saved',
        <Save className="h-4 w-4 text-blue-600" />,
        savedAnalyses,
        'saved'
      )}
      
      {/* Recent Analyses */}
      {renderSection(
        'Recent',
        <Clock className="h-4 w-4 text-gray-600" />,
        recentAnalyses,
        'recent',
        true
      )}
    </div>
  );
} 