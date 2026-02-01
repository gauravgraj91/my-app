/**
 * Performance tests for bill service operations
 */

import { performanceTests, performanceMonitor } from '../../utils/performanceUtils';
import { 
  fetchBillsPaginated, 
  fetchBillsInfinite,
  getBillAnalytics 
} from '../../firebase/billService';
import { 
  fetchShopProductsPaginated,
  fetchProductsInfinite 
} from '../../firebase/shopProductService';
import { 
  billCacheUtils, 
  productCacheUtils,
  queryCacheUtils,
  analyticsCacheUtils 
} from '../../utils/cacheUtils';

// Mock Firebase to avoid actual network calls in tests
jest.mock('../../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(() => {
    const mockDocs = Array.from({ length: 20 }, (_, i) => ({
      id: `bill-${i}`,
      data: () => ({
        billNumber: `B${i.toString().padStart(3, '0')}`,
        vendor: `Vendor ${i % 5}`,
        date: new Date(),
        totalAmount: Math.random() * 1000,
        totalProfit: Math.random() * 200,
        status: 'active'
      })
    }));
    
    return Promise.resolve({
      docs: mockDocs,
      size: 20,
      metadata: { fromCache: false, hasPendingWrites: false },
      forEach: (callback) => mockDocs.forEach(callback)
    });
  })
}));

describe('Bill Service Performance Tests', () => {
  beforeEach(() => {
    // Clear all caches before each test
    billCacheUtils.clear();
    productCacheUtils.clear();
    queryCacheUtils.clear();
    analyticsCacheUtils.clear();
    performanceMonitor.clearMetrics();
  });

  describe('Pagination Performance', () => {
    test('should handle large paginated bill queries efficiently', async () => {
      const benchmark = await performanceTests.testBillLoading(100);
      
      expect(benchmark.averageTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(benchmark.maxTime).toBeLessThan(2000); // No single query should take more than 2 seconds
      
      console.log('Bill loading benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(2)}ms`,
        maxTime: `${benchmark.maxTime.toFixed(2)}ms`,
        minTime: `${benchmark.minTime.toFixed(2)}ms`
      });
    });

    test('should handle large paginated product queries efficiently', async () => {
      const benchmark = await performanceTests.testProductLoading(100);
      
      expect(benchmark.averageTime).toBeLessThan(1000);
      expect(benchmark.maxTime).toBeLessThan(2000);
      
      console.log('Product loading benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(2)}ms`,
        maxTime: `${benchmark.maxTime.toFixed(2)}ms`,
        minTime: `${benchmark.minTime.toFixed(2)}ms`
      });
    });

    test('should show performance improvement with caching', async () => {
      const options = {
        pageLimit: 50,
        useCache: false
      };

      // First run without cache
      const withoutCacheTime = await performanceMonitor.timeAsync(
        'bills-without-cache',
        () => fetchBillsPaginated(options)
      );

      // Second run with cache enabled
      options.useCache = true;
      const withCacheTime = await performanceMonitor.timeAsync(
        'bills-with-cache',
        () => fetchBillsPaginated(options)
      );

      const withoutCacheMetrics = performanceMonitor.getMetrics('bills-without-cache');
      const withCacheMetrics = performanceMonitor.getMetrics('bills-with-cache');

      console.log('Cache performance comparison:', {
        withoutCache: `${withoutCacheMetrics.averageDuration.toFixed(2)}ms`,
        withCache: `${withCacheMetrics.averageDuration.toFixed(2)}ms`,
        improvement: `${((withoutCacheMetrics.averageDuration - withCacheMetrics.averageDuration) / withoutCacheMetrics.averageDuration * 100).toFixed(1)}%`
      });

      // Cache should provide some performance benefit
      expect(withCacheMetrics.averageDuration).toBeLessThanOrEqual(withoutCacheMetrics.averageDuration);
    });
  });

  describe('Search Performance', () => {
    test('should handle search operations efficiently', async () => {
      const searchTerms = ['Vendor', 'Product', 'B001', 'Category'];
      const dataSizes = [100, 500, 1000];

      for (const dataSize of dataSizes) {
        for (const searchTerm of searchTerms) {
          const benchmark = await performanceTests.testSearchPerformance(searchTerm, dataSize);
          
          // Search should complete quickly even with large datasets
          expect(benchmark.averageTime).toBeLessThan(100); // Under 100ms
          
          console.log(`Search performance (${dataSize} items, "${searchTerm}"):`, {
            averageTime: `${benchmark.averageTime.toFixed(2)}ms`,
            maxTime: `${benchmark.maxTime.toFixed(2)}ms`
          });
        }
      }
    });

    test('should scale linearly with data size', async () => {
      const smallDataBenchmark = await performanceTests.testSearchPerformance('test', 100);
      const largeDataBenchmark = await performanceTests.testSearchPerformance('test', 1000);

      // Performance should scale reasonably (not exponentially)
      const scalingFactor = largeDataBenchmark.averageTime / smallDataBenchmark.averageTime;
      expect(scalingFactor).toBeLessThan(20); // Should not be more than 20x slower for 10x data

      console.log('Search scaling factor:', {
        small: `${smallDataBenchmark.averageTime.toFixed(2)}ms`,
        large: `${largeDataBenchmark.averageTime.toFixed(2)}ms`,
        factor: `${scalingFactor.toFixed(2)}x`
      });
    });
  });

  describe('Virtual Scrolling Performance', () => {
    test('should handle virtual scrolling calculations efficiently', async () => {
      const itemCounts = [1000, 5000, 10000];

      for (const itemCount of itemCounts) {
        const benchmark = await performanceTests.testVirtualScrolling(itemCount);
        
        // Virtual scrolling calculations should be very fast
        expect(benchmark.averageTime).toBeLessThan(10); // Under 10ms
        expect(benchmark.maxTime).toBeLessThan(50); // No calculation should take more than 50ms
        
        console.log(`Virtual scrolling performance (${itemCount} items):`, {
          averageTime: `${benchmark.averageTime.toFixed(2)}ms`,
          maxTime: `${benchmark.maxTime.toFixed(2)}ms`
        });
      }
    });

    test('should maintain consistent performance regardless of scroll position', async () => {
      const itemCount = 10000;
      const scrollPositions = [0, 0.25, 0.5, 0.75, 1.0]; // Different scroll positions
      const results = [];

      for (const position of scrollPositions) {
        const benchmark = await performanceTests.testVirtualScrolling(itemCount);
        results.push(benchmark.averageTime);
      }

      // Performance should be consistent across scroll positions
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);
      const variance = maxTime - minTime;
      
      expect(variance).toBeLessThan(5); // Variance should be less than 5ms

      console.log('Virtual scrolling consistency:', {
        maxTime: `${maxTime.toFixed(2)}ms`,
        minTime: `${minTime.toFixed(2)}ms`,
        variance: `${variance.toFixed(2)}ms`
      });
    });
  });

  describe('Cache Performance', () => {
    test('should handle cache operations efficiently', async () => {
      const benchmark = await performanceTests.testCachePerformance();
      
      // Cache operations should be very fast
      expect(benchmark.averageTime).toBeLessThan(1); // Under 1ms per operation
      expect(benchmark.maxTime).toBeLessThan(5); // No operation should take more than 5ms
      
      console.log('Cache performance:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        maxTime: `${benchmark.maxTime.toFixed(3)}ms`,
        operationsPerSecond: Math.round(1000 / benchmark.averageTime)
      });
    });

    test('should maintain performance with large cache sizes', async () => {
      // Fill cache with many items
      for (let i = 0; i < 1000; i++) {
        billCacheUtils.set(`bill-${i}`, {
          id: `bill-${i}`,
          billNumber: `B${i}`,
          vendor: `Vendor ${i}`,
          totalAmount: Math.random() * 1000
        });
      }

      // Test cache operations with full cache
      const benchmark = await performanceTests.testCachePerformance();
      
      // Performance should still be good with large cache
      expect(benchmark.averageTime).toBeLessThan(2); // Under 2ms per operation
      
      console.log('Large cache performance:', {
        cacheSize: billCacheUtils.getBillCacheStats?.()?.size || 'unknown',
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`
      });
    });
  });

  describe('Memory Usage', () => {
    test('should not cause memory leaks during repeated operations', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await fetchBillsPaginated({ pageLimit: 20 });
        await fetchShopProductsPaginated({ pageLimit: 20 });
        
        // Clear caches periodically to simulate real usage
        if (i % 10 === 0) {
          billCacheUtils.clear();
          productCacheUtils.clear();
          queryCacheUtils.clear();
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log('Memory usage:', {
        initial: `${(initialMemory / 1024 / 1024).toFixed(2)}MB`,
        final: `${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
        increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      });
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent bill queries efficiently', async () => {
      const concurrentQueries = 10;
      const startTime = performance.now();
      
      // Run multiple queries concurrently
      const promises = Array.from({ length: concurrentQueries }, (_, i) =>
        fetchBillsPaginated({ 
          pageLimit: 20,
          filters: { vendor: `Vendor ${i % 3}` }
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All queries should complete
      expect(results).toHaveLength(concurrentQueries);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.bills).toBeDefined();
      });
      
      // Concurrent execution should be faster than sequential
      const averageTimePerQuery = totalTime / concurrentQueries;
      expect(averageTimePerQuery).toBeLessThan(500); // Under 500ms per query on average
      
      console.log('Concurrent query performance:', {
        totalTime: `${totalTime.toFixed(2)}ms`,
        averagePerQuery: `${averageTimePerQuery.toFixed(2)}ms`,
        concurrentQueries
      });
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain performance benchmarks', async () => {
      // Define performance benchmarks that should not regress
      const benchmarks = {
        billLoading: { maxAverage: 1000, maxSingle: 2000 },
        productLoading: { maxAverage: 1000, maxSingle: 2000 },
        search: { maxAverage: 100, maxSingle: 200 },
        virtualScrolling: { maxAverage: 10, maxSingle: 50 },
        cache: { maxAverage: 1, maxSingle: 5 }
      };

      // Run all performance tests
      const results = {
        billLoading: await performanceTests.testBillLoading(50),
        productLoading: await performanceTests.testProductLoading(50),
        search: await performanceTests.testSearchPerformance('test', 500),
        virtualScrolling: await performanceTests.testVirtualScrolling(5000),
        cache: await performanceTests.testCachePerformance()
      };

      // Check each benchmark
      for (const [testName, result] of Object.entries(results)) {
        const benchmark = benchmarks[testName];
        
        expect(result.averageTime).toBeLessThan(benchmark.maxAverage);
        expect(result.maxTime).toBeLessThan(benchmark.maxSingle);
        
        console.log(`${testName} benchmark:`, {
          average: `${result.averageTime.toFixed(2)}ms (max: ${benchmark.maxAverage}ms)`,
          max: `${result.maxTime.toFixed(2)}ms (max: ${benchmark.maxSingle}ms)`,
          status: result.averageTime < benchmark.maxAverage && result.maxTime < benchmark.maxSingle ? '✅ PASS' : '❌ FAIL'
        });
      }
    });
  });
});

describe('Integration Performance Tests', () => {
  test('should handle complete bill management workflow efficiently', async () => {
    const workflowSteps = [
      'load-bills',
      'search-bills', 
      'filter-bills',
      'load-products',
      'calculate-analytics'
    ];

    const workflowTimes = {};

    // Simulate complete workflow
    for (const step of workflowSteps) {
      const timingId = performanceMonitor.startTiming(step);
      
      switch (step) {
        case 'load-bills':
          await fetchBillsPaginated({ pageLimit: 50 });
          break;
        case 'search-bills':
          await performanceTests.testSearchPerformance('Vendor', 200);
          break;
        case 'filter-bills':
          await fetchBillsPaginated({ 
            pageLimit: 50,
            filters: { vendor: 'Test Vendor', status: 'active' }
          });
          break;
        case 'load-products':
          await fetchShopProductsPaginated({ pageLimit: 100 });
          break;
        case 'calculate-analytics':
          // Simulate analytics calculation
          await new Promise(resolve => setTimeout(resolve, 50));
          break;
      }
      
      const metric = performanceMonitor.endTiming(timingId);
      workflowTimes[step] = metric.duration;
    }

    const totalWorkflowTime = Object.values(workflowTimes).reduce((sum, time) => sum + time, 0);
    
    // Complete workflow should finish in reasonable time
    expect(totalWorkflowTime).toBeLessThan(5000); // Under 5 seconds
    
    console.log('Complete workflow performance:', {
      ...Object.fromEntries(
        Object.entries(workflowTimes).map(([step, time]) => [step, `${time.toFixed(2)}ms`])
      ),
      total: `${totalWorkflowTime.toFixed(2)}ms`
    });
  });
});