/**
 * SpriteLoader Test Suite
 * Mobile-First Fish Game Asset Loading
 * Test-First Development: Tests written BEFORE implementation
 */

import { SpriteLoader } from '../../src/utils/SpriteLoader.js';

// Mock Image constructor
class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 100;
    this.height = 100;
    this.complete = false;
    this.naturalWidth = 100;
    this.naturalHeight = 100;
  }

  addEventListener(event, callback) {
    if (event === 'load') this.onload = callback;
    if (event === 'error') this.onerror = callback;
  }

  removeEventListener() {
    // Mock implementation
  }

  // Simulate loading
  _load() {
    this.complete = true;
    if (this.onload) {
      setTimeout(() => this.onload(), 0);
    }
  }

  // Simulate error
  _error() {
    if (this.onerror) {
      setTimeout(() => this.onerror(new Error('Failed to load image')), 0);
    }
  }
}

global.Image = MockImage;

describe('SpriteLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new SpriteLoader();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (loader) {
      loader.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(loader.cache).toEqual({});
      expect(loader.isLoading).toBe(false);
      expect(loader.loadedCount).toBe(0);
      expect(loader.totalCount).toBe(0);
      expect(loader.enableCaching).toBe(true);
    });

    it('should initialize with custom settings', () => {
      const customLoader = new SpriteLoader({
        enableCaching: false,
        maxCacheSize: 50,
        compressionQuality: 0.8,
        retryAttempts: 5
      });

      expect(customLoader.enableCaching).toBe(false);
      expect(customLoader.maxCacheSize).toBe(50);
      expect(customLoader.compressionQuality).toBe(0.8);
      expect(customLoader.retryAttempts).toBe(5);
      
      customLoader.destroy();
    });

    it('should detect WebP support automatically', () => {
      expect(typeof loader.supportsWebP).toBe('boolean');
    });
  });

  describe('Single Asset Loading', () => {
    it('should load single image successfully', async () => {
      const promise = loader.loadImage('test.png');
      
      // Simulate image loading
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);

      const image = await promise;
      
      expect(image).toBeDefined();
      expect(image.src).toContain('test.png');
      expect(loader.isInCache('test.png')).toBe(true);
    });

    it('should handle image loading errors', async () => {
      const promise = loader.loadImage('invalid.png');
      
      // Simulate image error
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._error) {
          lastImage._error();
        }
      }, 10);

      await expect(promise).rejects.toThrow();
    });

    it('should return cached image if already loaded', async () => {
      // Load image first time
      const promise1 = loader.loadImage('cached.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      
      const image1 = await promise1;
      
      // Load same image second time
      const image2 = await loader.loadImage('cached.png');
      
      expect(image1).toBe(image2); // Should be same instance from cache
    });

    it('should prefer WebP format when supported', async () => {
      loader.supportsWebP = true;
      
      const promise = loader.loadImage('test.png');
      
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);

      await promise;
      
      // Should attempt to load WebP version first
      expect(loader.getLoadAttempts('test.png')).toBeGreaterThan(0);
    });
  });

  describe('Batch Loading', () => {
    it('should load multiple images in batch', async () => {
      const assets = [
        { name: 'fish1', src: 'fish1.png' },
        { name: 'fish2', src: 'fish2.png' },
        { name: 'background', src: 'bg.jpg' }
      ];

      const promise = loader.loadBatch(assets);
      
      // Simulate all images loading
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        mockImages.forEach(img => {
          if (img._load) img._load();
        });
      }, 10);

      const results = await promise;
      
      expect(results).toHaveProperty('fish1');
      expect(results).toHaveProperty('fish2');
      expect(results).toHaveProperty('background');
      expect(Object.keys(results)).toHaveLength(3);
    });

    it('should track loading progress during batch loading', async () => {
      const progressCallback = jest.fn();
      
      const assets = [
        { name: 'asset1', src: 'asset1.png' },
        { name: 'asset2', src: 'asset2.png' }
      ];

      const promise = loader.loadBatch(assets, progressCallback);
      
      // Simulate progressive loading
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        if (mockImages[0] && mockImages[0]._load) {
          mockImages[0]._load();
        }
      }, 10);
      
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        if (mockImages[1] && mockImages[1]._load) {
          mockImages[1]._load();
        }
      }, 20);

      await promise;
      
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          loaded: expect.any(Number),
          total: 2,
          percentage: expect.any(Number)
        })
      );
    });

    it('should handle partial failures in batch loading', async () => {
      const assets = [
        { name: 'good', src: 'good.png' },
        { name: 'bad', src: 'bad.png' }
      ];

      const promise = loader.loadBatch(assets, null, { failOnError: false });
      
      // Simulate mixed results
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        if (mockImages[0] && mockImages[0]._load) {
          mockImages[0]._load();
        }
        if (mockImages[1] && mockImages[1]._error) {
          mockImages[1]._error();
        }
      }, 10);

      const results = await promise;
      
      expect(results).toHaveProperty('good');
      expect(results.good).toBeDefined();
      expect(results.bad).toBeNull(); // Failed asset should be null
    });
  });

  describe('Caching System', () => {
    it('should cache loaded images', async () => {
      const promise = loader.loadImage('cached.png');
      
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);

      await promise;
      
      expect(loader.isInCache('cached.png')).toBe(true);
      expect(loader.getCacheSize()).toBe(1);
    });

    it('should respect cache size limits', async () => {
      const smallCacheLoader = new SpriteLoader({ maxCacheSize: 2 });
      
      // Load 3 images
      for (let i = 1; i <= 3; i++) {
        const promise = smallCacheLoader.loadImage(`image${i}.png`);
        setTimeout(() => {
          const mockImages = document.querySelectorAll('img');
          const lastImage = mockImages[mockImages.length - 1];
          if (lastImage && lastImage._load) {
            lastImage._load();
          }
        }, 10);
        await promise;
      }
      
      expect(smallCacheLoader.getCacheSize()).toBeLessThanOrEqual(2);
      
      smallCacheLoader.destroy();
    });

    it('should clear cache when requested', async () => {
      // Load an image
      const promise = loader.loadImage('test.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      await promise;
      
      expect(loader.getCacheSize()).toBe(1);
      
      loader.clearCache();
      expect(loader.getCacheSize()).toBe(0);
    });

    it('should provide cache statistics', async () => {
      const promise = loader.loadImage('stats.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      await promise;
      
      const stats = loader.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.size).toBe(1);
    });
  });

  describe('Mobile Optimizations', () => {
    it('should detect mobile device and apply optimizations', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X)',
        configurable: true
      });

      const mobileLoader = new SpriteLoader({ autoOptimize: true });
      
      expect(mobileLoader.isMobile).toBe(true);
      expect(mobileLoader.compressionQuality).toBeLessThan(1); // Should use compression on mobile
      
      mobileLoader.destroy();
    });

    it('should use appropriate image sizes for mobile', async () => {
      const mobileLoader = new SpriteLoader({ 
        autoOptimize: true,
        mobileScale: 0.5 
      });
      
      const promise = mobileLoader.loadImage('large.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      
      await promise;
      
      // Should attempt to load mobile-optimized version
      expect(mobileLoader.getLoadedAssets()).toContain('large.png');
      
      mobileLoader.destroy();
    });

    it('should implement lazy loading for mobile', () => {
      const mobileLoader = new SpriteLoader({ 
        enableLazyLoading: true 
      });
      
      expect(mobileLoader.enableLazyLoading).toBe(true);
      
      mobileLoader.destroy();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed loads', async () => {
      const retryLoader = new SpriteLoader({ retryAttempts: 2 });
      
      let attemptCount = 0;
      const originalImage = global.Image;
      global.Image = class extends MockImage {
        set src(value) {
          this._src = value;
          attemptCount++;
          // Fail first attempt, succeed second
          if (attemptCount === 1) {
            setTimeout(() => this._error(), 0);
          } else {
            setTimeout(() => this._load(), 0);
          }
        }
        get src() { return this._src; }
      };

      const image = await retryLoader.loadImage('retry.png');
      
      expect(image).toBeDefined();
      expect(attemptCount).toBe(2); // Should have retried once
      
      global.Image = originalImage;
      retryLoader.destroy();
    });

    it('should provide fallback images for failures', async () => {
      const promise = loader.loadImage('missing.png', 'fallback.png');
      
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        // First image fails
        if (mockImages[0] && mockImages[0]._error) {
          mockImages[0]._error();
        }
        // Fallback image loads
        setTimeout(() => {
          if (mockImages[1] && mockImages[1]._load) {
            mockImages[1]._load();
          }
        }, 10);
      }, 10);

      const image = await promise;
      
      expect(image).toBeDefined();
      expect(image.src).toContain('fallback.png');
    });

    it('should handle network errors gracefully', async () => {
      const networkLoader = new SpriteLoader({ 
        timeout: 100,
        retryAttempts: 1 
      });
      
      const promise = networkLoader.loadImage('timeout.png');
      
      // Don't trigger load or error - simulate timeout
      
      await expect(promise).rejects.toThrow();
      
      networkLoader.destroy();
    });
  });

  describe('Loading States and Events', () => {
    it('should track loading state correctly', () => {
      expect(loader.isLoading).toBe(false);
      
      const promise = loader.loadImage('state.png');
      expect(loader.isLoading).toBe(true);
      
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      
      return promise.then(() => {
        expect(loader.isLoading).toBe(false);
      });
    });

    it('should emit loading events', async () => {
      const loadStartCallback = jest.fn();
      const loadCompleteCallback = jest.fn();
      
      loader.on('loadStart', loadStartCallback);
      loader.on('loadComplete', loadCompleteCallback);
      
      const promise = loader.loadImage('events.png');
      
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);

      await promise;
      
      expect(loadStartCallback).toHaveBeenCalledWith('events.png');
      expect(loadCompleteCallback).toHaveBeenCalledWith('events.png', expect.any(Object));
    });

    it('should provide loading progress information', () => {
      const progress = loader.getProgress();
      
      expect(progress).toHaveProperty('loaded');
      expect(progress).toHaveProperty('total');
      expect(progress).toHaveProperty('percentage');
      expect(progress.percentage).toBe(0); // No assets loaded yet
    });
  });

  describe('Asset Management', () => {
    it('should list loaded assets', async () => {
      const promise = loader.loadImage('list.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      await promise;
      
      const assets = loader.getLoadedAssets();
      expect(assets).toContain('list.png');
    });

    it('should get asset information', async () => {
      const promise = loader.loadImage('info.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      await promise;
      
      const info = loader.getAssetInfo('info.png');
      
      expect(info).toHaveProperty('src');
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('loadTime');
      expect(info.src).toContain('info.png');
    });

    it('should unload specific assets', async () => {
      const promise = loader.loadImage('unload.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      await promise;
      
      expect(loader.isInCache('unload.png')).toBe(true);
      
      loader.unloadAsset('unload.png');
      expect(loader.isInCache('unload.png')).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track loading performance metrics', async () => {
      const promise = loader.loadImage('perf.png');
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 10);
      await promise;
      
      const metrics = loader.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('totalLoadTime');
      expect(metrics).toHaveProperty('averageLoadTime');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('failureRate');
    });

    it('should detect slow loading assets', async () => {
      const slowLoader = new SpriteLoader({ slowLoadingThreshold: 50 });
      
      const promise = slowLoader.loadImage('slow.png');
      
      // Simulate slow loading
      setTimeout(() => {
        const mockImages = document.querySelectorAll('img');
        const lastImage = mockImages[mockImages.length - 1];
        if (lastImage && lastImage._load) {
          lastImage._load();
        }
      }, 100);

      await promise;
      
      const slowAssets = slowLoader.getSlowLoadingAssets();
      expect(slowAssets).toContain('slow.png');
      
      slowLoader.destroy();
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup resources on destroy', () => {
      loader.destroy();
      
      expect(loader.cache).toEqual({});
      expect(loader.isLoading).toBe(false);
      expect(loader.loadedCount).toBe(0);
    });

    it('should cancel pending loads on destroy', () => {
      const promise = loader.loadImage('cancel.png');
      
      loader.destroy();
      
      return expect(promise).rejects.toThrow('Loader destroyed');
    });

    it('should implement memory pressure handling', () => {
      const memoryLoader = new SpriteLoader({ 
        enableMemoryPressureHandling: true 
      });
      
      // Simulate memory pressure
      memoryLoader.handleMemoryPressure();
      
      expect(memoryLoader.getCacheSize()).toBe(0); // Should clear cache
      
      memoryLoader.destroy();
    });
  });
}); 