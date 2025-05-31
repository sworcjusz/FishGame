/**
 * PerformanceMonitor - Performance Monitoring for Mobile Fish Game
 * Real-time FPS tracking, memory monitoring, and performance optimization
 * 
 * Features:
 * - 60fps target monitoring with mobile optimizations
 * - Memory usage tracking and warnings
 * - Performance scoring and optimization suggestions
 * - Real-time metrics and event system
 * - Device capability detection
 * - Export and reporting functionality
 * - Error resilience and graceful degradation
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    // Default configuration
    const defaults = {
      fpsTargetMax: 60,
      fpsTargetMin: 30,
      warningThreshold: 30,
      memoryWarningThreshold: 70, // 70% of available memory
      historyLimit: 100,
      checkInterval: 1000, // 1 second
      mobile: false,
      autoAdjust: false
    };

    this.config = { ...defaults, ...options };
    
    // Initialize properties
    this.isRunning = false;
    this.isRealtimeMonitoring = false;
    this.startTime = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.eventListeners = {};
    this.performanceWarningCallback = null;
    this._intervals = [];
    this._timeouts = [];
    
    // Performance API availability
    this.hasPerformanceAPI = typeof performance !== 'undefined' && performance.now;
    
    // Auto-detect mobile and adjust settings
    if (this.config.autoAdjust) {
      this._autoAdjustSettings();
    }
    
    // Apply mobile optimizations
    if (this.config.mobile || this.isMobileDevice()) {
      this._applyMobileOptimizations();
    }
  }

  // ===============================
  // CORE MONITORING
  // ===============================

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = this.hasPerformanceAPI ? performance.now() : Date.now();
    this.lastFrameTime = this.startTime;
    this.frameCount = 0;
    
    this._emit('monitor_started', { timestamp: this.startTime });
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this._emit('monitor_stopped', { 
      timestamp: this.hasPerformanceAPI ? performance.now() : Date.now(),
      uptime: this.getUptime()
    });
  }

  /**
   * Record a frame for FPS calculation
   */
  frame() {
    if (!this.isRunning) return;
    
    try {
      const currentTime = this.hasPerformanceAPI ? performance.now() : Date.now();
      const deltaTime = currentTime - this.lastFrameTime;
      
      this.frameCount++;
      
      // Calculate instantaneous FPS
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime;
        this._recordFPS(fps);
      }
      
      this.lastFrameTime = currentTime;
    } catch (error) {
      // Gracefully handle performance API errors
      console.warn('PerformanceMonitor: Error in frame tracking:', error);
    }
  }

  /**
   * Record FPS measurement (internal method)
   * @param {number} fps - FPS value to record
   */
  _recordFPS(fps) {
    const timestamp = this.hasPerformanceAPI ? performance.now() : Date.now();
    
    // Add to history with limit
    this.fpsHistory.push({ fps, timestamp });
    if (this.fpsHistory.length > this.config.historyLimit) {
      this.fpsHistory.shift();
    }
    
    // Check for performance warnings
    this._checkPerformanceWarnings(fps);
    
    // Emit FPS update event
    this._emit('fps_update', { fps, timestamp });
  }

  // ===============================
  // FPS METRICS
  // ===============================

  /**
   * Get current FPS
   * @returns {number} Current FPS
   */
  getFPS() {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1].fps;
  }

  /**
   * Get average FPS over monitoring period
   * @returns {number} Average FPS
   */
  getAverageFPS() {
    if (this.fpsHistory.length === 0) return 0;
    
    const sum = this.fpsHistory.reduce((acc, entry) => acc + entry.fps, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * Get FPS history
   * @returns {Array} Array of FPS measurements with timestamps
   */
  getFPSHistory() {
    return [...this.fpsHistory];
  }

  /**
   * Get frame count
   * @returns {number} Total frames recorded
   */
  getFrameCount() {
    return this.frameCount;
  }

  // ===============================
  // MEMORY MONITORING
  // ===============================

  /**
   * Get current memory usage
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    if (!performance.memory) {
      return { used: 0, total: 0, percentage: 0 };
    }
    
    try {
      const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
      const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024); // MB
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
      
      return { used, total, percentage };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Check memory usage and emit warnings if needed
   */
  checkMemory() {
    const memory = this.getMemoryUsage();
    
    if (memory.percentage > this.config.memoryWarningThreshold) {
      this._emitPerformanceWarning({
        type: 'high_memory',
        value: memory.percentage,
        threshold: this.config.memoryWarningThreshold,
        severity: 'medium'
      });
    }
    
    // Record memory history
    const timestamp = this.hasPerformanceAPI ? performance.now() : Date.now();
    this.memoryHistory.push({ ...memory, timestamp });
    
    if (this.memoryHistory.length > this.config.historyLimit) {
      this.memoryHistory.shift();
    }
  }

  // ===============================
  // PERFORMANCE METRICS
  // ===============================

  /**
   * Get comprehensive performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const currentTime = this.hasPerformanceAPI ? performance.now() : Date.now();
    const frameTime = this.lastFrameTime > 0 ? currentTime - this.lastFrameTime : 0;
    
    return {
      fps: this.getFPS(),
      averageFPS: this.getAverageFPS(),
      frameCount: this.frameCount,
      frameTime,
      memory: this.getMemoryUsage(),
      uptime: this.getUptime(),
      performanceScore: this.getPerformanceScore()
    };
  }

  /**
   * Calculate performance score (0-100)
   * @returns {number} Performance score
   */
  getPerformanceScore() {
    const avgFPS = this.getAverageFPS();
    const memory = this.getMemoryUsage();
    
    if (avgFPS === 0) return 0;
    
    // FPS score (0-80 points)
    const fpsScore = Math.min((avgFPS / this.config.fpsTargetMax) * 80, 80);
    
    // Memory score (0-20 points)
    const memoryScore = Math.max(20 - (memory.percentage / 5), 0);
    
    return Math.round(fpsScore + memoryScore);
  }

  /**
   * Get monitoring start time
   * @returns {number} Start timestamp
   */
  getStartTime() {
    return this.startTime;
  }

  /**
   * Get monitoring uptime in milliseconds
   * @returns {number} Uptime in ms
   */
  getUptime() {
    if (!this.isRunning || this.startTime === 0) return 0;
    
    const currentTime = this.hasPerformanceAPI ? performance.now() : Date.now();
    return currentTime - this.startTime;
  }

  // ===============================
  // MOBILE & DEVICE DETECTION
  // ===============================

  /**
   * Detect if running on mobile device
   * @returns {boolean} True if mobile device
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Get device performance capabilities
   * @returns {Object} Device capabilities
   */
  getDeviceCapabilities() {
    return {
      cores: navigator.hardwareConcurrency || 1,
      memory: navigator.deviceMemory || 'unknown',
      platform: navigator.platform || 'unknown',
      isMobile: this.isMobileDevice(),
      hasPerformanceAPI: this.hasPerformanceAPI
    };
  }

  /**
   * Apply mobile optimizations
   * @private
   */
  _applyMobileOptimizations() {
    this.config.fpsTargetMax = 30; // Lower FPS target for mobile
    this.config.checkInterval = 2000; // Less frequent checks
    this.config.historyLimit = 50; // Smaller history
  }

  /**
   * Auto-adjust settings based on device capabilities
   * @private
   */
  _autoAdjustSettings() {
    const capabilities = this.getDeviceCapabilities();
    
    // Adjust for low-end devices
    if (capabilities.cores <= 2) {
      this.config.checkInterval = 3000;
      this.config.historyLimit = 30;
    }
    
    // Adjust for mobile
    if (capabilities.isMobile) {
      this._applyMobileOptimizations();
    }
  }

  // ===============================
  // EVENT SYSTEM
  // ===============================

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (typeof callback !== 'function') return;
    
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this.eventListeners[event]) return;
    
    const index = this.eventListeners[event].indexOf(callback);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.warn('PerformanceMonitor: Error in event callback:', error);
      }
    });
  }

  /**
   * Set performance warning callback
   * @param {Function} callback - Warning callback
   */
  onPerformanceWarning(callback) {
    if (typeof callback === 'function') {
      this.performanceWarningCallback = callback;
    }
  }

  /**
   * Check for performance warnings
   * @param {number} fps - Current FPS
   * @private
   */
  _checkPerformanceWarnings(fps) {
    if (fps < this.config.warningThreshold) {
      const severity = fps < 15 ? 'high' : 'medium';
      
      this._emitPerformanceWarning({
        type: 'low_fps',
        value: fps,
        threshold: this.config.warningThreshold,
        severity
      });
    }
  }

  /**
   * Emit performance warning
   * @param {Object} warning - Warning data
   * @private
   */
  _emitPerformanceWarning(warning) {
    if (this.performanceWarningCallback) {
      try {
        this.performanceWarningCallback(warning);
      } catch (error) {
        console.warn('PerformanceMonitor: Error in warning callback:', error);
      }
    }
    
    this._emit('performance_warning', warning);
  }

  // ===============================
  // REAL-TIME MONITORING
  // ===============================

  /**
   * Start real-time monitoring with callback
   * @param {Function} callback - Update callback
   * @param {number} interval - Update interval in ms
   */
  startRealTimeMonitoring(callback, interval = 1000) {
    if (typeof callback !== 'function') return;
    
    this.isRealtimeMonitoring = true;
    
    const intervalId = setInterval(() => {
      if (!this.isRealtimeMonitoring) {
        clearInterval(intervalId);
        return;
      }
      
      this.checkMemory();
      const metrics = this.getMetrics();
      
      try {
        callback(metrics);
      } catch (error) {
        console.warn('PerformanceMonitor: Error in real-time callback:', error);
      }
    }, interval);
    
    this._intervals.push(intervalId);
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    this.isRealtimeMonitoring = false;
    // Clear intervals when stopping
    this._clearAllIntervals();
  }

  /**
   * Clear all intervals
   * @private
   */
  _clearAllIntervals() {
    this._intervals.forEach(intervalId => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
    this._intervals = [];
  }

  /**
   * Clear all timeouts
   * @private
   */
  _clearAllTimeouts() {
    this._timeouts.forEach(timeoutId => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
    this._timeouts = [];
  }

  // ===============================
  // OPTIMIZATION SUGGESTIONS
  // ===============================

  /**
   * Get performance optimization suggestions
   * @returns {Array} Array of suggestion strings
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    const avgFPS = this.getAverageFPS();
    const memory = this.getMemoryUsage();
    
    // FPS-based suggestions
    if (avgFPS < 30 && avgFPS > 0) {
      suggestions.push('Consider reducing visual effects');
      suggestions.push('Lower rendering quality');
      suggestions.push('Reduce particle count');
    }
    
    if (avgFPS < 20 && avgFPS > 0) {
      suggestions.push('Switch to lower quality assets');
      suggestions.push('Reduce animation complexity');
    }
    
    // Memory-based suggestions
    if (memory.percentage > 80) {
      suggestions.push('Reduce object pooling');
      suggestions.push('Clear unused assets');
      suggestions.push('Optimize sprite sheets');
    }
    
    if (memory.percentage > 90) {
      suggestions.push('Force garbage collection');
      suggestions.push('Reload game to clear memory');
    }
    
    return suggestions;
  }

  // ===============================
  // DATA EXPORT & REPORTING
  // ===============================

  /**
   * Get comprehensive performance report
   * @returns {Object} Performance report
   */
  getReport() {
    return {
      fps: {
        current: this.getFPS(),
        average: this.getAverageFPS(),
        history: this.getFPSHistory()
      },
      memory: {
        current: this.getMemoryUsage(),
        history: this.memoryHistory
      },
      uptime: this.getUptime(),
      frameCount: this.frameCount,
      performanceScore: this.getPerformanceScore(),
      deviceCapabilities: this.getDeviceCapabilities(),
      suggestions: this.getOptimizationSuggestions()
    };
  }

  /**
   * Export performance data as CSV
   * @returns {string} CSV formatted data
   */
  exportCSV() {
    let csv = 'timestamp,fps,memory\n';
    
    this.fpsHistory.forEach(entry => {
      const memoryEntry = this.memoryHistory.find(m => 
        Math.abs(m.timestamp - entry.timestamp) < 1000
      );
      const memory = memoryEntry ? memoryEntry.percentage : 0;
      
      csv += `${entry.timestamp},${entry.fps},${memory}\n`;
    });
    
    return csv;
  }

  /**
   * Clear all performance data
   */
  clear() {
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.frameCount = 0;
    this.startTime = this.hasPerformanceAPI ? performance.now() : Date.now();
  }

  // ===============================
  // CLEANUP
  // ===============================

  /**
   * Destroy monitor and cleanup resources
   */
  destroy() {
    this.stop();
    this.stopRealTimeMonitoring();
    
    // Clear all intervals and timeouts
    this._clearAllIntervals();
    this._clearAllTimeouts();
    
    // Clear event listeners
    this.eventListeners = {};
    this.performanceWarningCallback = null;
    
    // Clear data
    this.clear();
  }

  // ===============================
  // GETTERS FOR TESTS
  // ===============================

  get fpsTargetMax() { return this.config.fpsTargetMax; }
  get warningThreshold() { return this.config.warningThreshold; }
  get memoryWarningThreshold() { return this.config.memoryWarningThreshold; }
  get checkInterval() { return this.config.checkInterval; }
} 