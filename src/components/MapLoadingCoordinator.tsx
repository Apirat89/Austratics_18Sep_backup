'use client';

import React, { useState, useEffect, useRef } from 'react';

// Loading stages in sequential order
export type LoadingStage = 
  | 'map-init'           // 1. Map initialization and style loading
  | 'healthcare-data'    // 2. Healthcare data (DSS_Cleaned_2024.json)
  | 'demographics-data'  // 3. Demographics data
  | 'economics-data'     // 4. Economics data
  | 'health-stats-data'  // 5. Health statistics data
  | 'boundary-data'      // 6. SA2 boundary GeoJSON (170MB)
  | 'name-mapping'       // 7. SA2 ID→Name mapping extraction
  | 'data-processing'    // 8. Process and cache data combinations
  | 'heatmap-rendering'  // 9. Apply default selection and render
  | 'map-rendering'      // 10. Wait for map to be fully rendered
  | 'complete';          // 11. All loading complete

export interface LoadingState {
  stage: LoadingStage;
  progress: number; // 0-100 percentage within current stage
  message: string;
  error?: string;
}

// Global loading coordinator that listens to real loading events
class RealLoadingCoordinator {
  protected listeners: ((state: LoadingState) => void)[] = [];
  protected currentState: LoadingState = { stage: 'map-init', progress: 0, message: 'Waiting for map initialization...' };
  private stageCompletions: { [key in LoadingStage]?: boolean } = {};
  private boundaryLoadingStarted = false;
  protected initialLoadingComplete = false; // Track if initial loading sequence is complete
  
  subscribe(listener: (state: LoadingState) => void) {
    this.listeners.push(listener);
    // Immediately send current state to new listeners
    listener(this.currentState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Simple method to directly set stage and progress without complex logic
  setStageDirectly(stage: LoadingStage, progress: number, message: string) {
    this.currentState = { stage, progress, message };
    console.log(`🔄 RealLoadingCoordinator: ${stage} - ${progress}% - ${message}`);
    this.listeners.forEach(listener => listener(this.currentState));
    
    // Mark stage as complete when progress reaches 100%
    if (progress >= 100) {
      this.stageCompletions[stage] = true;
    }
  }
  
  private updateState(stage: LoadingStage, progress: number, message: string, error?: string) {
    this.currentState = { stage, progress, message, error };
    console.log(`🔄 RealLoadingCoordinator: ${stage} - ${progress}% - ${message}`);
    this.listeners.forEach(listener => listener(this.currentState));
    
    // Mark stage as complete when progress reaches 100%
    if (progress >= 100) {
      this.stageCompletions[stage] = true;
      // Don't auto-advance during sequential loading - let the setTimeout sequence handle it
      // this.checkForNextStage();
    }
  }
  
  private checkForNextStage() {
    const stages: LoadingStage[] = [
      'map-init', 'healthcare-data', 'demographics-data', 'economics-data', 
      'health-stats-data', 'boundary-data', 'name-mapping', 'data-processing', 
      'heatmap-rendering', 'map-rendering'
    ];
    
    // Find the next incomplete stage
    for (const stage of stages) {
      if (!this.stageCompletions[stage]) {
        // Don't auto-advance to boundary-data until we've seen it start loading
        if (stage === 'boundary-data' && !this.boundaryLoadingStarted) {
          return; // Wait for boundary loading to actually start
        }
        
        // If this stage is different from current stage, advance to it
        if (this.currentState.stage !== stage) {
          const messages: Record<LoadingStage, string> = {
            'map-init': 'Initializing map...',
            'healthcare-data': 'Loading healthcare data...',
            'demographics-data': 'Loading demographics data...',
            'economics-data': 'Loading economics data...',
            'health-stats-data': 'Loading health statistics data...',
            'boundary-data': 'Loading SA2 boundaries (170MB)...',
            'name-mapping': 'Extracting SA2 name mappings...',
            'data-processing': 'Processing data combinations...',
            'heatmap-rendering': 'Rendering heatmap visualization...',
            'map-rendering': 'Waiting for map to fully render...',
            'complete': 'All systems ready!'
          };
          
          this.currentState = {
            stage,
            progress: 0,
            message: messages[stage]
          };
          this.listeners.forEach(listener => listener(this.currentState));
        }
        return; // Wait for this stage to complete
      }
    }
    
    // All stages complete!
    this.initialLoadingComplete = true; // Mark initial loading as complete
    this.currentState = {
      stage: 'complete',
      progress: 100,
      message: 'All systems ready!'
    };
    this.listeners.forEach(listener => listener(this.currentState));
  }
  
  // Called by components to report their loading status
  reportMapInit() {
    this.updateState('map-init', 100, 'Map initialized');
  }
  
  reportDataLoading(dataType: 'healthcare' | 'demographics' | 'economics' | 'health-stats', progress: number) {
    const stageMap = {
      'healthcare': 'healthcare-data' as LoadingStage,
      'demographics': 'demographics-data' as LoadingStage, 
      'economics': 'economics-data' as LoadingStage,
      'health-stats': 'health-stats-data' as LoadingStage
    };
    
    const stage = stageMap[dataType];
    const messages = {
      'healthcare': 'Loading healthcare data...',
      'demographics': 'Loading demographics data...',
      'economics': 'Loading economics data...',
      'health-stats': 'Loading health statistics data...'
    };
    
    this.updateState(stage, progress, messages[dataType]);
  }
  
  reportBoundaryLoading(progress: number) {
    this.boundaryLoadingStarted = true;
    this.updateState('boundary-data', progress, 'Loading SA2 boundaries (170MB)...');
  }
  
  reportNameMapping(progress: number) {
    this.updateState('name-mapping', progress, 'Extracting SA2 name mappings...');
  }
  
  reportDataProcessing(progress: number) {
    this.updateState('data-processing', progress, 'Processing data combinations...');
  }
  
  reportHeatmapRendering(progress: number) {
    // Only report heatmap rendering during initial loading sequence
    if (!this.initialLoadingComplete) {
      this.updateState('heatmap-rendering', progress, 'Rendering heatmap visualization...');
    }
  }
  
  reportMapRendering(progress: number) {
    // Only report map rendering during initial loading sequence
    if (!this.initialLoadingComplete) {
      this.updateState('map-rendering', progress, 'Waiting for map to fully render...');
    }
  }
  
  // Check if initial loading is complete (for components to use)
  isInitialLoadingComplete(): boolean {
    console.log('🔍 MapLoadingCoordinator.isInitialLoadingComplete():', this.initialLoadingComplete, 'stage:', this.currentState.stage);
    return this.initialLoadingComplete && this.currentState.stage === 'complete';
  }
  
  // Check if currently in the initial loading sequence (vs post-load operations)
  isCurrentlyLoading(): boolean {
    return !this.initialLoadingComplete || this.currentState.stage !== 'complete';
  }
  
  // Get current loading state (for debugging)
  getCurrentState(): LoadingState {
    return this.currentState;
  }
  
  // Manually trigger completion (used by sequential loading)
  triggerCompletion() {
    console.log('🎉 Manually triggering loading completion');
    this.initialLoadingComplete = true;
    this.currentState = {
      stage: 'complete',
      progress: 100,
      message: 'All systems ready!'
    };
    this.listeners.forEach(listener => listener(this.currentState));
  }
}

// Global instance
const globalLoadingCoordinator = new RealLoadingCoordinator();

// Export for other components to use
export { globalLoadingCoordinator };

interface MapLoadingCoordinatorProps {
  onLoadingComplete: () => void;
  children: React.ReactNode;
  mapRef?: React.RefObject<any>; // Add map ref to monitor render state
}

export default function MapLoadingCoordinator({
  onLoadingComplete,
  children,
  mapRef
}: MapLoadingCoordinatorProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'map-init',
    progress: 0,
    message: 'Waiting for map initialization...'
  });

  const hasCompleted = useRef(false);
  const hasEverRun = useRef(false); // Prevent multiple loading sequences
  const [isComplete, setIsComplete] = useState(false); // Local completion state

  // Subscribe to real loading events
  useEffect(() => {
    // Skip subscription if we're already complete
    if (isComplete) {
      console.log('🎉 MapLoadingCoordinator: Already complete, skipping subscription');
      return;
    }

    const unsubscribe = globalLoadingCoordinator.subscribe((state) => {
      console.log('🔔 MapLoadingCoordinator received state update:', state.stage, state.progress + '%');
      setLoadingState(state);
      
      // Trigger completion when we reach the complete stage (only once)
      if (state.stage === 'complete' && !hasCompleted.current && !isComplete) {
        hasCompleted.current = true;
        setIsComplete(true); // Set local completion state
        console.log('🎉 MapLoadingCoordinator: All loading complete, showing map');
        
        // Brief delay to show completion state before hiding overlay
        setTimeout(() => {
          onLoadingComplete();
        }, 150);
      }
    });

    return unsubscribe;
  }, [onLoadingComplete, isComplete]);

  // Trigger map initialization after mount (only once)
  useEffect(() => {
    // Skip if we're already complete
    if (isComplete) {
      console.log('🎉 MapLoadingCoordinator: Already complete, skipping initialization');
      return;
    }

    // Only run loading sequence once per component mount (not session)
    if (!hasEverRun.current) {
      hasEverRun.current = true;
      console.log('🎬 MapLoadingCoordinator: Starting fresh loading sequence');
      
      // Sequential loading simulation - 20 seconds total, no flickering
      const runLoadingSequence = async () => {
        console.log('🎬 Starting clean 20-second sequential loading sequence...');
        
        const stages = [
          { stage: 'map-init' as LoadingStage, message: 'Initializing map...', duration: 1000 },
          { stage: 'healthcare-data' as LoadingStage, message: 'Loading healthcare data...', duration: 2000 },
          { stage: 'demographics-data' as LoadingStage, message: 'Loading demographics data...', duration: 2000 },
          { stage: 'economics-data' as LoadingStage, message: 'Loading economics data...', duration: 2000 },
          { stage: 'health-stats-data' as LoadingStage, message: 'Loading health statistics data...', duration: 2000 },
          { stage: 'boundary-data' as LoadingStage, message: 'Loading SA2 boundaries (170MB)...', duration: 6000 },
          { stage: 'name-mapping' as LoadingStage, message: 'Extracting SA2 name mappings...', duration: 1000 },
          { stage: 'data-processing' as LoadingStage, message: 'Processing data combinations...', duration: 1000 },
          { stage: 'heatmap-rendering' as LoadingStage, message: 'Rendering heatmap visualization...', duration: 2000 },
          { stage: 'map-rendering' as LoadingStage, message: 'Waiting for map to fully render...', duration: 1000 }
        ];
        
        let currentTime = 0;
        
        stages.forEach((stageInfo, index) => {
          // Start each stage
          setTimeout(() => {
            globalLoadingCoordinator.setStageDirectly(stageInfo.stage, 0, stageInfo.message);
          }, currentTime);
          
          // Progress updates within each stage
          const progressSteps = [25, 50, 75, 100];
          progressSteps.forEach((progress, progIndex) => {
            setTimeout(() => {
              globalLoadingCoordinator.setStageDirectly(stageInfo.stage, progress, stageInfo.message);
            }, currentTime + (stageInfo.duration / 4) * (progIndex + 1));
          });
          
          currentTime += stageInfo.duration;
        });
        
        // Final completion at exactly 20 seconds
        setTimeout(() => {
          console.log('🎉 20-second sequence complete - manually triggering completion');
          globalLoadingCoordinator.triggerCompletion();
        }, 20000);
      };
      
      runLoadingSequence();
    } else {
      console.log('⏭️ MapLoadingCoordinator: Loading sequence already started, checking global state...');
      // Check if loading is already complete globally
      if (globalLoadingCoordinator.isInitialLoadingComplete()) {
        console.log('🎉 Global loading already complete, setting local completion');
        hasCompleted.current = true;
        setIsComplete(true); // Set local completion state
        // Don't call onLoadingComplete again if already called
      } else {
        console.log('🔄 Global loading still in progress, waiting for completion');
        hasCompleted.current = false;
      }
    }
  }, [onLoadingComplete, isComplete]);

  // Loading overlay component
  const LoadingOverlay = () => {
    // Use local completion state instead of global loading state
    if (isComplete) return null;

    const getStageNumber = (stage: LoadingStage): number => {
      const stages: LoadingStage[] = [
        'map-init', 'healthcare-data', 'demographics-data', 'economics-data', 
        'health-stats-data', 'boundary-data', 'name-mapping', 'data-processing', 
        'heatmap-rendering', 'map-rendering'
      ];
      return stages.indexOf(stage) + 1;
    };

    const totalStages = 10;

    return (
      <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8 max-w-md w-full mx-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Analytics Platform</h2>
            <p className="text-sm text-gray-600">Preparing all data layers...</p>
          </div>

          {/* Stage Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Stage {getStageNumber(loadingState.stage)} of {totalStages}
              </span>
              <span className="text-sm text-gray-500">{loadingState.progress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
            
            {/* Current Stage Message */}
            <div className="text-center">
              <p className="text-sm text-gray-600">{loadingState.message}</p>
              {loadingState.error && (
                <p className="text-sm text-red-600 mt-2">Error: {loadingState.error}</p>
              )}
            </div>
          </div>

          {/* Stage Checklist */}
          <div className="space-y-2 text-xs">
            {[
              { stage: 'map-init', label: 'Map initialization' },
              { stage: 'healthcare-data', label: 'Healthcare data' },
              { stage: 'demographics-data', label: 'Demographics data' },
              { stage: 'economics-data', label: 'Economics data' },
              { stage: 'health-stats-data', label: 'Health statistics data' },
              { stage: 'boundary-data', label: 'Boundary data (170MB)' },
              { stage: 'name-mapping', label: 'Name mappings' },
              { stage: 'data-processing', label: 'Data processing' },
              { stage: 'heatmap-rendering', label: 'Heatmap rendering' },
              { stage: 'map-rendering', label: 'Map rendering' }
            ].map(({ stage, label }) => {
              const isComplete = loadingState.stage === 'complete' || 
                               (['map-init', 'healthcare-data', 'demographics-data', 'economics-data', 
                                 'health-stats-data', 'boundary-data', 'name-mapping', 'data-processing', 
                                 'heatmap-rendering', 'map-rendering'].indexOf(stage as LoadingStage) < 
                                ['map-init', 'healthcare-data', 'demographics-data', 'economics-data', 
                                 'health-stats-data', 'boundary-data', 'name-mapping', 'data-processing', 
                                 'heatmap-rendering', 'map-rendering'].indexOf(loadingState.stage));
              const isCurrent = loadingState.stage === stage;
              
              return (
                <div key={stage} className={`flex items-center gap-2 ${isCurrent ? 'text-blue-600 font-medium' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isComplete ? 'bg-green-500' : 
                    isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                  }`} />
                  <span className={isComplete ? 'text-green-700' : isCurrent ? 'text-blue-600' : 'text-gray-500'}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      <LoadingOverlay />
      {/* Only render the map after loading is complete - using local completion state */}
      {isComplete && children}
    </div>
  );
} 