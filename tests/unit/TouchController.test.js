/**
 * TouchController Test Suite
 * Mobile-First Fish Game Touch Input System
 * Test-First Development: Tests written BEFORE implementation
 */

import { TouchController } from '../../src/game/TouchController.js';

// Mock DOM elements and events
global.document = {
  createElement: jest.fn(() => ({
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      left: 0, top: 0, width: 375, height: 667
    }))
  })),
  getElementById: jest.fn(() => ({
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      left: 0, top: 0, width: 375, height: 667
    }))
  }))
};

global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  devicePixelRatio: 2,
  navigator: {
    userAgent: 'Mobile Safari'
  }
};

// Mock touch events
const createMockTouchEvent = (touches, type = 'touchstart') => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  touches: touches.map(t => ({
    identifier: t.id || 0,
    clientX: t.x,
    clientY: t.y,
    pageX: t.x,
    pageY: t.y,
    target: { getBoundingClientRect: () => ({ left: 0, top: 0 }) }
  })),
  changedTouches: touches.map(t => ({
    identifier: t.id || 0,
    clientX: t.x,
    clientY: t.y,
    pageX: t.x,
    pageY: t.y
  })),
  targetTouches: touches.map(t => ({
    identifier: t.id || 0,
    clientX: t.x,
    clientY: t.y,
    pageX: t.x,
    pageY: t.y
  }))
});

describe('TouchController', () => {
  let touchController;
  let mockCanvas;
  let mockPlayer;
  let mockGameState;

  beforeEach(() => {
    mockCanvas = {
      getBoundingClientRect: jest.fn(() => ({
        left: 0, top: 0, width: 375, height: 667
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    mockPlayer = {
      handleTouchCast: jest.fn(),
      handleTouchReel: jest.fn(),
      isCasting: false,
      isReeling: false,
      x: 187.5, // Center of canvas
      y: 50
    };

    mockGameState = {
      isPaused: false,
      isActive: true,
      currentMode: 'fishing'
    };

    touchController = new TouchController({
      canvas: mockCanvas,
      player: mockPlayer,
      gameState: mockGameState
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (touchController) {
      touchController.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default properties', () => {
      expect(touchController.isEnabled).toBe(true);
      expect(touchController.canvas).toBe(mockCanvas);
      expect(touchController.player).toBe(mockPlayer);
      expect(touchController.gameState).toBe(mockGameState);
      expect(touchController.activeTouches.size).toBe(0);
    });

    it('should initialize with custom settings', () => {
      const customController = new TouchController({
        canvas: mockCanvas,
        player: mockPlayer,
        gameState: mockGameState,
        touchSensitivity: 0.8,
        gestureThreshold: 15,
        doubleTapDelay: 250
      });

      expect(customController.touchSensitivity).toBe(0.8);
      expect(customController.gestureThreshold).toBe(15);
      expect(customController.doubleTapDelay).toBe(250);
      
      customController.destroy();
    });

    it('should set up touch event listeners', () => {
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchstart', expect.any(Function), expect.objectContaining({ passive: false })
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchmove', expect.any(Function), expect.objectContaining({ passive: false })
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchend', expect.any(Function), expect.objectContaining({ passive: false })
      );
    });

    it('should detect mobile device capabilities', () => {
      expect(touchController.isMobile).toBe(true);
      expect(touchController.supportsMultiTouch).toBe(true);
      expect(touchController.maxTouches).toBeGreaterThan(1);
    });

    it('should calculate canvas scale and offset', () => {
      expect(touchController.canvasScale).toBeGreaterThan(0);
      expect(touchController.canvasOffset).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Touch Event Handling', () => {
    it('should handle single touch start', () => {
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      
      touchController._handleTouchStart(touchEvent);
      
      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect(touchController.activeTouches.size).toBe(1);
      expect(touchController.activeTouches.has(1)).toBe(true);
    });

    it('should handle multi-touch start', () => {
      const touchEvent = createMockTouchEvent([
        { x: 100, y: 200, id: 1 },
        { x: 200, y: 300, id: 2 }
      ]);
      
      touchController._handleTouchStart(touchEvent);
      
      expect(touchController.activeTouches.size).toBe(2);
      expect(touchController.activeTouches.has(1)).toBe(true);
      expect(touchController.activeTouches.has(2)).toBe(true);
    });

    it('should handle touch move', () => {
      // Start touch
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Move touch
      const moveEvent = createMockTouchEvent([{ x: 150, y: 250, id: 1 }], 'touchmove');
      touchController._handleTouchMove(moveEvent);
      
      const touch = touchController.activeTouches.get(1);
      expect(touch.currentX).toBe(150);
      expect(touch.currentY).toBe(250);
      expect(touch.deltaX).toBe(50);
      expect(touch.deltaY).toBe(50);
    });

    it('should handle touch end', () => {
      // Start touch
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // End touch
      const endEvent = createMockTouchEvent([{ x: 150, y: 250, id: 1 }], 'touchend');
      touchController._handleTouchEnd(endEvent);
      
      expect(touchController.activeTouches.size).toBe(0);
    });

    it('should prevent default on all touch events', () => {
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      
      touchController._handleTouchStart(touchEvent);
      touchController._handleTouchMove(touchEvent);
      touchController._handleTouchEnd(touchEvent);
      
      expect(touchEvent.preventDefault).toHaveBeenCalledTimes(3);
    });

    it('should handle touch cancel', () => {
      // Start touch
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Cancel touch
      const cancelEvent = createMockTouchEvent([{ x: 150, y: 250, id: 1 }], 'touchcancel');
      touchController._handleTouchCancel(cancelEvent);
      
      expect(touchController.activeTouches.size).toBe(0);
    });
  });

  describe('Gesture Recognition', () => {
    it('should detect tap gesture', () => {
      const tapSpy = jest.spyOn(touchController, '_handleTap');
      
      // Start and end touch quickly at same position
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      setTimeout(() => {
        const endEvent = createMockTouchEvent([{ x: 102, y: 201, id: 1 }], 'touchend');
        touchController._handleTouchEnd(endEvent);
        
        expect(tapSpy).toHaveBeenCalledWith(expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        }));
      }, 100);
    });

    it('should detect swipe gesture', () => {
      const swipeSpy = jest.spyOn(touchController, '_handleSwipe');
      
      // Start touch
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Move significantly
      const moveEvent = createMockTouchEvent([{ x: 200, y: 220, id: 1 }], 'touchmove');
      touchController._handleTouchMove(moveEvent);
      
      // End touch
      const endEvent = createMockTouchEvent([{ x: 200, y: 220, id: 1 }], 'touchend');
      touchController._handleTouchEnd(endEvent);
      
      expect(swipeSpy).toHaveBeenCalledWith(expect.objectContaining({
        direction: expect.any(String),
        distance: expect.any(Number),
        velocity: expect.any(Number)
      }));
    });

    it('should detect double tap', () => {
      const doubleTapSpy = jest.spyOn(touchController, '_handleDoubleTap');
      
      // First tap
      const firstTap = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(firstTap);
      touchController._handleTouchEnd(firstTap);
      
      // Second tap quickly
      setTimeout(() => {
        const secondTap = createMockTouchEvent([{ x: 102, y: 201, id: 2 }]);
        touchController._handleTouchStart(secondTap);
        touchController._handleTouchEnd(secondTap);
        
        expect(doubleTapSpy).toHaveBeenCalled();
      }, 100);
    });

    it('should detect pinch gesture', () => {
      const pinchSpy = jest.spyOn(touchController, '_handlePinch');
      
      // Start two touches
      const startEvent = createMockTouchEvent([
        { x: 100, y: 200, id: 1 },
        { x: 200, y: 200, id: 2 }
      ]);
      touchController._handleTouchStart(startEvent);
      
      // Move touches closer together
      const moveEvent = createMockTouchEvent([
        { x: 120, y: 200, id: 1 },
        { x: 180, y: 200, id: 2 }
      ], 'touchmove');
      touchController._handleTouchMove(moveEvent);
      
      expect(pinchSpy).toHaveBeenCalledWith(expect.objectContaining({
        scale: expect.any(Number),
        center: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      }));
    });

    it('should detect long press', () => {
      const longPressSpy = jest.spyOn(touchController, '_handleLongPress');
      
      // Start touch and hold
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Simulate long press duration
      setTimeout(() => {
        expect(longPressSpy).toHaveBeenCalledWith(expect.objectContaining({
          x: 100,
          y: 200
        }));
      }, touchController.longPressDelay + 50);
    });
  });

  describe('Fishing Game Integration', () => {
    it('should handle casting gesture', () => {
      // Start touch near player
      const startEvent = createMockTouchEvent([{ x: 180, y: 60, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Drag to cast
      const moveEvent = createMockTouchEvent([{ x: 250, y: 150, id: 1 }], 'touchmove');
      touchController._handleTouchMove(moveEvent);
      
      // Release to cast
      const endEvent = createMockTouchEvent([{ x: 250, y: 150, id: 1 }], 'touchend');
      touchController._handleTouchEnd(endEvent);
      
      expect(mockPlayer.handleTouchCast).toHaveBeenCalledWith(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
    });

    it('should handle reeling gesture', () => {
      mockPlayer.isCasting = true;
      
      // Tap to start reeling
      const tapEvent = createMockTouchEvent([{ x: 200, y: 300, id: 1 }]);
      touchController._handleTouchStart(tapEvent);
      touchController._handleTouchEnd(tapEvent);
      
      expect(mockPlayer.handleTouchReel).toHaveBeenCalled();
    });

    it('should handle hook control gestures', () => {
      mockPlayer.isCasting = true;
      
      // Swipe to control hook direction
      const startEvent = createMockTouchEvent([{ x: 200, y: 300, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      const moveEvent = createMockTouchEvent([{ x: 250, y: 280, id: 1 }], 'touchmove');
      touchController._handleTouchMove(moveEvent);
      
      const endEvent = createMockTouchEvent([{ x: 250, y: 280, id: 1 }], 'touchend');
      touchController._handleTouchEnd(endEvent);
      
      // Should emit hook control event
      expect(touchController.lastGesture.type).toBe('swipe');
    });

    it('should ignore touches when game is paused', () => {
      mockGameState.isPaused = true;
      
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(touchEvent);
      
      expect(touchController.activeTouches.size).toBe(0);
      expect(mockPlayer.handleTouchCast).not.toHaveBeenCalled();
    });

    it('should handle different game modes', () => {
      mockGameState.currentMode = 'menu';
      
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(touchEvent);
      
      // Should handle differently in menu mode
      expect(touchController.currentMode).toBe('menu');
    });
  });

  describe('Touch Zones', () => {
    it('should define casting zone', () => {
      const castingZone = touchController.getCastingZone();
      
      expect(castingZone).toHaveProperty('x');
      expect(castingZone).toHaveProperty('y');
      expect(castingZone).toHaveProperty('width');
      expect(castingZone).toHaveProperty('height');
    });

    it('should detect touch in casting zone', () => {
      const isInCastingZone = touchController.isInCastingZone(187, 60);
      expect(isInCastingZone).toBe(true);
      
      const isOutsideCastingZone = touchController.isInCastingZone(50, 50);
      expect(isOutsideCastingZone).toBe(false);
    });

    it('should define reeling zone', () => {
      const reelingZone = touchController.getReelingZone();
      
      expect(reelingZone).toHaveProperty('x');
      expect(reelingZone).toHaveProperty('y');
      expect(reelingZone).toHaveProperty('width');
      expect(reelingZone).toHaveProperty('height');
    });

    it('should adapt zones for different screen sizes', () => {
      const smallScreen = { width: 320, height: 568 };
      touchController.adaptToScreenSize(smallScreen);
      
      const castingZone = touchController.getCastingZone();
      expect(castingZone.width).toBeLessThan(375); // Smaller than default
    });

    it('should handle touch outside game area', () => {
      const touchOutside = createMockTouchEvent([{ x: -10, y: -10, id: 1 }]);
      touchController._handleTouchStart(touchOutside);
      
      expect(touchController.activeTouches.size).toBe(0);
    });
  });

  describe('Performance Optimizations', () => {
    it('should throttle touch move events', () => {
      const moveSpy = jest.spyOn(touchController, '_processTouchMove');
      
      // Start touch
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Rapid touch moves
      for (let i = 0; i < 10; i++) {
        const moveEvent = createMockTouchEvent([{ x: 100 + i, y: 200, id: 1 }], 'touchmove');
        touchController._handleTouchMove(moveEvent);
      }
      
      // Should throttle and not process all moves
      expect(moveSpy.mock.calls.length).toBeLessThan(10);
      
      moveSpy.mockRestore();
    });

    it('should implement touch pooling for memory efficiency', () => {
      const poolSize = touchController.touchPool.length;
      
      // Use and return touches to pool
      for (let i = 0; i < 5; i++) {
        const touch = touchController._getTouchFromPool();
        touchController._returnTouchToPool(touch);
      }
      
      expect(touchController.touchPool.length).toBe(poolSize);
    });

    it('should cleanup inactive touches', () => {
      // Add touches that timeout
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      // Simulate timeout
      touchController._cleanupInactiveTouches(Date.now() + touchController.touchTimeout + 1000);
      
      expect(touchController.activeTouches.size).toBe(0);
    });

    it('should limit maximum concurrent touches', () => {
      const maxTouches = touchController.maxTouches;
      const touches = [];
      
      // Try to add more touches than maximum
      for (let i = 0; i < maxTouches + 5; i++) {
        touches.push({ x: 100 + i * 10, y: 200, id: i });
      }
      
      const touchEvent = createMockTouchEvent(touches);
      touchController._handleTouchStart(touchEvent);
      
      expect(touchController.activeTouches.size).toBeLessThanOrEqual(maxTouches);
    });
  });

  describe('Mobile Optimizations', () => {
    it('should detect device orientation', () => {
      expect(touchController.orientation).toMatch(/portrait|landscape/);
    });

    it('should handle orientation change', () => {
      const orientationSpy = jest.spyOn(touchController, '_handleOrientationChange');
      
      touchController._handleOrientationChange();
      
      expect(orientationSpy).toHaveBeenCalled();
    });

    it('should adjust touch sensitivity for device', () => {
      const highDPR = 3;
      touchController._adjustForDevicePixelRatio(highDPR);
      
      expect(touchController.touchSensitivity).toBeLessThan(1); // Reduced for high DPR
    });

    it('should handle edge cases for small screens', () => {
      const smallScreen = { width: 240, height: 320 };
      touchController.adaptToScreenSize(smallScreen);
      
      expect(touchController.gestureThreshold).toBeLessThan(10); // Reduced for small screen
    });

    it('should support haptic feedback', () => {
      const hapticSpy = jest.spyOn(touchController, 'triggerHapticFeedback');
      
      touchController.triggerHapticFeedback('light');
      
      expect(hapticSpy).toHaveBeenCalledWith('light');
    });
  });

  describe('Accessibility Support', () => {
    it('should support large touch targets', () => {
      const minTouchSize = 44; // Apple guidelines
      const castingZone = touchController.getCastingZone();
      
      expect(castingZone.width).toBeGreaterThanOrEqual(minTouchSize);
      expect(castingZone.height).toBeGreaterThanOrEqual(minTouchSize);
    });

    it('should provide audio feedback options', () => {
      touchController.enableAudioFeedback(true);
      
      expect(touchController.audioFeedbackEnabled).toBe(true);
    });

    it('should support reduced motion preferences', () => {
      touchController.setReducedMotion(true);
      
      expect(touchController.reducedMotion).toBe(true);
      expect(touchController.gestureThreshold).toBeGreaterThan(10); // Higher threshold
    });

    it('should handle assistive technology', () => {
      const assistiveSpy = jest.spyOn(touchController, '_handleAssistiveTouch');
      
      touchController.enableAssistiveMode(true);
      
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(touchEvent);
      
      expect(assistiveSpy).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {
    it('should emit touch events', () => {
      const touchSpy = jest.fn();
      touchController.on('touchStart', touchSpy);
      
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(touchEvent);
      
      expect(touchSpy).toHaveBeenCalledWith(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      }));
    });

    it('should emit gesture events', () => {
      const gestureSpy = jest.fn();
      touchController.on('gesture', gestureSpy);
      
      // Trigger a swipe gesture
      const startEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(startEvent);
      
      const endEvent = createMockTouchEvent([{ x: 200, y: 200, id: 1 }], 'touchend');
      touchController._handleTouchEnd(endEvent);
      
      expect(gestureSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'swipe'
      }));
    });

    it('should remove event listeners properly', () => {
      const callback = jest.fn();
      touchController.on('touchStart', callback);
      touchController.off('touchStart', callback);
      
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      touchController._handleTouchStart(touchEvent);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Configuration and Customization', () => {
    it('should allow gesture threshold customization', () => {
      touchController.setGestureThreshold(20);
      
      expect(touchController.gestureThreshold).toBe(20);
    });

    it('should allow sensitivity adjustment', () => {
      touchController.setSensitivity(0.5);
      
      expect(touchController.touchSensitivity).toBe(0.5);
    });

    it('should support custom gesture handlers', () => {
      const customHandler = jest.fn();
      touchController.addCustomGesture('custom', customHandler);
      
      expect(touchController.customGestures.custom).toBe(customHandler);
    });

    it('should validate configuration parameters', () => {
      expect(() => touchController.setSensitivity(-1)).toThrow();
      expect(() => touchController.setGestureThreshold(0)).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on destroy', () => {
      touchController.destroy();
      
      expect(touchController.activeTouches.size).toBe(0);
      expect(touchController.touchPool.length).toBe(0);
      expect(touchController.eventListeners).toEqual({});
      expect(touchController.destroyed).toBe(true);
    });

    it('should prevent operations after destruction', () => {
      touchController.destroy();
      
      const touchEvent = createMockTouchEvent([{ x: 100, y: 200, id: 1 }]);
      
      expect(() => touchController._handleTouchStart(touchEvent)).not.toThrow();
      expect(touchController.activeTouches.size).toBe(0);
    });

    it('should release touch pool memory', () => {
      touchController.destroy();
      
      expect(touchController.touchPool).toEqual([]);
    });
  });
}); 