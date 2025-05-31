/**
 * SpriteLoader - Asset Loading System for Mobile Fish Game
 * Optimized for mobile devices with caching, retry logic, and performance monitoring
 * 
 * Features:
 * - Efficient asset caching with size limits
 * - WebP format support with fallbacks
 * - Mobile device optimizations
 * - Batch loading with progress tracking
 * - Retry logic for failed loads
 * - Performance monitoring and metrics
 * - Memory pressure handling
 * - Event system for loading state
 */

export class SpriteLoader {
  constructor(options = {}) {
    // Default configuration
    const defaults = {
      enableCaching: true,
      maxCacheSize: 100,
      compressionQuality: 0.9,
      retryAttempts: 3,
      timeout: 10000,
      autoOptimize: false,
      mobileScale: 0.7,
      enableLazyLoading: false,
      slowLoadingThreshold: 1000,
      enableMemoryPressureHandling: false
    };

    this.config = { ...defaults, ...options };
    
    // Initialize properties
    this.cache = {};
    this.isLoading = false;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.eventListeners = {};
    this.loadingPromises = new Map();
    this.performanceData = {
      loadTimes: [],
      failures: 0,
      cacheHits: 0,
      slowAssets: []
    };
    this.loadAttempts = new Map();
    
    // Mobile detection and optimizations
    this.isMobile = this._detectMobile();
    if (this.config.autoOptimize && this.isMobile) {
      this._applyMobileOptimizations();
    }
    
    // WebP support detection
    this.supportsWebP = this._detectWebPSupport();
    
    // Destroyed flag for cleanup
    this.destroyed = false;
  }

  // ===============================
  // INITIALIZATION & DETECTION
  // ===============================

  /**
   * Detect mobile device
   * @returns {boolean} True if mobile device
   * @private
   */
  _detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Detect WebP support
   * @returns {boolean} True if WebP is supported
   * @private
   */
  _detectWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  }

  /**
   * Apply mobile optimizations
   * @private
   */
  _applyMobileOptimizations() {
    this.config.compressionQuality = 0.7; // Higher compression for mobile
    this.config.maxCacheSize = 50; // Smaller cache for mobile
    this.config.timeout = 15000; // Longer timeout for slower connections
  }

  // ===============================
  // SINGLE ASSET LOADING
  // ===============================

  /**
   * Load single image
   * @param {string} src - Image source URL
   * @param {string} fallbackSrc - Fallback image URL
   * @returns {Promise<HTMLImageElement>} Loaded image
   */
  async loadImage(src, fallbackSrc = null) {
    if (this.destroyed) {
      throw new Error('Loader destroyed');
    }

    // Check cache first
    if (this.config.enableCaching && this.isInCache(src)) {
      this.performanceData.cacheHits++;
      return this.cache[src].image;
    }

    // Check if already loading
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src);
    }

    const promise = this._loadImageWithRetry(src, fallbackSrc);
    this.loadingPromises.set(src, promise);
    
    try {
      const image = await promise;
      this.loadingPromises.delete(src);
      return image;
    } catch (error) {
      this.loadingPromises.delete(src);
      throw error;
    }
  }

  /**
   * Load image with retry logic
   * @param {string} src - Image source URL
   * @param {string} fallbackSrc - Fallback image URL
   * @param {number} attempt - Current attempt number
   * @returns {Promise<HTMLImageElement>} Loaded image
   * @private
   */
  async _loadImageWithRetry(src, fallbackSrc = null, attempt = 1) {
    try {
      this._emit('loadStart', src);
      this.isLoading = true;
      
      const image = await this._loadSingleImage(src);
      
      // Cache the image
      if (this.config.enableCaching) {
        this._cacheImage(src, image);
      }
      
      this.loadedCount++;
      this.isLoading = this.loadingPromises.size > 0;
      
      this._emit('loadComplete', src, image);
      return image;
      
    } catch (error) {
      // Record load attempt
      const attempts = this.loadAttempts.get(src) || 0;
      this.loadAttempts.set(src, attempts + 1);
      
      // Try fallback if available and no more retries
      if (fallbackSrc && attempt >= this.config.retryAttempts) {
        try {
          return await this._loadImageWithRetry(fallbackSrc, null, 1);
        } catch (fallbackError) {
          this.performanceData.failures++;
          this.isLoading = this.loadingPromises.size > 0;
          throw fallbackError;
        }
      }
      
      // Retry if attempts remaining
      if (attempt < this.config.retryAttempts) {
        await this._delay(attempt * 1000); // Exponential backoff
        return this._loadImageWithRetry(src, fallbackSrc, attempt + 1);
      }
      
      this.performanceData.failures++;
      this.isLoading = this.loadingPromises.size > 0;
      throw error;
    }
  }

  /**
   * Load single image (core implementation)
   * @param {string} src - Image source URL
   * @returns {Promise<HTMLImageElement>} Loaded image
   * @private
   */
  _loadSingleImage(src) {
    return new Promise((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error('Loader destroyed'));
        return;
      }

      const startTime = performance.now();
      const image = new Image();
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout loading image: ${src}`));
      }, this.config.timeout);

      image.onload = () => {
        clearTimeout(timeoutId);
        
        const loadTime = performance.now() - startTime;
        this.performanceData.loadTimes.push(loadTime);
        
        // Track slow loading assets
        if (loadTime > this.config.slowLoadingThreshold) {
          this.performanceData.slowAssets.push(src);
        }
        
        resolve(image);
      };

      image.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load image: ${src}`));
      };

      // Try WebP version first if supported
      const finalSrc = this._getOptimizedSrc(src);
      image.src = finalSrc;
    });
  }

  /**
   * Get optimized source URL
   * @param {string} src - Original source URL
   * @returns {string} Optimized source URL
   * @private
   */
  _getOptimizedSrc(src) {
    if (this.supportsWebP && src.match(/\.(png|jpg|jpeg)$/i)) {
      return src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    }
    
    if (this.isMobile && this.config.mobileScale < 1) {
      // Try to load mobile-scaled version
      const parts = src.split('.');
      if (parts.length >= 2) {
        const ext = parts.pop();
        const name = parts.join('.');
        return `${name}@${this.config.mobileScale}x.${ext}`;
      }
    }
    
    return src;
  }

  // ===============================
  // BATCH LOADING
  // ===============================

  /**
   * Load multiple assets in batch
   * @param {Array} assets - Array of asset definitions
   * @param {Function} progressCallback - Progress callback
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Object with loaded assets
   */
  async loadBatch(assets, progressCallback = null, options = {}) {
    const { failOnError = true } = options;
    
    this.totalCount = assets.length;
    this.loadedCount = 0;
    
    const results = {};
    const promises = assets.map(async (asset) => {
      try {
        const image = await this.loadImage(asset.src);
        results[asset.name] = image;
      } catch (error) {
        if (failOnError) {
          throw error;
        } else {
          results[asset.name] = null;
        }
      } finally {
        if (progressCallback) {
          const progress = this.getProgress();
          progressCallback(progress);
        }
      }
    });

    await Promise.all(promises);
    return results;
  }

  // ===============================
  // CACHING SYSTEM
  // ===============================

  /**
   * Cache image
   * @param {string} src - Image source URL
   * @param {HTMLImageElement} image - Image element
   * @private
   */
  _cacheImage(src, image) {
    // Enforce cache size limit
    if (Object.keys(this.cache).length >= this.config.maxCacheSize) {
      this._evictOldestCacheEntry();
    }
    
    this.cache[src] = {
      image,
      timestamp: Date.now(),
      size: this._estimateImageSize(image)
    };
  }

  /**
   * Check if image is in cache
   * @param {string} src - Image source URL
   * @returns {boolean} True if in cache
   */
  isInCache(src) {
    return this.config.enableCaching && this.cache.hasOwnProperty(src);
  }

  /**
   * Get cache size
   * @returns {number} Number of cached items
   */
  getCacheSize() {
    return Object.keys(this.cache).length;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {};
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const totalHits = this.performanceData.cacheHits;
    const totalRequests = this.performanceData.loadTimes.length + totalHits;
    
    return {
      size: this.getCacheSize(),
      maxSize: this.config.maxCacheSize,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
    };
  }

  /**
   * Evict oldest cache entry
   * @private
   */
  _evictOldestCacheEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      delete this.cache[oldestKey];
    }
  }

  /**
   * Estimate image size in bytes
   * @param {HTMLImageElement} image - Image element
   * @returns {number} Estimated size in bytes
   * @private
   */
  _estimateImageSize(image) {
    return image.width * image.height * 4; // RGBA
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
   * @param {...*} args - Event arguments
   * @private
   */
  _emit(event, ...args) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.warn('SpriteLoader: Error in event callback:', error);
      }
    });
  }

  // ===============================
  // PROGRESS & METRICS
  // ===============================

  /**
   * Get loading progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      loaded: this.loadedCount,
      total: this.totalCount,
      percentage: this.totalCount > 0 ? (this.loadedCount / this.totalCount) * 100 : 0
    };
  }

  /**
   * Get load attempts for asset
   * @param {string} src - Asset source URL
   * @returns {number} Number of load attempts
   */
  getLoadAttempts(src) {
    return this.loadAttempts.get(src) || 0;
  }

  /**
   * Get loaded assets list
   * @returns {Array} Array of loaded asset URLs
   */
  getLoadedAssets() {
    return Object.keys(this.cache);
  }

  /**
   * Get asset information
   * @param {string} src - Asset source URL
   * @returns {Object} Asset information
   */
  getAssetInfo(src) {
    if (!this.isInCache(src)) {
      return null;
    }
    
    const entry = this.cache[src];
    return {
      src,
      size: entry.size,
      loadTime: entry.loadTime || 0,
      timestamp: entry.timestamp
    };
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const loadTimes = this.performanceData.loadTimes;
    const totalRequests = loadTimes.length + this.performanceData.cacheHits;
    
    return {
      totalLoadTime: loadTimes.reduce((sum, time) => sum + time, 0),
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0,
      cacheHitRate: totalRequests > 0 ? (this.performanceData.cacheHits / totalRequests) * 100 : 0,
      failureRate: totalRequests > 0 ? (this.performanceData.failures / totalRequests) * 100 : 0
    };
  }

  /**
   * Get slow loading assets
   * @returns {Array} Array of slow loading asset URLs
   */
  getSlowLoadingAssets() {
    return [...this.performanceData.slowAssets];
  }

  // ===============================
  // ASSET MANAGEMENT
  // ===============================

  /**
   * Unload specific asset
   * @param {string} src - Asset source URL
   */
  unloadAsset(src) {
    if (this.isInCache(src)) {
      delete this.cache[src];
    }
  }

  /**
   * Handle memory pressure
   */
  handleMemoryPressure() {
    if (this.config.enableMemoryPressureHandling) {
      this.clearCache();
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Delay utility
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===============================
  // CLEANUP
  // ===============================

  /**
   * Destroy loader and cleanup resources
   */
  destroy() {
    this.destroyed = true;
    this.isLoading = false;
    
    // Cancel all pending loads
    for (const [src, promise] of this.loadingPromises) {
      promise.catch(() => {}); // Ignore errors on cancelled loads
    }
    this.loadingPromises.clear();
    
    // Clear cache
    this.clearCache();
    
    // Clear event listeners
    this.eventListeners = {};
    
    // Reset counters
    this.loadedCount = 0;
    this.totalCount = 0;
    
    // Clear performance data
    this.performanceData = {
      loadTimes: [],
      failures: 0,
      cacheHits: 0,
      slowAssets: []
    };
    
    this.loadAttempts.clear();
  }

  // ===============================
  // GETTERS FOR TESTS
  // ===============================

  get enableCaching() { return this.config.enableCaching; }
  get maxCacheSize() { return this.config.maxCacheSize; }
  get compressionQuality() { return this.config.compressionQuality; }
  get retryAttempts() { return this.config.retryAttempts; }
  get enableLazyLoading() { return this.config.enableLazyLoading; }
} 