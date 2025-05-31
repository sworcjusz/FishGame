/**
 * PerformanceMonitor Test Suite
 * Mobile-First Fish Game Performance Monitoring
 * Test-First Development: Tests written BEFORE implementation
 */

import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor.js';

// Mock timers globally for all tests
jest.useFakeTimers();

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
    }
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(monitor.isRunning).toBe(false);
      expect(monitor.getFPS()).toBe(0);
      expect(monitor.getAverageFPS()).toBe(0);
      expect(monitor.getMemoryUsage()).toEqual({ used: 0, total: 0, percentage: 0 });
    });

    it('should initialize with custom settings', () => {
      const customMonitor = new PerformanceMonitor({
        fpsTargetMax: 30,
        warningThreshold: 25,
        memoryWarningThreshold: 80
      });

      expect(customMonitor.fpsTargetMax).toBe(30);
      expect(customMonitor.warningThreshold).toBe(25);
      expect(customMonitor.memoryWarningThreshold).toBe(80);
      
      customMonitor.destroy();
    });

    it('should handle missing performance API gracefully', () => {
      const originalPerformance = global.performance;
      delete global.performance;

      const robustMonitor = new PerformanceMonitor();
      expect(robustMonitor.hasPerformanceAPI).toBe(false);
      
      global.performance = originalPerformance;
      robustMonitor.destroy();
    });
  });

  describe('FPS Monitoring', () => {
    it('should start and stop monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);

      monitor.stop();
      expect(monitor.isRunning).toBe(false);
    });

    it('should track frame updates', () => {
      monitor.start();
      
      // Simulate frame updates
      monitor.frame();
      monitor.frame();
      monitor.frame();
      
      expect(monitor.getFrameCount()).toBe(3);
    });

    it('should calculate FPS correctly with mock timers', () => {
      // Mock performance.now for consistent timing
      let mockTime = 0;
      performance.now = jest.fn(() => mockTime);
      
      monitor.start();
      mockTime = 0;
      monitor.frame();
      
      // Next frame at 16.67ms (60 FPS)
      mockTime = 16.67;
      monitor.frame();
      
      const fps = monitor.getFPS();
      expect(fps).toBeCloseTo(60, 0);
    });

    it('should calculate average FPS over time', () => {
      monitor.start();
      
      // Simulate multiple FPS measurements
      monitor._recordFPS(60);
      monitor._recordFPS(58);
      monitor._recordFPS(62);
      
      const avgFPS = monitor.getAverageFPS();
      expect(avgFPS).toBeCloseTo(60, 1);
    });

    it('should detect low FPS performance', () => {
      const warningCallback = jest.fn();
      monitor.onPerformanceWarning(warningCallback);
      
      monitor.start();
      
      // Simulate low FPS
      monitor._recordFPS(15); // Below 30fps threshold
      
      expect(warningCallback).toHaveBeenCalledWith({
        type: 'low_fps',
        value: 15,
        threshold: 30,
        severity: 'high'
      });
    });

    it('should maintain FPS history with limit', () => {
      monitor.start();
      
      // Add more FPS entries than the history limit
      for (let i = 0; i < 150; i++) {
        monitor._recordFPS(60);
      }
      
      const history = monitor.getFPSHistory();
      expect(history.length).toBeLessThanOrEqual(100); // Default history limit
    });
  });

  describe('Memory Monitoring', () => {
    beforeEach(() => {
      // Restore memory API if it was deleted
      if (!performance.memory) {
        Object.defineProperty(performance, 'memory', {
          value: {
            usedJSHeapSize: 50 * 1024 * 1024,
            totalJSHeapSize: 100 * 1024 * 1024,
            jsHeapSizeLimit: 200 * 1024 * 1024
          },
          configurable: true
        });
      }
    });

    it('should monitor memory usage when available', () => {
      const memoryUsage = monitor.getMemoryUsage();
      
      expect(memoryUsage.used).toBe(50);
      expect(memoryUsage.total).toBe(100);
      expect(memoryUsage.percentage).toBe(50);
    });

    it('should detect high memory usage', () => {
      const warningCallback = jest.fn();
      monitor.onPerformanceWarning(warningCallback);
      
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 80 * 1024 * 1024, // 80MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB
          jsHeapSizeLimit: 200 * 1024 * 1024  // 200MB
        },
        configurable: true
      });

      monitor.checkMemory();
      
      expect(warningCallback).toHaveBeenCalledWith({
        type: 'high_memory',
        value: 80,
        threshold: 70, // Default threshold
        severity: 'medium'
      });
    });

    it('should handle missing memory API', () => {
      delete performance.memory;
      
      const memoryUsage = monitor.getMemoryUsage();
      expect(memoryUsage).toEqual({ used: 0, total: 0, percentage: 0 });
    });
  });

  describe('Performance Metrics', () => {
    it('should track frame time', () => {
      let mockTime = 0;
      performance.now = jest.fn(() => mockTime);
      
      monitor.start();
      mockTime = 16.67;
      monitor.frame();
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate performance score', () => {
      monitor.start();
      
      // Simulate good performance
      monitor._recordFPS(60);
      
      const score = monitor.getPerformanceScore();
      expect(score).toBeGreaterThan(80); // Good performance
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate low performance score for poor metrics', () => {
      monitor.start();
      
      // Simulate poor performance
      monitor._recordFPS(15);
      
      const score = monitor.getPerformanceScore();
      expect(score).toBeLessThan(50); // Poor performance
    });

    it('should track performance over time', () => {
      monitor.start();
      
      const startTime = monitor.getStartTime();
      expect(startTime).toBeGreaterThan(0);
      
      const uptime = monitor.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mobile-Specific Features', () => {
    it('should detect mobile device', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X)',
        configurable: true
      });

      const isMobile = monitor.isMobileDevice();
      expect(isMobile).toBe(true);
    });

    it('should use mobile-optimized settings', () => {
      const mobileMonitor = new PerformanceMonitor({
        mobile: true
      });

      expect(mobileMonitor.fpsTargetMax).toBe(30); // Lower target for mobile
      expect(mobileMonitor.checkInterval).toBeGreaterThan(1000); // Less frequent checks
      
      mobileMonitor.destroy();
    });

    it('should detect device performance capabilities', () => {
      const capabilities = monitor.getDeviceCapabilities();
      
      expect(capabilities).toHaveProperty('cores');
      expect(capabilities).toHaveProperty('memory');
      expect(capabilities).toHaveProperty('platform');
      expect(capabilities.cores).toBeGreaterThan(0);
    });

    it('should adjust monitoring frequency for low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2, // Dual core
        configurable: true
      });

      const lowEndMonitor = new PerformanceMonitor({
        autoAdjust: true
      });

      expect(lowEndMonitor.checkInterval).toBeGreaterThan(2000); // Less frequent
      
      lowEndMonitor.destroy();
    });
  });

  describe('Event System', () => {
    it('should emit performance events', () => {
      const eventCallback = jest.fn();
      monitor.on('fps_update', eventCallback);
      
      monitor.start();
      monitor._recordFPS(60);
      
      expect(eventCallback).toHaveBeenCalledWith({
        fps: 60,
        timestamp: expect.any(Number)
      });
    });

    it('should emit warning events', () => {
      const warningCallback = jest.fn();
      monitor.onPerformanceWarning(warningCallback);
      
      monitor._recordFPS(10); // Very low FPS
      
      expect(warningCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_fps',
          severity: 'high'
        })
      );
    });

    it('should remove event listeners', () => {
      const callback = jest.fn();
      
      monitor.on('fps_update', callback);
      monitor.off('fps_update', callback);
      
      monitor._recordFPS(60);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Data Export and Reporting', () => {
    it('should export performance report', () => {
      monitor.start();
      
      monitor._recordFPS(60);
      monitor._recordFPS(58);
      
      const report = monitor.getReport();
      
      expect(report).toHaveProperty('fps');
      expect(report).toHaveProperty('memory');
      expect(report).toHaveProperty('uptime');
      expect(report).toHaveProperty('frameCount');
      expect(report).toHaveProperty('performanceScore');
      expect(report.fps.average).toBeCloseTo(59, 1);
    });

    it('should export CSV data', () => {
      monitor.start();
      
      monitor._recordFPS(60);
      monitor._recordFPS(58);
      
      const csv = monitor.exportCSV();
      
      expect(csv).toContain('timestamp,fps,memory');
      expect(csv).toContain('60');
      expect(csv).toContain('58');
    });

    it('should clear performance data', () => {
      monitor.start();
      
      monitor._recordFPS(60);
      expect(monitor.getFPSHistory().length).toBeGreaterThan(0);
      
      monitor.clear();
      expect(monitor.getFPSHistory().length).toBe(0);
      expect(monitor.getFrameCount()).toBe(0);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start real-time monitoring', () => {
      const updateCallback = jest.fn();
      
      monitor.startRealTimeMonitoring(updateCallback);
      expect(monitor.isRealtimeMonitoring).toBe(true);
      
      monitor.stopRealTimeMonitoring();
      expect(monitor.isRealtimeMonitoring).toBe(false);
    });

    it('should call real-time callback with metrics', () => {
      const updateCallback = jest.fn();
      
      monitor.startRealTimeMonitoring(updateCallback, 100); // 100ms interval
      monitor.start();
      monitor.frame();
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: expect.any(Number),
          memory: expect.any(Object),
          frameTime: expect.any(Number)
        })
      );
    });
  });

  describe('Performance Optimization Suggestions', () => {
    it('should provide optimization suggestions for low FPS', () => {
      monitor.start();
      
      // Simulate consistently low FPS
      for (let i = 0; i < 10; i++) {
        monitor._recordFPS(20);
      }
      
      const suggestions = monitor.getOptimizationSuggestions();
      
      expect(suggestions).toContain('Consider reducing visual effects');
      expect(suggestions).toContain('Lower rendering quality');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide memory optimization suggestions', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 90 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024
        },
        configurable: true
      });

      const suggestions = monitor.getOptimizationSuggestions();
      
      expect(suggestions).toContain('Reduce object pooling');
      expect(suggestions).toContain('Clear unused assets');
    });

    it('should return no suggestions for good performance', () => {
      monitor.start();
      
      // Simulate good performance
      for (let i = 0; i < 10; i++) {
        monitor._recordFPS(60);
      }
      
      const suggestions = monitor.getOptimizationSuggestions();
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle performance API errors gracefully', () => {
      // Mock performance.now() to throw
      const originalNow = performance.now;
      performance.now = () => {
        throw new Error('Performance API error');
      };

      expect(() => monitor.frame()).not.toThrow();
      
      performance.now = originalNow;
    });

    it('should handle invalid callback functions', () => {
      expect(() => monitor.on('fps_update', null)).not.toThrow();
      expect(() => monitor.onPerformanceWarning('not-a-function')).not.toThrow();
    });

    it('should prevent memory leaks on destroy', () => {
      monitor.start();
      monitor.startRealTimeMonitoring(() => {});
      
      monitor.destroy();
      
      expect(monitor.isRunning).toBe(false);
      expect(monitor.isRealtimeMonitoring).toBe(false);
      expect(monitor._intervals).toEqual([]);
    });

    it('should handle multiple start/stop calls safely', () => {
      monitor.start();
      monitor.start(); // Should not cause issues
      
      expect(monitor.isRunning).toBe(true);
      
      monitor.stop();
      monitor.stop(); // Should not cause issues
      
      expect(monitor.isRunning).toBe(false);
    });
  });
});

describe('PerformanceMonitor Integration', () => {
  it('should work with mocked requestAnimationFrame', () => {
    const monitor = new PerformanceMonitor();
    monitor.start();
    
    let frameCount = 0;
    let mockTime = 0;
    performance.now = jest.fn(() => mockTime);
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((callback) => {
      mockTime += 16.67; // 60 FPS
      setTimeout(callback, 0);
      return mockTime;
    });
    
    function animate() {
      monitor.frame();
      frameCount++;
      
      if (frameCount < 5) {
        requestAnimationFrame(animate);
      } else {
        expect(monitor.getFrameCount()).toBe(5);
        expect(monitor.getFPS()).toBeGreaterThan(0);
        monitor.destroy();
      }
    }
    
    requestAnimationFrame(animate);
  });

  it('should integrate with game loop timing', () => {
    const monitor = new PerformanceMonitor();
    monitor.start();
    
    let mockTime = 0;
    performance.now = jest.fn(() => mockTime);
    
    const startTime = mockTime;
    
    // Simulate game loop frames
    monitor.frame();
    mockTime += 16.67;
    monitor.frame();
    mockTime += 16.67;
    monitor.frame();
    
    const endTime = mockTime;
    const expectedFPS = 3 / ((endTime - startTime) / 1000);
    
    expect(monitor.getFPS()).toBeCloseTo(expectedFPS, 0);
    
    monitor.destroy();
  });
}); 