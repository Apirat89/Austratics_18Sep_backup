'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import PromptArea from '../../components/PromptArea';
import InsightsCanvas from '../../components/insights/InsightsCanvas';
import AnalysisSidebar from '../../components/insights/AnalysisSidebar';
import { EnhancedChartConfiguration } from '../../components/insights/InsightsDataService';
import { BarChart3, Settings, User, AlertTriangle, CheckCircle } from 'lucide-react';

interface UserData {
  email: string;
  name: string;
  id: string;
}

interface DataLoadingStatus {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  loadingStep: string;
  isUsingFallbackData: boolean;
  mediansCalculated: boolean;
}

export default function InsightsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<EnhancedChartConfiguration[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<EnhancedChartConfiguration[]>([]);
  const [dataLoadingStatus, setDataLoadingStatus] = useState<DataLoadingStatus>({
    isLoading: true,
    hasError: false,
    errorMessage: '',
    loadingStep: 'Initializing unified SA2 data loading...',
    isUsingFallbackData: false,
    mediansCalculated: false
  });
  
  const router = useRouter();
  const dataLoadingRef = useRef(false);
  const dataLoadedRef = useRef(false);

  // Unified SA2 data loading function using the new merging utility
  const loadUnifiedSA2Data = useCallback(async () => {
    if (dataLoadingRef.current || dataLoadedRef.current) {
      console.log('📊 SA2 data loading already in progress or completed');
      return;
    }

    dataLoadingRef.current = true;
    
    try {
      setDataLoadingStatus(prev => ({
        ...prev,
        isLoading: true,
        loadingStep: 'Loading unified SA2 dataset...',
        hasError: false,
        errorMessage: ''
      }));

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SA2 data loading timeout after 30 seconds')), 30000);
      });

      setDataLoadingStatus(prev => ({ ...prev, loadingStep: 'Fetching merged SA2 data from API...' }));
      
      // Try to load data from our new unified API
      const loadDataPromise = fetch('/api/sa2')
        .then(response => {
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (!data.success) {
            throw new Error(data.error || 'API returned error');
          }
          return data.data; // The merged SA2 data
        });
      
      // Race between data loading and timeout
      const mergedSA2Data = await Promise.race([
        loadDataPromise,
        timeoutPromise
      ]);

      setDataLoadingStatus(prev => ({ ...prev, loadingStep: 'Processing unified data structure...' }));
      
      // Calculate medians for the unified dataset
      await calculateUnifiedDatasetMedians(mergedSA2Data);

      setDataLoadingStatus(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: 'Ready - Data loaded successfully',
        mediansCalculated: true
      }));

      dataLoadedRef.current = true;
      console.log('✅ Unified SA2 data loading completed successfully');
      console.log(`📊 Merged Dataset: ${Object.keys(mergedSA2Data).length} regions, 53 metrics`);
      console.log('📈 Medians calculated for all unified variables');
      
    } catch (error) {
      console.warn('⚠️ Unified SA2 data loading failed, using fallback sample data:', error);
      
      setDataLoadingStatus(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unified data loading failed',
        loadingStep: 'Generating sample data...',
        isUsingFallbackData: true
      }));

      // Generate fallback sample data
      await generateFallbackSampleData();
      
      setDataLoadingStatus(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: 'Ready (using sample data)',
        mediansCalculated: true
      }));

      dataLoadedRef.current = true;
    } finally {
      dataLoadingRef.current = false;
    }
  }, []);

  // Calculate medians for the unified dataset
  const calculateUnifiedDatasetMedians = async (mergedData: any) => {
    try {
      console.log('📊 Calculating medians for unified SA2 dataset...');
      
      // Extract all numeric metrics from the merged data
      const allMetrics = new Set<string>();
      const metricValues: Record<string, number[]> = {};
      
      Object.values(mergedData).forEach((sa2Data: any) => {
        Object.entries(sa2Data).forEach(([key, value]) => {
          if (key !== 'sa2Name' && typeof value === 'number') {
            allMetrics.add(key);
            if (!metricValues[key]) {
              metricValues[key] = [];
            }
            metricValues[key].push(value);
          }
        });
      });

      // Calculate medians for each metric
      const medianCalculations: Record<string, number> = {};
      
      Array.from(allMetrics).forEach(metric => {
        const values = metricValues[metric].sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        medianCalculations[metric] = values.length % 2 === 0 
          ? (values[mid - 1] + values[mid]) / 2 
          : values[mid];
      });

      // Store medians globally for component access
      (window as any).unifiedSA2Data = mergedData;
      (window as any).unifiedSA2Medians = medianCalculations;
      
      console.log(`✅ Unified dataset medians calculated: ${Object.keys(medianCalculations).length} metrics`);
      console.log('📊 Sample medians:', Object.keys(medianCalculations).slice(0, 5).reduce((obj, key) => {
        obj[key] = medianCalculations[key];
        return obj;
      }, {} as Record<string, number>));
      
    } catch (error) {
      console.warn('⚠️ Unified median calculation failed, using defaults:', error);
    }
  };

  // Generate realistic sample data as fallback
  const generateFallbackSampleData = async () => {
    console.log('🔧 Generating fallback sample data for unified SA2 structure...');
    
    // Generate 100 realistic SA2 sample records with unified structure
    const sampleSA2Data = Array.from({ length: 100 }, (_, i) => ({
      sa2Id: `10000${i.toString().padStart(2, '0')}`,
      sa2Name: `Sample Region ${i + 1}`,
      'Demographics | Population count': Math.floor(Math.random() * 10000),
      'Demographics | Median age': 25 + Math.random() * 40,
      'Demographics | Population 65+': Math.floor(Math.random() * 2000),
      'Economics | Median Income': 30000 + Math.floor(Math.random() * 50000),
      'Economics | Employment Rate': 0.6 + Math.random() * 0.3,
      'Health | Diabetes Rate': Math.random() * 20,
      'Health | Health Score': Math.floor(Math.random() * 100),
      'Aged Care | CHSP Participants': Math.floor(Math.random() * 500),
      'Aged Care | Home Care Packages': Math.floor(Math.random() * 200)
    }));

    // Convert to SA2 data structure
    const mergedData: Record<string, any> = {};
    sampleSA2Data.forEach(data => {
      const { sa2Id, sa2Name, ...metrics } = data;
      mergedData[sa2Id] = { sa2Name, ...metrics };
    });

    // Pre-calculate medians for sample data
    const medianCalculations = {
      'Demographics | Population count': 5000,
      'Demographics | Median age': 45,
      'Demographics | Population 65+': 1000,
      'Economics | Median Income': 55000,
      'Economics | Employment Rate': 0.75,
      'Health | Diabetes Rate': 10,
      'Health | Health Score': 50,
      'Aged Care | CHSP Participants': 250,
      'Aged Care | Home Care Packages': 100
    };

    (window as any).unifiedSA2Data = mergedData;
    (window as any).unifiedSA2Medians = medianCalculations;
    console.log('✅ Sample unified SA2 data generated with pre-calculated medians');
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        // 🚀 DEVELOPMENT MODE: Temporarily bypass auth for testing
        // TODO: Re-enable authentication for production
        if (!currentUser) {
          // router.push('/auth/signin');
          // return;
          
          // Set a mock user for development testing
          setUser({
            email: 'dev@test.com',
            name: 'Development User',
            id: 'dev-user-123'
          });
        } else {
          setUser({
            email: currentUser.email || '',
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            id: currentUser.id
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // router.push('/auth/signin');
        
        // Set a mock user for development testing
        setUser({
          email: 'dev@test.com',
          name: 'Development User',
          id: 'dev-user-123'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    // Load saved and recent analyses from localStorage
    loadAnalyses();
    // Start unified SA2 data loading
    loadUnifiedSA2Data();
  }, [loadUnifiedSA2Data]);

  const loadAnalyses = () => {
    try {
      const saved = localStorage.getItem('insights-saved-analyses');
      const recent = localStorage.getItem('insights-recent-analyses');
      
      if (saved) {
        setSavedAnalyses(JSON.parse(saved).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt)
        })));
      }
      
      if (recent) {
        setRecentAnalyses(JSON.parse(recent).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };

  const saveAnalyses = (saved: EnhancedChartConfiguration[], recent: EnhancedChartConfiguration[]) => {
    try {
      localStorage.setItem('insights-saved-analyses', JSON.stringify(saved));
      localStorage.setItem('insights-recent-analyses', JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving analyses:', error);
    }
  };

  const handleSaveAnalysis = (config: EnhancedChartConfiguration) => {
    const updatedSaved = [...savedAnalyses, config];
    setSavedAnalyses(updatedSaved);
    saveAnalyses(updatedSaved, recentAnalyses);
  };

  const handleLoadAnalysis = (config: EnhancedChartConfiguration) => {
    // Add to recent analyses if not already there
    const existingIndex = recentAnalyses.findIndex(a => a.id === config.id);
    let updatedRecent = [...recentAnalyses];
    
    if (existingIndex >= 0) {
      // Move to front
      updatedRecent.splice(existingIndex, 1);
    }
    
    updatedRecent.unshift({
      ...config,
      createdAt: new Date(),
      isSaved: false
    });
    
    // Keep only last 10 recent analyses
    updatedRecent = updatedRecent.slice(0, 10);
    
    setRecentAnalyses(updatedRecent);
    saveAnalyses(savedAnalyses, updatedRecent);
  };

  const handleDeleteAnalysis = (id: string) => {
    const updatedSaved = savedAnalyses.filter(a => a.id !== id);
    const updatedRecent = recentAnalyses.filter(a => a.id !== id);
    
    setSavedAnalyses(updatedSaved);
    setRecentAnalyses(updatedRecent);
    saveAnalyses(updatedSaved, updatedRecent);
  };

  const handleRenameAnalysis = (id: string, newName: string) => {
    const updateAnalysis = (analysis: EnhancedChartConfiguration) => 
      analysis.id === id ? { ...analysis, name: newName } : analysis;
    
    const updatedSaved = savedAnalyses.map(updateAnalysis);
    const updatedRecent = recentAnalyses.map(updateAnalysis);
    
    setSavedAnalyses(updatedSaved);
    setRecentAnalyses(updatedRecent);
    saveAnalyses(updatedSaved, updatedRecent);
  };

  const handlePromptSubmit = (message: string) => {
    console.log('Insights prompt submitted:', message);
    // TODO: Integrate with AI service to interpret analytics queries
    // This could suggest chart types or variable combinations based on the query
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Header with Back to Main Button */}
        <BackToMainButton 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          pageTitle="Insights"
        />

        {/* Sidebar Content */}
        {!sidebarCollapsed && (
          <div className="flex-1 px-4 pt-6 overflow-y-auto">
            <AnalysisSidebar
              savedAnalyses={savedAnalyses}
              recentAnalyses={recentAnalyses}
              onLoadAnalysis={handleLoadAnalysis}
              onDeleteAnalysis={handleDeleteAnalysis}
              onRenameAnalysis={handleRenameAnalysis}
              sidebarCollapsed={sidebarCollapsed}
            />
          </div>
        )}

        {/* Bottom Actions */}
        <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'space-y-2' : 'space-y-1'}`}>
          {sidebarCollapsed ? (
            <>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">Settings & help</span>
              </button>
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-900">Analytics & Insights</h1>
            <div className="ml-auto text-xs text-gray-500">
              Powered by Austrytics
            </div>
          </div>
        </div>

        {/* Data Loading Status Banner */}
        {dataLoadingStatus.isLoading && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">{dataLoadingStatus.loadingStep}</span>
            </div>
          </div>
        )}

        {/* Data Error/Fallback Warning */}
        {dataLoadingStatus.hasError && dataLoadingStatus.isUsingFallbackData && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  <strong>Using sample data:</strong> Unified SA2 data loading failed. Charts will display with realistic sample data for testing.
                </p>
                <p className="text-xs text-amber-700 mt-1">Error: {dataLoadingStatus.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Ready Status */}
        {!dataLoadingStatus.isLoading && !dataLoadingStatus.hasError && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Data loaded successfully
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area - Canvas */}
        <InsightsCanvas
          onSaveAnalysis={handleSaveAnalysis}
          savedAnalyses={savedAnalyses}
          onLoadAnalysis={handleLoadAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
          dataLoadingStatus={dataLoadingStatus}
        />

        {/* Prompt Area */}
        <PromptArea 
          onSubmit={handlePromptSubmit}
          placeholder="Ask me to create charts, analyze trends, or suggest visualizations..."
        />
      </div>
    </div>
  );
} 