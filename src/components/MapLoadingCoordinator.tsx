'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Loading stages in sequential order
export type LoadingStage = 
  | 'map-init'           // 1. Map initialization and style loading
  | 'base-data'          // 2. DSS healthcare + demographics data
  | 'boundary-data'      // 3. SA2 boundary GeoJSON (170MB)
  | 'name-mapping'       // 4. SA2 ID→Name mapping extraction
  | 'data-processing'    // 5. Process and cache data combinations
  | 'heatmap-rendering'  // 6. Apply default selection and render
  | 'complete';          // 7. All loading complete

export interface LoadingState {
  stage: LoadingStage;
  progress: number; // 0-100 percentage within current stage
  message: string;
  error?: string;
}

interface MapLoadingCoordinatorProps {
  onLoadingComplete: () => void;
  children?: React.ReactNode;
}

export default function MapLoadingCoordinator({
  onLoadingComplete,
  children
}: MapLoadingCoordinatorProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'map-init',
    progress: 0,
    message: 'Initializing map...'
  });

  const loadingStarted = useRef(false);
  const stageStartTimes = useRef<{ [key in LoadingStage]?: number }>({});

  // Stage messages for user feedback
  const getStageMessage = (stage: LoadingStage, progress: number): string => {
    return 'Loading...';
  };

  // Update loading state with progress tracking
  const updateLoadingState = useCallback((
    stage: LoadingStage, 
    progress: number = 0, 
    error?: string
  ) => {
    // Track stage timing for performance monitoring
    if (!stageStartTimes.current[stage]) {
      stageStartTimes.current[stage] = Date.now();
      if (stageStartTimes.current['map-init']) {
        const previousStages = Object.keys(stageStartTimes.current).length - 1;
        if (previousStages > 0) {
          console.log(`⏱️ MapLoadingCoordinator: Stage ${stage} started after ${previousStages} stages`);
        }
      }
    }

    const message = error ? `Error: ${error}` : getStageMessage(stage, progress);
    
    setLoadingState({
      stage,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      error
    });

    console.log(`🔄 MapLoadingCoordinator: ${stage} - ${progress}% - ${message}`);
  }, []);

  // Sequential loading orchestrator
  const startSequentialLoading = useCallback(async () => {
    if (loadingStarted.current) return;
    
    loadingStarted.current = true;
    console.log('🚀 MapLoadingCoordinator: Starting sequential loading process...');

    try {
      // Stage 1: Map Initialization (wait for map to be ready)
      updateLoadingState('map-init', 10);
      console.log('⏳ Stage 1: Waiting for map initialization...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms
      updateLoadingState('map-init', 100);

      // Stage 2: Base Data Loading
      updateLoadingState('base-data', 0);
      console.log('📊 Stage 2: Loading base data (healthcare + demographics)...');
      
      // Simulate base data loading with progress
      for (let i = 0; i <= 100; i += 50) {
        updateLoadingState('base-data', i);
        await new Promise(resolve => setTimeout(resolve, 150)); // Reduced timing
      }
      console.log('✅ Stage 2: Base data loaded');

      // Stage 3: Boundary Data Loading
      updateLoadingState('boundary-data', 0);
      console.log('🗺️ Stage 3: Loading SA2 boundary data (170MB)...');
      
      // Simulate boundary data loading with progress
      for (let i = 0; i <= 100; i += 25) {
        updateLoadingState('boundary-data', i);
        await new Promise(resolve => setTimeout(resolve, 200)); // Reduced timing
      }
      console.log('✅ Stage 3: Boundary data loaded');

      // Stage 4: Name Mapping
      updateLoadingState('name-mapping', 0);
      console.log('🏷️ Stage 4: Extracting SA2 name mappings...');
      
      // Simulate name mapping with progress
      for (let i = 0; i <= 100; i += 50) {
        updateLoadingState('name-mapping', i);
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced timing
      }
      console.log('✅ Stage 4: Name mappings extracted');

      // Stage 5: Data Processing
      updateLoadingState('data-processing', 0);
      console.log('⚙️ Stage 5: Processing data combinations...');
      
      // Simulate data processing with progress
      for (let i = 0; i <= 100; i += 50) {
        updateLoadingState('data-processing', i);
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced timing
      }
      console.log('✅ Stage 5: Data processing complete');

      // Stage 6: Heatmap Rendering (LAST)
      updateLoadingState('heatmap-rendering', 0);
      console.log('🌡️ Stage 6: Rendering heatmap visualization...');
      
      // Simulate heatmap rendering with progress
      for (let i = 0; i <= 100; i += 50) {
        updateLoadingState('heatmap-rendering', i);
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced timing
      }
      console.log('✅ Stage 6: Heatmap rendering complete');

      // Complete!
      updateLoadingState('complete', 100);
      
      // Calculate total loading time
      const totalTime = Date.now() - (stageStartTimes.current['map-init'] || Date.now());
      console.log(`🎉 MapLoadingCoordinator: Sequential loading complete in ${(totalTime / 1000).toFixed(1)}s`);
      
      // Hide loading overlay after a brief delay
      setTimeout(() => {
        onLoadingComplete();
      }, 200); // Reduced from 500ms

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ MapLoadingCoordinator: Loading failed:', errorMessage);
      updateLoadingState(loadingState.stage, loadingState.progress, errorMessage);
    }
  }, [updateLoadingState, onLoadingComplete, loadingState.stage, loadingState.progress]);

  // Start loading when component mounts
  useEffect(() => {
    startSequentialLoading();
  }, [startSequentialLoading]);

  // Loading overlay component
  const LoadingOverlay = () => {
    if (loadingState.stage === 'complete') return null;

    const getStageNumber = (stage: LoadingStage): number => {
      const stages: LoadingStage[] = ['map-init', 'base-data', 'boundary-data', 'name-mapping', 'data-processing', 'heatmap-rendering'];
      return stages.indexOf(stage) + 1;
    };

    return (
      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8 max-w-md w-full mx-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Analytics Platform</h2>
          </div>

          {/* Stage Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Stage {getStageNumber(loadingState.stage)} of 6
              </span>
              <span className="text-sm text-gray-500">{loadingState.progress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingState.progress}%` }}
              ></div>
            </div>
            
            {/* Current Message */}
            <p className="text-sm text-gray-600 mt-2">Loading...</p>
          </div>

          {/* Error Display */}
          {loadingState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-900 mb-1">Loading Error</h4>
              <p className="text-sm text-red-700">{loadingState.error}</p>
              <button
                onClick={() => {
                  loadingStarted.current = false;
                  startSequentialLoading();
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Retry Loading
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <LoadingOverlay />
      {children}
    </>
  );
} 