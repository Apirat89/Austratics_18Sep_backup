interface LayerRequest {
  id: string;
  layerType: string;
  operation: () => Promise<any>;
  abortController: AbortController;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class LayerRequestQueue {
  private queue: Map<string, LayerRequest> = new Map();
  private processing: Set<string> = new Set();
  private readonly maxConcurrent: number = 1; // Only one layer operation at a time
  private readonly timeoutMs: number = 30000; // 30 second timeout

  async execute<T>(layerType: string, operation: () => Promise<T>): Promise<T> {
    const requestId = `${layerType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Cancel any existing requests for this layer type
    this.cancelExistingRequests(layerType);
    
    console.log(`🔄 Queuing layer request: ${requestId} for ${layerType}`);
    
    return new Promise<T>((resolve, reject) => {
      const abortController = new AbortController();
      
      const request: LayerRequest = {
        id: requestId,
        layerType,
        operation,
        abortController,
        timestamp: Date.now(),
        resolve,
        reject
      };
      
      this.queue.set(requestId, request);
      this.processQueue();
      
      // Set timeout for the request
      setTimeout(() => {
        if (this.queue.has(requestId)) {
          console.warn(`⏰ Layer request ${requestId} timed out after ${this.timeoutMs}ms`);
          this.cancelRequest(requestId, new Error(`Request timeout after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);
    });
  }

  private async processQueue(): Promise<void> {
    // Don't start new processing if we're at max capacity
    if (this.processing.size >= this.maxConcurrent) {
      console.log(`⏸️ Queue processing delayed - ${this.processing.size}/${this.maxConcurrent} slots busy`);
      return;
    }

    // Get the oldest pending request
    const pendingRequests = Array.from(this.queue.values())
      .filter(req => !this.processing.has(req.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (pendingRequests.length === 0) {
      console.log(`✅ No pending layer requests to process`);
      return;
    }

    const request = pendingRequests[0];
    this.processing.add(request.id);
    
    console.log(`🚀 Processing layer request: ${request.id} for ${request.layerType}`);
    console.log(`📊 Queue status: ${pendingRequests.length - 1} pending, ${this.processing.size} processing`);

    try {
      // Check if request was cancelled while waiting
      if (request.abortController.signal.aborted) {
        throw new Error('Request was cancelled');
      }

      const startTime = Date.now();
      const result = await request.operation();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Layer request ${request.id} completed in ${duration}ms`);
      
      request.resolve(result);
      
    } catch (error) {
      console.error(`❌ Layer request ${request.id} failed:`, error);
      request.reject(error);
      
    } finally {
      // Clean up this request
      this.queue.delete(request.id);
      this.processing.delete(request.id);
      
      // Process next request in queue
      if (this.queue.size > 0) {
        console.log(`🔄 Processing next request - ${this.queue.size} remaining in queue`);
        // Use setTimeout to avoid potential stack overflow with deep recursion
        setTimeout(() => this.processQueue(), 0);
      }
    }
  }

  private cancelExistingRequests(layerType: string): void {
    const existingRequests = Array.from(this.queue.values())
      .filter(req => req.layerType === layerType);
    
    if (existingRequests.length > 0) {
      console.log(`🛑 Cancelling ${existingRequests.length} existing requests for layer: ${layerType}`);
      
      existingRequests.forEach(request => {
        this.cancelRequest(request.id, new Error(`Superseded by new ${layerType} request`));
      });
    }
  }

  private cancelRequest(requestId: string, reason: Error): void {
    const request = this.queue.get(requestId);
    if (!request) return;

    console.log(`🛑 Cancelling layer request: ${requestId} - ${reason.message}`);
    
    // Signal abort to any ongoing operations
    request.abortController.abort();
    
    // Reject the promise
    request.reject(reason);
    
    // Clean up
    this.queue.delete(requestId);
    this.processing.delete(requestId);
  }

  // Public method to cancel all requests for a specific layer type
  cancelLayerRequests(layerType: string): void {
    console.log(`🛑 Cancelling all requests for layer type: ${layerType}`);
    this.cancelExistingRequests(layerType);
  }

  // Public method to cancel all pending requests
  cancelAllRequests(): void {
    console.log(`🛑 Cancelling all pending layer requests (${this.queue.size} requests)`);
    
    Array.from(this.queue.keys()).forEach(requestId => {
      this.cancelRequest(requestId, new Error('All requests cancelled'));
    });
  }

  // Get queue status for debugging
  getQueueStatus(): { pending: number; processing: number; details: any[] } {
    const pending = this.queue.size - this.processing.size;
    const details = Array.from(this.queue.values()).map(req => ({
      id: req.id,
      layerType: req.layerType,
      status: this.processing.has(req.id) ? 'processing' : 'pending',
      age: Date.now() - req.timestamp
    }));

    return {
      pending,
      processing: this.processing.size,
      details
    };
  }
} 