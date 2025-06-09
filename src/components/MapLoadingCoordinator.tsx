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
  private listeners: ((state: LoadingState) => void)[] = [];
  private currentState: LoadingState = { stage: 'map-init', progress: 0, message: 'Waiting for map initialization...' };
  private stageCompletions: { [key in LoadingStage]?: boolean } = {};
  private boundaryLoadingStarted = false;
  private initialLoadingComplete = false; // Track if initial loading sequence is complete
  private hasEverCompleted = false; // Track if initial load has ever completed (persistent)
  private currentSessionId = Math.random().toString(36).substring(7); // Unique session ID
  
  subscribe(listener: (state: LoadingState) => void) {
    this.listeners.push(listener);
    // Immediately send current state to new listeners
    listener(this.currentState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private updateState(stage: LoadingStage, progress: number, message: string, error?: string) {
    this.currentState = { stage, progress, message, error };
    console.log(`🔄 RealLoadingCoordinator: ${stage} - ${progress}% - ${message}`);
    this.listeners.forEach(listener => listener(this.currentState));
    
    // Mark stage as complete when progress reaches 100%
    if (progress >= 100) {
      this.stageCompletions[stage] = true;
      this.checkForNextStage();
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
    this.hasEverCompleted = true; // Mark as ever completed (persistent)
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
    console.log('🔍 MapLoadingCoordinator.isInitialLoadingComplete():', this.hasEverCompleted);
    return this.hasEverCompleted; // Return persistent completion status
  }
  
  // Check if currently in the initial loading sequence (vs post-load operations)
  isCurrentlyLoading(): boolean {
    return !this.hasEverCompleted;
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

  // Subscribe to real loading events
  useEffect(() => {
    const unsubscribe = globalLoadingCoordinator.subscribe((state) => {
      setLoadingState(state);
      
      // Trigger completion when we reach the complete stage
      if (state.stage === 'complete' && !hasCompleted.current) {
        hasCompleted.current = true;
        console.log('🎉 MapLoadingCoordinator: All loading complete, showing map');
        
        // Brief delay to show completion state before hiding overlay
        setTimeout(() => {
          onLoadingComplete();
        }, 150); // Reduced from 300ms to 150ms for smoother transition
      }
    });

    return unsubscribe;
  }, [onLoadingComplete]);

  // Trigger map initialization after mount (only once)
  useEffect(() => {
    // Only run loading sequence once per component mount (not session)
    if (!hasEverRun.current) {
      hasEverRun.current = true;
      console.log('🎬 MapLoadingCoordinator: Starting fresh loading sequence');
      
      // Sequential loading simulation with guaranteed progression
      const runLoadingSequence = async () => {
        // Stage 1: Map initialization - start immediately
        setTimeout(() => globalLoadingCoordinator.reportMapInit(), 100); // Much faster start
        
        // Stage 2-5: Data loading (let real systems handle these if they exist)
        setTimeout(() => {
          globalLoadingCoordinator.reportDataLoading('healthcare', 100);
        }, 300); // Much faster
        
        setTimeout(() => {
          globalLoadingCoordinator.reportDataLoading('demographics', 100);
        }, 500);
        
        setTimeout(() => {
          globalLoadingCoordinator.reportDataLoading('economics', 100);
        }, 700);
        
        setTimeout(() => {
          globalLoadingCoordinator.reportDataLoading('health-stats', 100);
        }, 900);
        
        // Stage 6: Boundary loading
        setTimeout(() => {
          globalLoadingCoordinator.reportBoundaryLoading(10);
          setTimeout(() => globalLoadingCoordinator.reportBoundaryLoading(60), 200);
          setTimeout(() => globalLoadingCoordinator.reportBoundaryLoading(100), 600);
        }, 1100);
        
        // Stage 7: Name mapping
        setTimeout(() => {
          globalLoadingCoordinator.reportNameMapping(10);
          setTimeout(() => globalLoadingCoordinator.reportNameMapping(60), 200);
          setTimeout(() => globalLoadingCoordinator.reportNameMapping(100), 400);
        }, 1900);
        
        // Stage 8: Data processing
        setTimeout(() => {
          globalLoadingCoordinator.reportDataProcessing(10);
          setTimeout(() => globalLoadingCoordinator.reportDataProcessing(60), 100);
          setTimeout(() => globalLoadingCoordinator.reportDataProcessing(100), 200);
        }, 2500);
        
        // Stage 9: Heatmap rendering
        setTimeout(() => {
          globalLoadingCoordinator.reportHeatmapRendering(10);
          setTimeout(() => globalLoadingCoordinator.reportHeatmapRendering(60), 100);
          setTimeout(() => globalLoadingCoordinator.reportHeatmapRendering(100), 200);
        }, 2900);
        
        // Stage 10: Map rendering - automatically advance after heatmap is done
        // This stage will wait for actual map render events but give it a chance to start
        setTimeout(() => {
          console.log('🗺️ MapLoadingCoordinator: Ready for map rendering stage');
          // The map component should have called reportMapRendering by now
          // If not, we'll wait for the stall check to handle it
        }, 3500);
      };
      
      runLoadingSequence();
    } else {
      console.log('⏭️ MapLoadingCoordinator: Loading sequence already running in this component');
      // Reset completion flag for this component instance
      hasCompleted.current = false;
    }
  }, [onLoadingComplete]);

  // Auto-advance stalled stages (fallback mechanism)
  useEffect(() => {
    const stallCheckTimer = setTimeout(() => {
      // If we're stuck at a stage for too long, force advance
      if (loadingState.progress === 100 && loadingState.stage !== 'complete') {
        console.log('🔄 Loading appears stalled, forcing advancement...');
        
        // Trigger the next logical stage
        const stages = [
          'map-init', 'healthcare-data', 'demographics-data', 'economics-data', 
          'health-stats-data', 'boundary-data', 'name-mapping', 'data-processing', 
          'heatmap-rendering', 'map-rendering'
        ];
        
        const currentIndex = stages.indexOf(loadingState.stage as any);
        if (currentIndex >= 0 && currentIndex < stages.length - 1) {
          const nextStage = stages[currentIndex + 1];
          
          // Force trigger the next stage
          switch (nextStage) {
            case 'data-processing':
              globalLoadingCoordinator.reportDataProcessing(100);
              break;
            case 'heatmap-rendering':
              globalLoadingCoordinator.reportHeatmapRendering(100);
              break;
            case 'map-rendering':
              globalLoadingCoordinator.reportMapRendering(100);
              break;
          }
        } else {
          // Force completion - ensure we complete the map rendering stage
          globalLoadingCoordinator.reportMapRendering(100);
        }
      }
    }, 5000); // Check after 5 seconds of being stuck (was 2 seconds)

    return () => clearTimeout(stallCheckTimer);
  }, [loadingState.stage, loadingState.progress]);

  // Loading overlay component
  const LoadingOverlay = () => {
    if (loadingState.stage === 'complete') return null;

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
      <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
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
      {children}
    </div>
  );
} 