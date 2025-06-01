/**
 * Game Test Suite
 * Mobile-First Fish Game Main Engine
 * Test-First Development: Tests written BEFORE implementation
 */

import { Game } from '../../src/game/Game.js';
import { Fish } from '../../src/game/Fish.js';
import { Player } from '../../src/game/Player.js';
import { TouchController } from '../../src/game/TouchController.js';
import { MathUtils } from '../../src/utils/MathUtils.js';

// Mock Canvas API and DOM
const mockCanvas = {
  width: 375,
  height: 667,
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    }))
  })),
  getBoundingClientRect: jest.fn(() => ({
    left: 0, top: 0, width: 375, height: 667
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  style: {}
};

global.document = {
  getElementById: jest.fn(() => mockCanvas),
  createElement: jest.fn(() => mockCanvas),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  body: {
    style: {}
  },
  visibilityState: 'visible'
};

global.window = {
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
  cancelAnimationFrame: jest.fn(),
  performance: { now: jest.fn(() => Date.now()) },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  innerWidth: 375,
  innerHeight: 667,
  devicePixelRatio: 2,
  navigator: {
    userAgent: 'Mobile'
  }
};

global.requestAnimationFrame = global.window.requestAnimationFrame;
global.cancelAnimationFrame = global.window.cancelAnimationFrame;
global.performance = global.window.performance;

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(() => '100'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// Mock timer functions
jest.useFakeTimers();

// Mock dependencies
jest.mock('../../src/game/Fish.js');
jest.mock('../../src/game/Player.js');
jest.mock('../../src/game/TouchController.js');

// Mock constructors to return objects with required methods
Fish.mockImplementation(() => ({
  isActive: true,
  x: 100,
  y: 100,
  setPosition: jest.fn(),
  update: jest.fn(),
  render: jest.fn(),
  reset: jest.fn(),
  destroy: jest.fn(),
  isInViewport: jest.fn(() => true),
  setLOD: jest.fn(),
  checkCollision: jest.fn(() => false),
  getScore: jest.fn(() => 10)
}));

Player.mockImplementation(() => ({
  x: 100,
  y: 50,
  isCasting: false,
  isReeling: false,
  update: jest.fn(),
  render: jest.fn(),
  reset: jest.fn(),
  destroy: jest.fn(),
  checkFishCollision: jest.fn(() => false),
  catchFish: jest.fn(),
  on: jest.fn(),
  _emit: jest.fn()
}));

TouchController.mockImplementation(() => ({
  isEnabled: true,
  update: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
  _emit: jest.fn()
}));

describe('Game', () => {
  let game;
  let mockCanvasContext;

  beforeEach(() => {
    mockCanvasContext = mockCanvas.getContext('2d');
    
    // Reset mocks
    Fish.mockClear();
    Player.mockClear();
    TouchController.mockClear();
    
    // Clear all timers
    jest.clearAllTimers();
    jest.clearAllMocks();
    
    game = new Game({
      canvasId: 'gameCanvas',
      width: 375,
      height: 667
    });
  });

  afterEach(() => {
    // Cleanup game instance
    if (game && !game.destroyed) {
      game.destroy();
    }
    
    // Clear all timers
    jest.clearAllTimers();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset modules
    jest.resetModules();
  });

  describe('Initialization', () => {
    it('should initialize with default properties', () => {
      expect(game.canvas).toBe(mockCanvas);
      expect(game.ctx).toBe(mockCanvasContext);
      expect(game.width).toBe(375);
      expect(game.height).toBe(667);
      expect(game.isRunning).toBe(false);
      expect(game.isPaused).toBe(false);
      expect(game.gameState).toBe('menu');
    });

    it('should initialize with custom options', () => {
      const customGame = new Game({
        canvasId: 'customCanvas',
        width: 800,
        height: 600,
        targetFPS: 30,
        maxFish: 15
      });

      expect(customGame.width).toBe(800);
      expect(customGame.height).toBe(600);
      expect(customGame.targetFPS).toBe(30);
      expect(customGame.maxFish).toBe(15);
      
      customGame.destroy();
    });

    it('should create Player instance', () => {
      expect(Player).toHaveBeenCalledWith(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      }));
      expect(game.player).toBeTruthy();
    });

    it('should create TouchController instance', () => {
      expect(TouchController).toHaveBeenCalledWith(expect.objectContaining({
        canvas: mockCanvas,
        player: game.player,
        gameState: expect.any(Object)
      }));
      expect(game.touchController).toBeTruthy();
    });

    it('should initialize game statistics', () => {
      expect(game.stats).toEqual({
        score: 0,
        fishCaught: 0,
        casts: 0,
        accuracy: 0,
        playTime: 0,
        bestScore: 100 // Mocked from localStorage
      });
    });

    it('should set up viewport for mobile', () => {
      expect(game.viewport).toEqual({
        x: 0,
        y: 0,
        width: 375,
        height: 667
      });
    });

    it('should initialize fish pool', () => {
      expect(game.fishPool).toEqual(expect.any(Array));
      expect(game.activeFish).toEqual([]);
      expect(game.maxFish).toBeGreaterThan(0);
    });
  });

  describe('Game State Management', () => {
    it('should start game correctly', () => {
      game.start();
      
      expect(game.isRunning).toBe(true);
      expect(game.gameState).toBe('playing');
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should pause game correctly', () => {
      game.start();
      game.pause();
      
      expect(game.isPaused).toBe(true);
      expect(game.gameState).toBe('paused');
    });

    it('should resume game correctly', () => {
      game.start();
      game.pause();
      game.resume();
      
      expect(game.isPaused).toBe(false);
      expect(game.gameState).toBe('playing');
    });

    it('should stop game correctly', () => {
      game.start();
      game.stop();
      
      expect(game.isRunning).toBe(false);
      expect(game.gameState).toBe('stopped');
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should restart game correctly', () => {
      game.start();
      game.stop();
      game.restart();
      
      expect(game.isRunning).toBe(true);
      expect(game.gameState).toBe('playing');
      expect(game.stats.score).toBe(0);
      expect(game.activeFish).toEqual([]);
    });

    it('should handle game over state', () => {
      game.start();
      game._gameOver();
      
      expect(game.gameState).toBe('gameOver');
      expect(game.isRunning).toBe(false);
    });

    it('should transition between states correctly', () => {
      const stateSpy = jest.spyOn(game, '_emit');
      
      game.setState('playing');
      expect(game.gameState).toBe('playing');
      expect(stateSpy).toHaveBeenCalledWith('stateChanged', 'playing', 'menu');
    });
  });

  describe('Game Loop', () => {
    it('should run game loop at target FPS', (done) => {
      game.targetFPS = 60;
      game.start();
      
      setTimeout(() => {
        expect(window.requestAnimationFrame).toHaveBeenCalled();
        expect(game.frameCount).toBeGreaterThan(0);
        done();
      }, 50);
    });

    it('should calculate delta time correctly', () => {
      const updateSpy = jest.spyOn(game, 'update');
      
      game.start();
      game._gameLoop(1000);
      game._gameLoop(1016.67); // 60fps frame
      
      expect(updateSpy).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should limit delta time for stability', () => {
      const updateSpy = jest.spyOn(game, 'update');
      
      game.start();
      game._gameLoop(1000);
      game._gameLoop(1500); // Very large delta
      
      expect(updateSpy).toHaveBeenCalledWith(expect.any(Number));
      const deltaTime = updateSpy.mock.calls[1][0];
      expect(deltaTime).toBeLessThan(100); // Clamped delta
    });

    it('should skip frames if paused', () => {
      const updateSpy = jest.spyOn(game, 'update');
      const renderSpy = jest.spyOn(game, 'render');
      
      game.start();
      game.pause();
      game._gameLoop(1000);
      
      expect(updateSpy).not.toHaveBeenCalled();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should track FPS accurately', () => {
      game.start();
      
      for (let i = 0; i < 10; i++) {
        game._gameLoop(1000 + i * 16.67);
      }
      
      expect(game.currentFPS).toBeGreaterThan(0);
    });
  });

  describe('Fish Management', () => {
    it('should spawn fish correctly', () => {
      const fishSpy = jest.spyOn(game, '_spawnFish');
      
      game.start();
      game._spawnFish();
      
      expect(fishSpy).toHaveBeenCalled();
      expect(Fish).toHaveBeenCalled();
      expect(game.activeFish.length).toBeGreaterThan(0);
    });

    it('should maintain maximum fish count', () => {
      game.maxFish = 5;
      
      for (let i = 0; i < 10; i++) {
        game._spawnFish();
      }
      
      expect(game.activeFish.length).toBeLessThanOrEqual(5);
    });

    it('should remove inactive fish', () => {
      game._spawnFish();
      const fish = game.activeFish[0];
      fish.isActive = false;
      
      game._cleanupFish();
      
      expect(game.activeFish).not.toContain(fish);
    });

    it('should use fish object pooling', () => {
      game._spawnFish();
      const fish = game.activeFish[0];
      game._returnFishToPool(fish);
      
      expect(game.fishPool).toContain(fish);
      expect(game.activeFish).not.toContain(fish);
    });

    it('should spawn fish based on difficulty', () => {
      game.difficulty = 'hard';
      game._updateDifficulty();
      
      const spawnRate = game.fishSpawnRate;
      expect(spawnRate).toBeGreaterThan(0);
    });

    it('should handle fish caught event', () => {
      const fish = { getScore: () => 10, destroy: jest.fn() };
      game._handleFishCaught({ fish, score: 10 });
      
      expect(game.stats.score).toBe(10);
      expect(game.stats.fishCaught).toBe(1);
    });

    it('should detect fish collisions with player hook', () => {
      game._spawnFish();
      const fish = game.activeFish[0];
      fish.checkCollision = jest.fn(() => true);
      
      game._checkFishCollisions();
      
      expect(fish.checkCollision).toHaveBeenCalled();
    });
  });

  describe('Player Integration', () => {
    it('should update player every frame', () => {
      const playerUpdateSpy = jest.spyOn(game.player, 'update');
      
      game.update(16.67);
      
      expect(playerUpdateSpy).toHaveBeenCalledWith(16.67);
    });

    it('should handle player casting', () => {
      const castSpy = jest.spyOn(game, '_handlePlayerCast');
      
      game._handlePlayerCast({ power: 5, angle: 1.5 });
      
      expect(castSpy).toHaveBeenCalled();
      expect(game.stats.casts).toBe(1);
    });

    it('should handle player reeling', () => {
      game.player.isReeling = true;
      
      game._updatePlayerActions();
      
      expect(game.player.isReeling).toBe(true);
    });

    it('should calculate player accuracy', () => {
      game.stats.casts = 10;
      game.stats.fishCaught = 7;
      
      const accuracy = game._calculateAccuracy();
      
      expect(accuracy).toBe(70);
    });
  });

  describe('Touch Controller Integration', () => {
    it('should handle touch events from controller', () => {
      const touchSpy = jest.spyOn(game, '_handleTouch');
      
      game._handleTouch({ x: 100, y: 200 });
      
      expect(touchSpy).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it('should handle gesture events', () => {
      const gestureSpy = jest.spyOn(game, '_handleGesture');
      
      game._handleGesture({ type: 'swipe', direction: 'right' });
      
      expect(gestureSpy).toHaveBeenCalledWith({ type: 'swipe', direction: 'right' });
    });

    it('should disable touch when game paused', () => {
      game.pause();
      
      expect(game.touchController.isEnabled).toBe(false);
    });

    it('should enable touch when game resumed', () => {
      game.pause();
      game.resume();
      
      expect(game.touchController.isEnabled).toBe(true);
    });
  });

  describe('Rendering System', () => {
    it('should clear canvas before rendering', () => {
      game.render();
      
      expect(mockCanvasContext.clearRect).toHaveBeenCalledWith(0, 0, 375, 667);
    });

    it('should render background', () => {
      const backgroundSpy = jest.spyOn(game, '_renderBackground');
      
      game.render();
      
      expect(backgroundSpy).toHaveBeenCalled();
    });

    it('should render all active fish', () => {
      game._spawnFish();
      const fish = game.activeFish[0];
      fish.render = jest.fn();
      
      game.render();
      
      expect(fish.render).toHaveBeenCalledWith(mockCanvasContext);
    });

    it('should render player', () => {
      const playerRenderSpy = jest.spyOn(game.player, 'render');
      
      game.render();
      
      expect(playerRenderSpy).toHaveBeenCalledWith(mockCanvasContext);
    });

    it('should render game UI', () => {
      const uiSpy = jest.spyOn(game, '_renderUI');
      
      game.render();
      
      expect(uiSpy).toHaveBeenCalled();
    });

    it('should use viewport culling for performance', () => {
      game._spawnFish();
      const fish = game.activeFish[0];
      fish.isInViewport = jest.fn(() => false);
      fish.render = jest.fn();
      
      game.render();
      
      expect(fish.isInViewport).toHaveBeenCalledWith(game.viewport);
      expect(fish.render).not.toHaveBeenCalled(); // Outside viewport
    });

    it('should render different states correctly', () => {
      const menuSpy = jest.spyOn(game, '_renderMenu');
      const gameOverSpy = jest.spyOn(game, '_renderGameOver');
      
      game.setState('menu');
      game.render();
      expect(menuSpy).toHaveBeenCalled();
      
      game.setState('gameOver');
      game.render();
      expect(gameOverSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should maintain 60fps on mobile', () => {
      game.start();
      
      // Simulate 60fps for 1 second
      for (let i = 0; i < 10; i++) {
        game._gameLoop(1000 + i * 16.67);
      }
      
      expect(game.currentFPS).toBeGreaterThan(0);
    });

    it('should use object pooling for fish', () => {
      const initialPoolSize = game.fishPool.length;
      
      game._spawnFish();
      const fish = game.activeFish[0];
      game._returnFishToPool(fish);
      
      expect(game.fishPool.length).toBe(initialPoolSize + 1);
    });

    it('should implement LOD for distant fish', () => {
      game._spawnFish();
      const fish = game.activeFish[0];
      fish.setLOD = jest.fn();
      
      game._updateLOD();
      
      expect(fish.setLOD).toHaveBeenCalled();
    });

    it('should throttle expensive operations', () => {
      const expensiveOpSpy = jest.spyOn(game, '_expensiveOperation');
      
      // Call multiple times rapidly
      for (let i = 0; i < 10; i++) {
        game._throttledExpensiveOperation();
      }
      
      expect(expensiveOpSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should cleanup resources when destroyed', () => {
      game.start();
      game.destroy();
      
      expect(game.player.destroy).toHaveBeenCalled();
      expect(game.touchController.destroy).toHaveBeenCalled();
      expect(game.isRunning).toBe(false);
    });
  });

  describe('Mobile Optimizations', () => {
    it('should detect mobile device', () => {
      expect(game.isMobile).toBe(true);
    });

    it('should adjust for device pixel ratio', () => {
      const dpr = 2;
      game._adjustForDevicePixelRatio(dpr);
      
      expect(mockCanvas.width).toBe(375 * dpr);
      expect(mockCanvas.height).toBe(667 * dpr);
    });

    it('should handle orientation change', () => {
      const orientationSpy = jest.spyOn(game, '_handleOrientationChange');
      
      game._handleOrientationChange();
      
      expect(orientationSpy).toHaveBeenCalled();
    });

    it('should optimize for battery life', () => {
      game._optimizeForBattery();
      
      expect(game.targetFPS).toBeLessThanOrEqual(30); // Reduced FPS
    });

    it('should handle visibility change', () => {
      const visibilitySpy = jest.spyOn(game, '_handleVisibilityChange');
      
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });
      
      game._handleVisibilityChange();
      
      expect(game.isPaused).toBe(true);
    });
  });

  describe('Game Mechanics', () => {
    it('should increase difficulty over time', () => {
      game.stats.playTime = 60000; // 1 minute
      game._updateDifficulty();
      
      expect(game.fishSpawnRate).toBeGreaterThan(1);
    });

    it('should save best score', () => {
      game.stats.score = 150;
      game.stats.bestScore = 100;
      
      game._updateBestScore();
      
      expect(game.stats.bestScore).toBe(150);
    });

    it('should handle power-ups', () => {
      const powerUp = { type: 'double_score', duration: 5000 };
      game._applyPowerUp(powerUp);
      
      expect(game.activePowerUps).toContain(powerUp);
    });

    it('should track play time', () => {
      game.start();
      game.update(1000); // 1 second
      
      expect(game.stats.playTime).toBe(1000);
    });

    it('should implement combo system', () => {
      game._handleFishCaught({ fish: { getScore: () => 10 }, score: 10 });
      game._handleFishCaught({ fish: { getScore: () => 15 }, score: 15 });
      
      expect(game.comboCount).toBe(2);
      expect(game.comboMultiplier).toBeGreaterThan(1);
    });
  });

  describe('Event System', () => {
    it('should emit game events', () => {
      const eventSpy = jest.fn();
      game.on('scoreChanged', eventSpy);
      
      game._updateScore(50);
      
      expect(eventSpy).toHaveBeenCalledWith(game.stats.score, 50);
    });

    it('should remove event listeners', () => {
      const callback = jest.fn();
      game.on('test', callback);
      game.off('test', callback);
      
      game._emit('test');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle player events', () => {
      const playerEventSpy = jest.spyOn(game, '_handlePlayerEvent');
      
      game._handlePlayerEvent();
      
      expect(playerEventSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', () => {
      mockCanvasContext.clearRect.mockImplementationOnce(() => {
        throw new Error('Canvas error');
      });
      
      expect(() => game.render()).not.toThrow();
    });

    it('should handle touch controller errors', () => {
      game.touchController.destroy.mockImplementationOnce(() => {
        throw new Error('Touch error');
      });
      
      expect(() => game.destroy()).not.toThrow();
    });

    it('should validate canvas element', () => {
      document.getElementById.mockReturnValueOnce(null);
      
      expect(() => new Game({ canvasId: 'nonexistent' })).toThrow();
    });

    it('should handle missing dependencies gracefully', () => {
      const gameWithoutDeps = new Game({
        canvasId: 'gameCanvas',
        skipDependencies: true
      });
      
      expect(gameWithoutDeps.player).toBeNull();
      expect(gameWithoutDeps.touchController).toBeNull();
      
      gameWithoutDeps.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup all resources on destroy', () => {
      game.start();
      game._spawnFish();
      
      game.destroy();
      
      expect(game.activeFish).toEqual([]);
      expect(game.fishPool).toEqual([]);
      expect(game.eventListeners).toEqual({});
      expect(game.destroyed).toBe(true);
    });

    it('should prevent operations after destruction', () => {
      game.destroy();
      
      expect(() => game.start()).not.toThrow();
      expect(game.isRunning).toBe(false);
    });

    it('should release animation frame', () => {
      game.start();
      game.destroy();
      
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
  });
}); 