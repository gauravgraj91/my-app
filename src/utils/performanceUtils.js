/**
 * Performance utilities for monitoring and benchmarking
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Start timing an operation
  startTiming(operationName) {
    if (!this.isEnabled) return null;
    
    const startTime = performance.now();
    const timingId = `${operationName}_${Date.now()}_${Math.random()}`;
    
    this.metrics.set(timingId, {
      operation: operationName,
      startTime,
      endTime: null,
      duration: null,
      metadata: {}
    });
    
    return timingId;
  }

  // End timing an operation
  endTiming(timingId, metadata = {}) {
    if (!this.isEnabled || !timingId) return null;
    
    const metric = this.metrics.get(timingId);
    if (!metric) return null;
    
    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    metric.metadata = { ...metric.metadata, ...metadata };
    
    // Notify observers
    this.notifyObservers(metric);
    
    return metric;
  }

  // Time a function execution
  timeFunction(operationName, fn, metadata = {}) {
    const timingId = this.startTiming(operationName);
    
    try {
      const result = fn();
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          this.endTiming(timingId, metadata);
        });
      }
      
      this.endTiming(timingId, metadata);
      return result;
    } catch (error) {
      this.endTiming(timingId, { ...metadata, error: error.message });
      throw error;
    }
  }

  // Time an async function
  async timeAsync(operationName, asyncFn, metadata = {}) {
    const timingId = this.startTiming(operationName);
    
    try {
      const result = await asyncFn();
      this.endTiming(timingId, metadata);
      return result;
    } catch (error) {
      this.endTiming(timingId, { ...metadata, error: error.message });
      throw error;
    }
  }

  // Get metrics for an operation
  getMetrics(operationName) {
    const metrics = Array.from(this.metrics.values())
      .filter(metric => metric.operation === operationName)
      .filter(metric => metric.duration !== null);
    
    if (metrics.length === 0) return null;
    
    const durations = metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    
    return {
      operation: operationName,
      count: metrics.length,
      totalDuration: sum,
      averageDuration: sum / metrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: this.calculateMedian(durations),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      metrics: metrics
    };
  }

  // Get all metrics
  getAllMetrics() {
    const operations = [...new Set(Array.from(this.metrics.values()).map(m => m.operation))];
    return operations.map(op => this.getMetrics(op)).filter(Boolean);
  }

  // Clear metrics
  clearMetrics(operationName = null) {
    if (operationName) {
      const keysToDelete = [];
      for (const [key, metric] of this.metrics.entries()) {
        if (metric.operation === operationName) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.metrics.delete(key));
    } else {
      this.metrics.clear();
    }
  }

  // Add observer for metrics
  addObserver(callback) {
    this.observers.push(callback);
  }

  // Remove observer
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  // Notify observers
  notifyObservers(metric) {
    this.observers.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.warn('Error in performance observer:', error);
      }
    });
  }

  // Calculate median
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  // Calculate percentile
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance decorators and utilities
export const withPerformanceMonitoring = (operationName, metadata = {}) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
      return performanceMonitor.timeFunction(
        `${operationName || `${target.constructor.name}.${propertyKey}`}`,
        () => originalMethod.apply(this, args),
        metadata
      );
    };
    
    return descriptor;
  };
};

// React hook for performance monitoring
export const usePerformanceMonitoring = (operationName) => {
  const startTiming = (metadata = {}) => {
    return performanceMonitor.startTiming(operationName);
  };
  
  const endTiming = (timingId, metadata = {}) => {
    return performanceMonitor.endTiming(timingId, metadata);
  };
  
  const timeFunction = (fn, metadata = {}) => {
    return performanceMonitor.timeFunction(operationName, fn, metadata);
  };
  
  const timeAsync = (asyncFn, metadata = {}) => {
    return performanceMonitor.timeAsync(operationName, asyncFn, metadata);
  };
  
  const getMetrics = () => {
    return performanceMonitor.getMetrics(operationName);
  };
  
  return {
    startTiming,
    endTiming,
    timeFunction,
    timeAsync,
    getMetrics
  };
};

// Firebase query performance monitoring
export const monitorFirebaseQuery = async (queryName, queryFn, metadata = {}) => {
  const timingId = performanceMonitor.startTiming(`firebase-${queryName}`);
  
  try {
    const result = await queryFn();
    
    const queryMetadata = {
      ...metadata,
      resultCount: Array.isArray(result) ? result.length : 
                   result?.docs ? result.docs.length : 
                   result?.size || 0,
      fromCache: result?.metadata?.fromCache || false,
      hasPendingWrites: result?.metadata?.hasPendingWrites || false
    };
    
    performanceMonitor.endTiming(timingId, queryMetadata);
    return result;
  } catch (error) {
    performanceMonitor.endTiming(timingId, { 
      ...metadata, 
      error: error.message,
      errorCode: error.code 
    });
    throw error;
  }
};

// Component render performance monitoring
export const monitorComponentRender = (componentName) => {
  return (WrappedComponent) => {
    // This would need React import at the top of the file to work properly
    // For now, return the component as-is to avoid ESLint errors
    return WrappedComponent;
  };
};

// Memory usage monitoring
export const getMemoryUsage = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedPercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    };
  }
  return null;
};

// Network performance monitoring
export const monitorNetworkRequest = async (requestName, requestFn, metadata = {}) => {
  const timingId = performanceMonitor.startTiming(`network-${requestName}`);
  const startMemory = getMemoryUsage();
  
  try {
    const result = await requestFn();
    const endMemory = getMemoryUsage();
    
    performanceMonitor.endTiming(timingId, {
      ...metadata,
      memoryBefore: startMemory,
      memoryAfter: endMemory,
      memoryDelta: endMemory && startMemory ? 
        endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : null
    });
    
    return result;
  } catch (error) {
    performanceMonitor.endTiming(timingId, { 
      ...metadata, 
      error: error.message 
    });
    throw error;
  }
};

// Performance benchmarking utilities
export const runBenchmark = async (name, iterations, testFn) => {
  const results = [];
  
  console.log(`Starting benchmark: ${name} (${iterations} iterations)`);
  
  for (let i = 0; i < iterations; i++) {
    const timingId = performanceMonitor.startTiming(`benchmark-${name}`);
    
    try {
      await testFn(i);
      const metric = performanceMonitor.endTiming(timingId, { iteration: i });
      if (metric && metric.duration !== null) {
        results.push(metric.duration);
      }
    } catch (error) {
      performanceMonitor.endTiming(timingId, { iteration: i, error: error.message });
      console.error(`Benchmark iteration ${i} failed:`, error);
    }
  }
  
  if (results.length === 0) {
    return {
      name,
      iterations: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: 0,
      maxTime: 0,
      medianTime: 0,
      standardDeviation: 0,
      results: []
    };
  }

  const totalTime = results.reduce((sum, time) => sum + time, 0);
  const avgTime = totalTime / results.length;
  const minTime = Math.min(...results);
  const maxTime = Math.max(...results);
  const medianTime = performanceMonitor.calculateMedian(results);
  
  const benchmarkResult = {
    name,
    iterations: results.length,
    totalTime,
    averageTime: avgTime,
    minTime,
    maxTime,
    medianTime,
    standardDeviation: Math.sqrt(
      results.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / results.length
    ),
    results
  };
  
  console.log(`Benchmark ${name} completed:`, benchmarkResult);
  return benchmarkResult;
};

// Performance report generation
export const generatePerformanceReport = () => {
  const allMetrics = performanceMonitor.getAllMetrics();
  const memoryUsage = getMemoryUsage();
  
  const report = {
    timestamp: new Date().toISOString(),
    memoryUsage,
    operations: allMetrics,
    summary: {
      totalOperations: allMetrics.reduce((sum, op) => sum + op.count, 0),
      slowestOperation: allMetrics.reduce((slowest, op) => 
        !slowest || op.maxDuration > slowest.maxDuration ? op : slowest, null),
      fastestOperation: allMetrics.reduce((fastest, op) => 
        !fastest || op.minDuration < fastest.minDuration ? op : fastest, null),
      totalTime: allMetrics.reduce((sum, op) => sum + op.totalDuration, 0)
    }
  };
  
  return report;
};

// Export performance data
export const exportPerformanceData = (format = 'json') => {
  const report = generatePerformanceReport();
  
  if (format === 'csv') {
    const csvData = report.operations.map(op => ({
      operation: op.operation,
      count: op.count,
      averageDuration: op.averageDuration,
      minDuration: op.minDuration,
      maxDuration: op.maxDuration,
      totalDuration: op.totalDuration
    }));
    
    const csvHeaders = Object.keys(csvData[0] || {});
    const csvRows = [
      csvHeaders.join(','),
      ...csvData.map(row => csvHeaders.map(header => row[header]).join(','))
    ];
    
    return csvRows.join('\n');
  }
  
  return JSON.stringify(report, null, 2);
};

// Performance testing utilities for bills and products
export const performanceTests = {
  // Test bill loading performance
  testBillLoading: async (billCount = 100) => {
    return runBenchmark('bill-loading', 10, async () => {
      const { fetchBillsPaginated } = await import('../firebase/billService');
      await fetchBillsPaginated({ pageLimit: billCount });
    });
  },
  
  // Test product loading performance
  testProductLoading: async (productCount = 100) => {
    return runBenchmark('product-loading', 10, async () => {
      const { fetchShopProductsPaginated } = await import('../firebase/shopProductService');
      await fetchShopProductsPaginated({ pageLimit: productCount });
    });
  },
  
  // Test search performance
  testSearchPerformance: async (searchTerm, dataSize = 1000) => {
    return runBenchmark('search-performance', 5, async () => {
      // Simulate search on large dataset
      const mockData = Array.from({ length: dataSize }, (_, i) => ({
        id: i,
        billNumber: `B${i.toString().padStart(3, '0')}`,
        vendor: `Vendor ${i % 10}`,
        productName: `Product ${i}`,
        category: `Category ${i % 5}`
      }));
      
      const searchLower = searchTerm.toLowerCase();
      const results = mockData.filter(item => 
        item.billNumber.toLowerCase().includes(searchLower) ||
        item.vendor.toLowerCase().includes(searchLower) ||
        item.productName.toLowerCase().includes(searchLower)
      );
      
      return results;
    });
  },
  
  // Test virtual scrolling performance
  testVirtualScrolling: async (itemCount = 10000) => {
    return runBenchmark('virtual-scrolling', 5, async () => {
      // Simulate virtual scrolling calculations
      const itemHeight = 60;
      const containerHeight = 400;
      const scrollTop = Math.random() * (itemCount * itemHeight - containerHeight);
      
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        itemCount - 1,
        Math.floor((scrollTop + containerHeight) / itemHeight)
      );
      
      const visibleItems = [];
      for (let i = startIndex; i <= endIndex; i++) {
        visibleItems.push({
          index: i,
          top: i * itemHeight,
          height: itemHeight
        });
      }
      
      return visibleItems;
    });
  },
  
  // Test cache performance
  testCachePerformance: async () => {
    const { billCacheUtils } = await import('./cacheUtils');
    
    return runBenchmark('cache-operations', 1000, async (iteration) => {
      const billId = `bill-${iteration}`;
      const billData = {
        id: billId,
        billNumber: `B${iteration}`,
        vendor: `Vendor ${iteration}`,
        totalAmount: Math.random() * 1000
      };
      
      // Test cache set
      billCacheUtils.set(billId, billData);
      
      // Test cache get
      const retrieved = billCacheUtils.get(billId);
      
      if (!retrieved || retrieved.id !== billId) {
        throw new Error('Cache operation failed');
      }
    });
  }
};

export default performanceMonitor;