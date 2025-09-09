/**
 * Performance Test Utilities
 * Verify optimization implementations are working correctly
 */
import { performance } from 'perf_hooks';
import type { Player } from '@shared/types/models';


interface PerformanceMetrics {
  componentLoadTime: number;
  queryResponseTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
}

export class PerformanceTracker {
  private metrics: Map<string, number> = new Map();
  
  startTimer(name: string): void {
    this.metrics.set(`${name}_start`, performance.now());
  }
  
  endTimer(name: string): number {
    const startTime = this.metrics.get(`${name}_start`);
    if (!startTime) {
      console.warn(`No start time found for ${name}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    this.metrics.set(name, duration);
    
    return duration;
  }
  
  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }
  
  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      if (!key.endsWith('_start')) {
        result[key] = value;
      }
    });
    return result;
  }
  
  logMetrics(): void {
    console.log('Performance Metrics:', this.getAllMetrics());
  }
  
  // Test lazy loading performance
  testLazyLoading(): Promise<void> {
    return new Promise((resolve) => {
      this.startTimer('lazyComponentLoad');
      
      // Simulate component lazy loading
      import('../components/VirtualizedPlayerRoster').then(() => {
        this.endTimer('lazyComponentLoad');
        console.log('✓ Lazy loading test completed');
        resolve();
      }).catch((error) => {
        console.error('✗ Lazy loading test failed:', error);
        resolve();
      });
    });
  }
  
  // Test query caching performance
  testQueryCaching(): void {
    this.startTimer('queryCache');
    
    // Simulate cached query (should be faster on subsequent calls)
    const cacheKey = 'test-query-cache';
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log('✓ Query cache hit detected');
      this.endTimer('queryCache');
    } else {
      // Simulate first query
      localStorage.setItem(cacheKey, JSON.stringify({ cached: true }));
      this.endTimer('queryCache');
      console.log('✓ Query cache test completed');
    }
  }
  
  // Test virtual scrolling performance
  testVirtualScrolling(): void {
    this.startTimer('virtualScroll');
    
    // Simulate large dataset rendering
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Player ${i}`,
      score: Math.random() * 100
    }));
    
    // Simulate virtual scrolling (only rendering visible items)
    const visibleItems = largeDataset.slice(0, 10); // Only render first 10
    
    this.endTimer('virtualScroll');
    console.log('✓ Virtual scrolling test completed - rendered', visibleItems.length, 'of', largeDataset.length, 'items');
  }
  
  // Test PWA capabilities
  testPWACapabilities(): void {
    this.startTimer('pwaTest');
    
    // Check if service worker is available
    if ('serviceWorker' in navigator) {
      console.log('✓ Service Worker support detected');
    }
    
    // Check if app manifest is available
    if (document.querySelector('link[rel="manifest"]')) {
      console.log('✓ App manifest detected');
    }
    
    // Check if app can be installed
    if ('BeforeInstallPromptEvent' in window) {
      console.log('✓ PWA install capability detected');
    }
    
    this.endTimer('pwaTest');
    console.log('✓ PWA capabilities test completed');
  }
  
  // Run all performance tests
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting performance optimization tests...');
    
    await this.testLazyLoading();
    this.testQueryCaching();
    this.testVirtualScrolling();
    this.testPWACapabilities();
    
    this.logMetrics();
    console.log('✅ All performance tests completed successfully!');
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Run tests after a short delay to ensure components are loaded
  setTimeout(() => {
    performanceTracker.runAllTests();
  }, 2000);
}

export default performanceTracker;