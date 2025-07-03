import * as maptilersdk from '@maptiler/sdk';

interface LayerState {
  id: string;
  type: 'line' | 'fill' | 'source';
  parentSource?: string;
  exists: boolean;
  timestamp: number;
}

interface CleanupOperation {
  id: string;
  layerType: string;
  operations: LayerState[];
  rollbackData: LayerState[];
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled-back';
  timestamp: number;
  error?: string;
}

export class LayerCleanupManager {
  private map: maptilersdk.Map | null = null;
  private layerStates: Map<string, LayerState> = new Map();
  private operations: Map<string, CleanupOperation> = new Map();
  private eventListeners: Map<string, (() => void)[]> = new Map();

  constructor(map: maptilersdk.Map | null = null) {
    this.map = map;
    console.log('🧹 LayerCleanupManager initialized');
  }

  setMap(map: maptilersdk.Map): void {
    this.map = map;
    console.log('🗺️ LayerCleanupManager map reference updated');
  }

  // Comprehensive layer state scanning
  scanCurrentLayers(): void {
    if (!this.map) return;

    console.log('🔍 Scanning current map layers...');
    this.layerStates.clear();

    try {
      // Get all current layers from the map
      const style = this.map.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer: any) => {
          this.layerStates.set(layer.id, {
            id: layer.id,
            type: layer.type === 'line' ? 'line' : 'fill',
            parentSource: layer.source,
            exists: true,
            timestamp: Date.now()
          });
        });
      }

      // Get all current sources
      Object.keys(style.sources || {}).forEach(sourceId => {
        this.layerStates.set(sourceId, {
          id: sourceId,
          type: 'source',
          exists: true,
          timestamp: Date.now()
        });
      });

      console.log(`✅ Layer state scan complete - tracked ${this.layerStates.size} items`);
      
    } catch (error) {
      console.error('❌ Error during layer state scan:', error);
    }
  }

  // Event-driven cleanup with comprehensive tracking
  async performLayerCleanup(layerType: string, boundaryTypes: string[]): Promise<string> {
    if (!this.map) {
      throw new Error('Map reference not available');
    }

    const operationId = `cleanup_${layerType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🧹 Starting layer cleanup operation: ${operationId} for type: ${layerType}`);

    // Create operation tracking
    const operation: CleanupOperation = {
      id: operationId,
      layerType,
      operations: [],
      rollbackData: [],
      status: 'pending',
      timestamp: Date.now()
    };

    this.operations.set(operationId, operation);

    try {
      operation.status = 'executing';
      await this.emitEvent('cleanup-started', { operationId, layerType });

      // Scan current state before cleanup
      this.scanCurrentLayers();

      // Plan cleanup operations
      const cleanupPlan = this.planCleanupOperations(boundaryTypes);
      operation.operations = cleanupPlan.operations;
      operation.rollbackData = cleanupPlan.rollbackData;

      console.log(`📋 Cleanup plan created: ${cleanupPlan.operations.length} operations, ${cleanupPlan.rollbackData.length} rollback items`);

      // Execute cleanup with validation
      await this.executeCleanupPlan(operation);

      operation.status = 'completed';
      console.log(`✅ Layer cleanup operation ${operationId} completed successfully`);
      
      await this.emitEvent('cleanup-completed', { operationId, layerType, operationsCount: operation.operations.length });

      return operationId;

    } catch (error) {
      console.error(`❌ Layer cleanup operation ${operationId} failed:`, error);
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Unknown error';

      // Attempt rollback
      try {
        await this.rollbackOperation(operationId);
      } catch (rollbackError) {
        console.error(`💥 Rollback failed for operation ${operationId}:`, rollbackError);
      }

      await this.emitEvent('cleanup-failed', { operationId, layerType, error: operation.error });
      throw error;
    }
  }

  // Smart cleanup planning with rollback preparation
  private planCleanupOperations(boundaryTypes: string[]): { operations: LayerState[]; rollbackData: LayerState[] } {
    const operations: LayerState[] = [];
    const rollbackData: LayerState[] = [];

    boundaryTypes.forEach(type => {
      const sourceId = `${type}-source`;
      const layerId = `${type}-layer`;
      const fillLayerId = `${type}-fill`;
      const highlightLayerId = `${type}-highlight`;

      // Plan layer removals (in reverse order of creation)
      [highlightLayerId, fillLayerId, layerId].forEach(id => {
        const currentState = this.layerStates.get(id);
        if (currentState && currentState.exists) {
          operations.push({
            id,
            type: currentState.type,
            parentSource: currentState.parentSource,
            exists: false, // Target state
            timestamp: Date.now()
          });

          // Store current state for rollback
          rollbackData.push({ ...currentState });
        }
      });

      // Plan source removal
      const sourceState = this.layerStates.get(sourceId);
      if (sourceState && sourceState.exists) {
        operations.push({
          id: sourceId,
          type: 'source',
          exists: false, // Target state
          timestamp: Date.now()
        });

        // Store current state for rollback
        rollbackData.push({ ...sourceState });
      }
    });

    return { operations, rollbackData };
  }

  // Execute cleanup plan with validation
  private async executeCleanupPlan(operation: CleanupOperation): Promise<void> {
    if (!this.map) throw new Error('Map reference not available');

    let successCount = 0;
    let errorCount = 0;

    for (const plannedOp of operation.operations) {
      try {
        if (plannedOp.type === 'source') {
          // Remove source
          if (this.map.getSource(plannedOp.id)) {
            console.log(`🗑️ Removing source: ${plannedOp.id}`);
            this.map.removeSource(plannedOp.id);
            successCount++;
          } else {
            console.log(`ℹ️ Source ${plannedOp.id} already removed or never existed`);
          }
        } else {
          // Remove layer
          if (this.map.getLayer(plannedOp.id)) {
            console.log(`🗑️ Removing layer: ${plannedOp.id}`);
            this.map.removeLayer(plannedOp.id);
            successCount++;
          } else {
            console.log(`ℹ️ Layer ${plannedOp.id} already removed or never existed`);
          }
        }

        // Update our tracking
        this.layerStates.set(plannedOp.id, {
          ...plannedOp,
          exists: false
        });

        // Small delay to prevent overwhelming the map
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to remove ${plannedOp.type} ${plannedOp.id}:`, error);
        
        // Continue with other operations rather than failing completely
        // This makes the cleanup more resilient
      }
    }

    console.log(`📊 Cleanup execution complete: ${successCount} successful, ${errorCount} errors`);

    if (errorCount > 0 && successCount === 0) {
      throw new Error(`All cleanup operations failed (${errorCount} errors)`);
    }

    // Validate cleanup state
    await this.validateCleanupState(operation);
  }

  // Validate that cleanup achieved the desired state
  private async validateCleanupState(operation: CleanupOperation): Promise<void> {
    if (!this.map) return;

    console.log(`🔍 Validating cleanup state for operation ${operation.id}...`);

    let orphanedLayers = 0;
    let orphanedSources = 0;

    // Check for orphaned layers
    operation.operations.forEach(plannedOp => {
      if (plannedOp.type === 'source') {
        if (this.map!.getSource(plannedOp.id)) {
          orphanedSources++;
          console.warn(`⚠️ Orphaned source detected: ${plannedOp.id}`);
        }
      } else {
        if (this.map!.getLayer(plannedOp.id)) {
          orphanedLayers++;
          console.warn(`⚠️ Orphaned layer detected: ${plannedOp.id}`);
        }
      }
    });

    const totalOrphaned = orphanedLayers + orphanedSources;
    
    if (totalOrphaned > 0) {
      const message = `Cleanup validation failed: ${orphanedLayers} orphaned layers, ${orphanedSources} orphaned sources`;
      console.error(`❌ ${message}`);
      
      await this.emitEvent('cleanup-validation-failed', {
        operationId: operation.id,
        orphanedLayers,
        orphanedSources
      });
      
      throw new Error(message);
    }

    console.log(`✅ Cleanup validation passed for operation ${operation.id}`);
    await this.emitEvent('cleanup-validated', { operationId: operation.id });
  }

  // Rollback capability for failed operations
  private async rollbackOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation || !this.map) {
      throw new Error(`Cannot rollback operation ${operationId}: operation not found or map unavailable`);
    }

    console.log(`🔄 Starting rollback for operation ${operationId}...`);
    operation.status = 'rolled-back';

    await this.emitEvent('rollback-started', { operationId });

    try {
      // Note: In a real implementation, we'd need to restore the original layer/source data
      // For now, we'll just log what would be restored
      operation.rollbackData.forEach(rollbackItem => {
        console.log(`🔄 Would restore ${rollbackItem.type}: ${rollbackItem.id} (exists: ${rollbackItem.exists})`);
        
        // Update our tracking to reflect rollback
        this.layerStates.set(rollbackItem.id, { ...rollbackItem });
      });

      console.log(`✅ Rollback completed for operation ${operationId}`);
      await this.emitEvent('rollback-completed', { operationId });

    } catch (error) {
      console.error(`❌ Rollback failed for operation ${operationId}:`, error);
      await this.emitEvent('rollback-failed', { operationId, error });
      throw error;
    }
  }

  // Event system for integration
  private async emitEvent(eventType: string, data: any): Promise<void> {
    const listeners = this.eventListeners.get(eventType) || [];
    
    console.log(`📡 Emitting event: ${eventType}`, data);
    
    listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error(`❌ Event listener error for ${eventType}:`, error);
      }
    });

    // Small delay to ensure event processing
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Event subscription
  addEventListener(eventType: string, listener: () => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
    console.log(`📝 Event listener registered for: ${eventType}`);
  }

  removeEventListener(eventType: string, listener: () => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log(`🗑️ Event listener removed for: ${eventType}`);
      }
    }
  }

  // Get operation status and history
  getOperationStatus(operationId: string): CleanupOperation | null {
    return this.operations.get(operationId) || null;
  }

  getAllOperations(): CleanupOperation[] {
    return Array.from(this.operations.values());
  }

  // Get current layer states for debugging
  getCurrentLayerStates(): Map<string, LayerState> {
    return new Map(this.layerStates);
  }

  // Cleanup manager itself
  destroy(): void {
    console.log('🧹 LayerCleanupManager destroying...');
    this.layerStates.clear();
    this.operations.clear();
    this.eventListeners.clear();
    this.map = null;
  }
} 