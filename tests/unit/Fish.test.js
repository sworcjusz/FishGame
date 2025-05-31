/**
 * Fish Test Suite
 * Mobile-First Fish Game Entity
 * Test-First Development: Tests written BEFORE implementation
 */

import { Fish } from '../../src/game/Fish.js';
import { MathUtils } from '../../src/utils/MathUtils.js';

// Mock Canvas API
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    clearRect: jest.fn()
  }))
};

// Mock Image
class MockImage {
  constructor() {
    this.width = 64;
    this.height = 64;
    this.complete = true;
  }
}

global.Image = MockImage;

describe('Fish', () => {
  let fish;
  let mockSpriteLoader;
  let mockCanvas2D;

  beforeEach(() => {
    mockCanvas2D = mockCanvas.getContext('2d');
    
    mockSpriteLoader = {
      loadImage: jest.fn().mockResolvedValue(new MockImage()),
      isInCache: jest.fn().mockReturnValue(true),
      getAssetInfo: jest.fn().mockReturnValue({
        size: 4096,
        loadTime: 100
      })
    };

    fish = new Fish({
      x: 100,
      y: 200,
      spriteLoader: mockSpriteLoader
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (fish) {
      fish.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default properties', () => {
      expect(fish.x).toBe(100);
      expect(fish.y).toBe(200);
      expect(fish.width).toBe(32);
      expect(fish.height).toBe(32);
      expect(fish.scale).toBe(1);
      expect(fish.rotation).toBe(0);
      expect(fish.isActive).toBe(true);
      expect(fish.isCaught).toBe(false);
    });

    it('should initialize with custom properties', () => {
      const customFish = new Fish({
        x: 50,
        y: 75,
        width: 48,
        height: 48,
        speed: 3,
        scale: 1.5,
        spriteSheet: 'custom-fish.png',
        spriteLoader: mockSpriteLoader
      });

      expect(customFish.x).toBe(50);
      expect(customFish.y).toBe(75);
      expect(customFish.width).toBe(48);
      expect(customFish.height).toBe(48);
      expect(customFish.speed).toBe(3);
      expect(customFish.scale).toBe(1.5);
      expect(customFish.spriteSheet).toBe('custom-fish.png');
      
      customFish.destroy();
    });

    it('should set up animation system', () => {
      expect(fish.currentFrame).toBe(0);
      expect(fish.frameCount).toBeGreaterThan(0);
      expect(fish.animationSpeed).toBeGreaterThan(0);
      expect(fish.lastFrameTime).toBe(0);
    });

    it('should initialize movement system', () => {
      expect(fish.velocity).toEqual({ x: expect.any(Number), y: expect.any(Number) });
      expect(fish.direction).toBeGreaterThanOrEqual(0);
      expect(fish.direction).toBeLessThan(2 * Math.PI);
      expect(fish.bounds).toEqual({
        left: expect.any(Number),
        right: expect.any(Number),
        top: expect.any(Number),
        bottom: expect.any(Number)
      });
    });
  });

  describe('Sprite Management', () => {
    it('should load sprite sheet on initialization', async () => {
      await fish.loadSprites();
      
      expect(mockSpriteLoader.loadImage).toHaveBeenCalledWith(
        expect.stringContaining('.png')
      );
      expect(fish.spriteLoaded).toBe(true);
    });

    it('should handle sprite loading errors gracefully', async () => {
      mockSpriteLoader.loadImage.mockRejectedValue(new Error('Failed to load'));
      
      await expect(fish.loadSprites()).rejects.toThrow('Failed to load');
      expect(fish.spriteLoaded).toBe(false);
    });

    it('should use fallback sprite if main sprite fails', async () => {
      mockSpriteLoader.loadImage
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce(new MockImage());
      
      await fish.loadSprites();
      
      expect(mockSpriteLoader.loadImage).toHaveBeenCalledTimes(2);
      expect(fish.spriteLoaded).toBe(true);
    });

    it('should get sprite frame coordinates', () => {
      const frameCoords = fish.getSpriteFrame(2);
      
      expect(frameCoords).toHaveProperty('x');
      expect(frameCoords).toHaveProperty('y');
      expect(frameCoords).toHaveProperty('width');
      expect(frameCoords).toHaveProperty('height');
      expect(frameCoords.x).toBeGreaterThanOrEqual(0);
      expect(frameCoords.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid frame numbers', () => {
      const invalidFrame = fish.getSpriteFrame(-1);
      expect(invalidFrame).toEqual(fish.getSpriteFrame(0));
      
      const overFrame = fish.getSpriteFrame(999);
      expect(overFrame).toEqual(fish.getSpriteFrame(fish.frameCount - 1));
    });
  });

  describe('Animation System', () => {
    it('should advance animation frames over time', () => {
      const initialFrame = fish.currentFrame;
      
      // Advance time beyond animation speed threshold
      fish.update(fish.animationSpeed + 10);
      
      expect(fish.currentFrame).not.toBe(initialFrame);
    });

    it('should loop animation frames', () => {
      fish.currentFrame = fish.frameCount - 1;
      
      fish.update(fish.animationSpeed + 10);
      
      expect(fish.currentFrame).toBe(0);
    });

    it('should respect animation speed', () => {
      const initialFrame = fish.currentFrame;
      
      // Advance time less than animation speed
      fish.update(fish.animationSpeed - 10);
      
      expect(fish.currentFrame).toBe(initialFrame);
    });

    it('should allow custom animation speed', () => {
      fish.setAnimationSpeed(500); // Slower animation
      expect(fish.animationSpeed).toBe(500);
      
      const initialFrame = fish.currentFrame;
      fish.update(300); // Less than 500ms
      expect(fish.currentFrame).toBe(initialFrame);
    });

    it('should pause and resume animation', () => {
      fish.pauseAnimation();
      expect(fish.animationPaused).toBe(true);
      
      const initialFrame = fish.currentFrame;
      fish.update(fish.animationSpeed + 100);
      expect(fish.currentFrame).toBe(initialFrame);
      
      fish.resumeAnimation();
      expect(fish.animationPaused).toBe(false);
      
      fish.update(fish.animationSpeed + 100);
      expect(fish.currentFrame).not.toBe(initialFrame);
    });
  });

  describe('Movement System', () => {
    it('should update position based on velocity', () => {
      const initialX = fish.x;
      const initialY = fish.y;
      
      fish.velocity = { x: 2, y: -1 };
      fish.update(16.67); // ~60fps
      
      expect(fish.x).toBeCloseTo(initialX + 2, 1);
      expect(fish.y).toBeCloseTo(initialY - 1, 1);
    });

    it('should respect bounds constraints', () => {
      fish.x = fish.bounds.right + 50; // Outside bounds
      fish.velocity = { x: 1, y: 0 };
      
      fish.update(16.67);
      
      expect(fish.x).toBeLessThanOrEqual(fish.bounds.right);
      expect(fish.velocity.x).toBeLessThan(0); // Should reverse direction
    });

    it('should handle vertical bounds', () => {
      fish.y = fish.bounds.bottom + 50; // Below bounds
      fish.velocity = { x: 0, y: 1 };
      
      fish.update(16.67);
      
      expect(fish.y).toBeLessThanOrEqual(fish.bounds.bottom);
      expect(fish.velocity.y).toBeLessThan(0); // Should reverse direction
    });

    it('should update rotation based on movement direction', () => {
      fish.velocity = { x: 1, y: 0 }; // Moving right
      fish.update(16.67);
      
      expect(fish.rotation).toBeCloseTo(0, 2);
      
      fish.velocity = { x: 0, y: 1 }; // Moving down
      fish.update(16.67);
      
      expect(fish.rotation).toBeCloseTo(Math.PI / 2, 2);
    });

    it('should implement smooth movement patterns', () => {
      const initialDirection = fish.direction;
      
      // Update multiple times
      for (let i = 0; i < 10; i++) {
        fish.update(16.67);
      }
      
      // Direction should change smoothly, not drastically
      const directionChange = Math.abs(fish.direction - initialDirection);
      expect(directionChange).toBeLessThan(Math.PI); // Less than 180 degrees
    });

    it('should allow manual position setting', () => {
      fish.setPosition(300, 400);
      
      expect(fish.x).toBe(300);
      expect(fish.y).toBe(400);
    });

    it('should allow velocity modification', () => {
      fish.setVelocity(5, -2);
      
      expect(fish.velocity.x).toBe(5);
      expect(fish.velocity.y).toBe(-2);
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision with point', () => {
      const collision = fish.checkCollision({ x: fish.x, y: fish.y });
      expect(collision).toBe(true);
      
      const noCollision = fish.checkCollision({ 
        x: fish.x + fish.width + 10, 
        y: fish.y + fish.height + 10 
      });
      expect(noCollision).toBe(false);
    });

    it('should detect collision with rectangle', () => {
      const rect = {
        x: fish.x - 5,
        y: fish.y - 5,
        width: fish.width + 10,
        height: fish.height + 10
      };
      
      const collision = fish.checkCollision(rect);
      expect(collision).toBe(true);
    });

    it('should detect collision with circle', () => {
      const circle = {
        x: fish.x + fish.width / 2,
        y: fish.y + fish.height / 2,
        radius: fish.width / 2 + 5
      };
      
      const collision = fish.checkCollision(circle);
      expect(collision).toBe(true);
    });

    it('should provide accurate bounding box', () => {
      const bounds = fish.getBounds();
      
      expect(bounds.left).toBeCloseTo(fish.x, 1);
      expect(bounds.top).toBeCloseTo(fish.y, 1);
      expect(bounds.right).toBeCloseTo(fish.x + fish.width, 1);
      expect(bounds.bottom).toBeCloseTo(fish.y + fish.height, 1);
    });

    it('should account for scale in collision detection', () => {
      fish.scale = 2;
      const bounds = fish.getBounds();
      
      expect(bounds.right - bounds.left).toBeCloseTo(fish.width * 2, 1);
      expect(bounds.bottom - bounds.top).toBeCloseTo(fish.height * 2, 1);
    });
  });

  describe('Game Mechanics', () => {
    it('should handle being caught', () => {
      expect(fish.isCaught).toBe(false);
      
      fish.catch();
      
      expect(fish.isCaught).toBe(true);
      expect(fish.isActive).toBe(false);
    });

    it('should handle escape mechanics', () => {
      fish.catch();
      expect(fish.isCaught).toBe(true);
      
      fish.escape();
      
      expect(fish.isCaught).toBe(false);
      expect(fish.isActive).toBe(true);
    });

    it('should calculate score value based on size and rarity', () => {
      const score = fish.getScore();
      
      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
    });

    it('should handle different fish types', () => {
      const rareFish = new Fish({
        x: 0,
        y: 0,
        fishType: 'rare',
        spriteLoader: mockSpriteLoader
      });
      
      expect(rareFish.fishType).toBe('rare');
      expect(rareFish.getScore()).toBeGreaterThan(fish.getScore());
      
      rareFish.destroy();
    });

    it('should implement fish behavior patterns', () => {
      fish.setBehavior('aggressive');
      expect(fish.behavior).toBe('aggressive');
      
      const initialSpeed = fish.speed;
      fish.update(16.67);
      
      // Aggressive fish should move faster
      expect(Math.abs(fish.velocity.x) + Math.abs(fish.velocity.y)).toBeGreaterThan(initialSpeed);
    });
  });

  describe('Rendering', () => {
    it('should render to canvas context', () => {
      fish.spriteLoaded = true;
      fish.sprite = new MockImage();
      
      fish.render(mockCanvas2D);
      
      expect(mockCanvas2D.save).toHaveBeenCalled();
      expect(mockCanvas2D.translate).toHaveBeenCalledWith(
        fish.x + fish.width / 2,
        fish.y + fish.height / 2
      );
      expect(mockCanvas2D.drawImage).toHaveBeenCalled();
      expect(mockCanvas2D.restore).toHaveBeenCalled();
    });

    it('should handle rendering when sprite not loaded', () => {
      fish.spriteLoaded = false;
      
      expect(() => fish.render(mockCanvas2D)).not.toThrow();
      expect(mockCanvas2D.drawImage).not.toHaveBeenCalled();
    });

    it('should apply transformations correctly', () => {
      fish.scale = 1.5;
      fish.rotation = Math.PI / 4;
      fish.spriteLoaded = true;
      fish.sprite = new MockImage();
      
      fish.render(mockCanvas2D);
      
      expect(mockCanvas2D.scale).toHaveBeenCalledWith(1.5, 1.5);
      expect(mockCanvas2D.rotate).toHaveBeenCalledWith(Math.PI / 4);
    });

    it('should render debug information when enabled', () => {
      fish.debugMode = true;
      fish.render(mockCanvas2D);
      
      // Should render bounding box and other debug info
      expect(mockCanvas2D.drawImage).toHaveBeenCalled();
    });

    it('should handle transparency and effects', () => {
      fish.opacity = 0.5;
      fish.spriteLoaded = true;
      fish.sprite = new MockImage();
      
      fish.render(mockCanvas2D);
      
      expect(mockCanvas2D.save).toHaveBeenCalled();
      expect(mockCanvas2D.restore).toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    it('should implement object pooling awareness', () => {
      const poolId = fish.getPoolId();
      expect(typeof poolId).toBe('string');
      
      fish.reset();
      expect(fish.isActive).toBe(false);
      expect(fish.isCaught).toBe(false);
    });

    it('should skip rendering when off-screen', () => {
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      
      fish.x = -100; // Off-screen
      const shouldRender = fish.isInViewport(viewport);
      
      expect(shouldRender).toBe(false);
    });

    it('should optimize updates when far from camera', () => {
      const camera = { x: 0, y: 0 };
      
      fish.x = 2000; // Very far
      const distance = MathUtils.distance(fish, camera);
      
      fish.setLOD(distance);
      expect(fish.lodLevel).toBeGreaterThan(0); // Should use lower LOD
    });

    it('should batch sprite frame calculations', () => {
      const frames = [];
      for (let i = 0; i < 5; i++) {
        frames.push(fish.getSpriteFrame(i));
      }
      
      expect(frames).toHaveLength(5);
      expect(frames[0]).not.toEqual(frames[1]);
    });
  });

  describe('Mobile Optimizations', () => {
    it('should adapt to mobile screen sizes', () => {
      const mobileViewport = { width: 375, height: 667 };
      
      fish.adaptToViewport(mobileViewport);
      
      expect(fish.scale).toBeLessThanOrEqual(1); // Should scale down for mobile
    });

    it('should reduce animation complexity on mobile', () => {
      fish.setMobileMode(true);
      
      expect(fish.animationSpeed).toBeGreaterThan(100); // Slower animation for performance
      expect(fish.lodLevel).toBeGreaterThan(0); // Use lower detail
    });

    it('should handle touch interactions', () => {
      const touch = { x: fish.x + 10, y: fish.y + 10 };
      
      const touched = fish.handleTouch(touch);
      expect(touched).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on destroy', () => {
      fish.destroy();
      
      expect(fish.sprite).toBeNull();
      expect(fish.isActive).toBe(false);
      expect(fish.destroyed).toBe(true);
    });

    it('should prevent operations after destruction', () => {
      fish.destroy();
      
      expect(() => fish.update(16.67)).not.toThrow();
      expect(() => fish.render(mockCanvas2D)).not.toThrow();
    });

    it('should release event listeners', () => {
      const callback = jest.fn();
      fish.on('caught', callback);
      
      fish.destroy();
      fish.emit('caught');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Advanced Features', () => {
    it('should support fish schooling behavior', () => {
      const otherFish = new Fish({
        x: fish.x + 50,
        y: fish.y + 50,
        spriteLoader: mockSpriteLoader
      });
      
      fish.addToSchool([otherFish]);
      fish.update(16.67);
      
      // Fish should influence each other's movement
      expect(fish.schoolmates.length).toBe(1);
      
      otherFish.destroy();
    });

    it('should implement predator avoidance', () => {
      const predator = { x: fish.x + 20, y: fish.y + 20, radius: 50 };
      
      fish.addThreat(predator);
      const initialDirection = fish.direction;
      
      fish.update(16.67);
      
      // Fish should move away from predator
      expect(fish.direction).not.toBe(initialDirection);
    });

    it('should support custom fish AI', () => {
      const customAI = {
        update: jest.fn(),
        getNextAction: jest.fn().mockReturnValue('swim_left')
      };
      
      fish.setAI(customAI);
      fish.update(16.67);
      
      expect(customAI.update).toHaveBeenCalled();
    });
  });
}); 