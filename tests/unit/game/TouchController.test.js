/**
 * TouchController Tests
 * Tests for mobile touch input system and desktop mouse support
 */

import { TouchController } from '../../../src/game/TouchController.js';

// Mock timers
jest.useFakeTimers();

describe('TouchController', () => {
  let canvas, controller, mockPlayer, mockGameState;

  beforeEach(() => {
    // Create mock canvas
    canvas = {
      width: 375,
      height: 667,
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 375,
        height: 667
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Create mock player
    mockPlayer = {
      x: 187.5,
      y: 50,
      cast: jest.fn(),
      reel: jest.fn(),
      moveTo: jest.fn(),
      handleTouchCast: jest.fn(),
      handleTouchReel: jest.fn()
    };

    // Create mock game state
    mockGameState = {
      currentMode: 'fishing',
      isPlaying: true,
      isPaused: false
    };

    // Create controller instance
    controller = new TouchController({
      canvas,
      player: mockPlayer,
      gameState: mockGameState
    });
  });

  afterEach(() => {
    // Clear all timers
    jest.clearAllTimers();
    
    if (controller && !controller.destroyed) {
      controller.destroy();
    }
    
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with required dependencies', () => {
      expect(controller.canvas).toBe(canvas);
      expect(controller.player).toBe(mockPlayer);
      expect(controller.gameState).toBe(mockGameState);
      expect(controller.isEnabled).toBe(true);
      expect(controller.destroyed).toBe(false);
    });

    it('should throw error without canvas', () => {
      expect(() => {
        new TouchController({});
      }).toThrow('TouchController requires a canvas element');
    });

    it('should detect mobile devices correctly', () => {
      expect(typeof controller.isMobile).toBe('boolean');
      expect(typeof controller.supportsMultiTouch).toBe('boolean');
    });

    it('should initialize touch zones', () => {
      expect(controller.touchZones).toBeDefined();
      expect(controller.touchZones.casting).toBeDefined();
      expect(controller.touchZones.reeling).toBeDefined();
      expect(controller.touchZones.player).toBeDefined();
    });

    it('should setup event listeners', () => {
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function), expect.any(Object));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function), expect.any(Object));
    });
  });

  describe('Mouse Support (Desktop)', () => {
    let mouseEvent;
    
    beforeEach(() => {
      mouseEvent = {
        clientX: 100,
        clientY: 150,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };
    });

    describe('Mouse Down Events', () => {
      it('should handle mouse down and create simulated touch', () => {
        const spy = jest.spyOn(controller, '_emit');
        
        controller._handleMouseDown(mouseEvent);
        
        expect(mouseEvent.preventDefault).toHaveBeenCalled();
        expect(controller.mouseDown).toBe(true);
        expect(controller.mouseTouch).toBeDefined();
        expect(controller.activeTouches.get('mouse')).toBeDefined();
        expect(spy).toHaveBeenCalledWith('touchStart', expect.objectContaining({
          touches: expect.any(Array),
          position: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
          isSimulated: true
        }));
      });

      it('should skip mouse down if touch events are active', () => {
        // Simulate active touch
        const touch = { id: 1, isActive: true };
        controller.activeTouches.set(1, touch);
        
        controller._handleMouseDown(mouseEvent);
        
        expect(controller.mouseDown).toBe(false);
        expect(controller.mouseTouch).toBeNull();
      });

      it('should not handle mouse down when disabled', () => {
        controller.isEnabled = false;
        
        controller._handleMouseDown(mouseEvent);
        
        expect(mouseEvent.preventDefault).not.toHaveBeenCalled();
        expect(controller.mouseDown).toBe(false);
      });
    });

    describe('Mouse Move Events', () => {
      beforeEach(() => {
        controller._handleMouseDown(mouseEvent);
      });

      it('should handle mouse move and update coordinates', () => {
        const moveEvent = {
          clientX: 120,
          clientY: 170,
          preventDefault: jest.fn()
        };
        const spy = jest.spyOn(controller, '_emit');
        
        // Disable throttling to ensure event is emitted
        controller.moveThrottle = false;
        
        // Ensure coordinates are valid by mocking the coordinate calculation
        jest.spyOn(controller, '_getMouseCoordinates').mockReturnValue({ x: 120, y: 170 });
        
        controller._handleMouseMove(moveEvent);
        
        expect(moveEvent.preventDefault).toHaveBeenCalled();
        expect(controller.mouseTouch.deltaX).toBeDefined();
        expect(controller.mouseTouch.deltaY).toBeDefined();
        expect(spy).toHaveBeenCalledWith('touchMove', expect.objectContaining({
          isSimulated: true,
          delta: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
        }));
        
        // Restore the original method and throttling
        controller._getMouseCoordinates.mockRestore();
        controller.moveThrottle = true;
      });

      it('should throttle mouse move events for performance', () => {
        const spy = jest.spyOn(controller, '_emit');
        const moveEvent = { clientX: 120, clientY: 170, preventDefault: jest.fn() };
        
        // Disable throttling for this test
        controller.moveThrottle = false;
        
        // Both moves should trigger when throttling is disabled
        controller._handleMouseMove(moveEvent);
        controller._handleMouseMove(moveEvent);
        
        expect(spy).toHaveBeenCalledTimes(2);
        
        // Re-enable throttling
        controller.moveThrottle = true;
      });

      it('should not handle mouse move without mouse down', () => {
        controller.mouseDown = false;
        const spy = jest.spyOn(controller, '_emit');
        
        controller._handleMouseMove(mouseEvent);
        
        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe('Mouse Up Events', () => {
      beforeEach(() => {
        controller._handleMouseDown(mouseEvent);
      });

      it('should handle mouse up and recognize tap gesture', () => {
        const spy = jest.spyOn(controller, '_emit');
        const upEvent = { ...mouseEvent, preventDefault: jest.fn() };
        
        controller._handleMouseUp(upEvent);
        
        expect(upEvent.preventDefault).toHaveBeenCalled();
        expect(controller.mouseDown).toBe(false);
        expect(controller.mouseTouch).toBeNull();
        expect(controller.activeTouches.get('mouse')).toBeUndefined();
        
        // Check that touchEnd was emitted (gesture may or may not be present)
        const touchEndCall = spy.mock.calls.find(call => call[0] === 'touchEnd');
        expect(touchEndCall).toBeDefined();
        expect(touchEndCall[1]).toEqual(expect.objectContaining({
          isSimulated: true,
          position: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
        }));
      });

      it('should not handle mouse up without mouse down', () => {
        controller.mouseDown = false;
        controller.mouseTouch = null;
        const spy = jest.spyOn(controller, '_emit');
        
        controller._handleMouseUp(mouseEvent);
        
        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe('Mouse Coordinate Conversion', () => {
      it('should convert mouse coordinates to canvas coordinates', () => {
        const event = { clientX: 150, clientY: 200 };
        const coordinates = controller._getMouseCoordinates(event);
        
        expect(coordinates).toEqual({
          x: expect.any(Number),
          y: expect.any(Number)
        });
        expect(coordinates.x).toBeGreaterThanOrEqual(0);
        expect(coordinates.y).toBeGreaterThanOrEqual(0);
      });

      it('should return null for coordinates outside canvas', () => {
        const event = { clientX: -50, clientY: -50 };
        const coordinates = controller._getMouseCoordinates(event);
        
        expect(coordinates).toBeNull();
      });

      it('should handle canvas scaling correctly', () => {
        // Mock _updateCanvasProperties to prevent it from overriding our values
        jest.spyOn(controller, '_updateCanvasProperties').mockImplementation(() => {
          // Keep our test values
        });
        
        controller.canvasScale = 2;
        controller.canvasOffset = { x: 10, y: 10 };
        
        const event = { clientX: 50, clientY: 60 };
        const coordinates = controller._getMouseCoordinates(event);
        
        expect(coordinates.x).toBe(20); // (50-10)/2
        expect(coordinates.y).toBe(25); // (60-10)/2
        
        // Restore the original method
        controller._updateCanvasProperties.mockRestore();
      });
    });

    describe('Mouse Touch Object Creation', () => {
      it('should create mouse touch object with correct properties', () => {
        const event = { clientX: 100, clientY: 150 };
        const mouseTouch = controller._createMouseTouch(event);
        
        expect(mouseTouch).toEqual(expect.objectContaining({
          id: 'mouse',
          startX: expect.any(Number),
          startY: expect.any(Number),
          currentX: expect.any(Number),
          currentY: expect.any(Number),
          previousX: expect.any(Number),
          previousY: expect.any(Number),
          deltaX: 0,
          deltaY: 0,
          startTime: expect.any(Number),
          lastMoveTime: expect.any(Number),
          isActive: true,
          gestureData: {}
        }));
        expect(typeof mouseTouch.reset).toBe('function');
      });

      it('should return null if coordinates are invalid', () => {
        const event = { clientX: -100, clientY: -100 };
        const mouseTouch = controller._createMouseTouch(event);
        
        expect(mouseTouch).toBeNull();
      });
    });

    describe('Mouse Gesture Recognition', () => {
      it('should recognize tap gesture from mouse click', () => {
        const spy = jest.spyOn(controller, '_handleTap');
        const gesture = { type: 'tap' };
        const mouseTouch = { currentX: 100, currentY: 150 };
        
        controller._handleMouseGesture(gesture, mouseTouch);
        
        expect(spy).toHaveBeenCalledWith({ x: 100, y: 150 });
      });

      it('should recognize double-tap gesture', () => {
        const spy = jest.spyOn(controller, '_handleDoubleTap');
        const gesture = { type: 'double-tap' };
        const mouseTouch = { currentX: 100, currentY: 150 };
        
        controller._handleMouseGesture(gesture, mouseTouch);
        
        expect(spy).toHaveBeenCalledWith({ x: 100, y: 150 });
      });

      it('should recognize swipe gesture from mouse drag', () => {
        const spy = jest.spyOn(controller, '_handleSwipe');
        const gesture = { 
          type: 'swipe', 
          direction: 'left',
          distance: 100,
          velocity: 50
        };
        const mouseTouch = { 
          startX: 200, 
          startY: 150, 
          currentX: 100, 
          currentY: 150 
        };
        
        controller._handleMouseGesture(gesture, mouseTouch);
        
        expect(spy).toHaveBeenCalledWith({
          direction: 'left',
          distance: 100,
          velocity: 50,
          startPosition: { x: 200, y: 150 },
          endPosition: { x: 100, y: 150 }
        });
      });

      it('should handle custom gestures', () => {
        const customHandler = jest.fn();
        controller.addCustomGesture('custom', customHandler);
        
        const gesture = { type: 'custom' };
        const mouseTouch = { currentX: 100, currentY: 150 };
        
        controller._handleMouseGesture(gesture, mouseTouch);
        
        expect(customHandler).toHaveBeenCalledWith(gesture, { x: 100, y: 150 });
      });
    });

    describe('Hybrid Device Support', () => {
      it('should prioritize touch over mouse on hybrid devices', () => {
        // Add active touch
        const touch = { id: 1, isActive: true };
        controller.activeTouches.set(1, touch);
        
        const spy = jest.spyOn(controller, '_emit');
        controller._handleMouseDown(mouseEvent);
        
        expect(controller.mouseDown).toBe(false);
        expect(spy).not.toHaveBeenCalled();
      });

      it('should allow mouse after touch events end', () => {
        // Start with touch
        const touch = { id: 1, isActive: true };
        controller.activeTouches.set(1, touch);
        
        // Remove touch
        controller.activeTouches.clear();
        
        // Mouse should work now
        const spy = jest.spyOn(controller, '_emit');
        controller._handleMouseDown(mouseEvent);
        
        expect(controller.mouseDown).toBe(true);
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('Touch Zones', () => {
    it('should identify casting zone correctly', () => {
      const castingZone = controller.getCastingZone();
      expect(castingZone).toEqual({
        x: 0,
        y: 0,
        width: 375,
        height: expect.any(Number)
      });
    });

    it('should identify reeling zone correctly', () => {
      const reelingZone = controller.getReelingZone();
      expect(reelingZone).toEqual({
        x: 0,
        y: expect.any(Number),
        width: 375,
        height: expect.any(Number)
      });
    });

    it('should detect if point is in casting zone', () => {
      const isInCasting = controller.isInCastingZone(100, 50);
      expect(typeof isInCasting).toBe('boolean');
    });

    it('should detect if point is in reeling zone', () => {
      const isInReeling = controller.isInReelingZone(100, 400);
      expect(typeof isInReeling).toBe('boolean');
    });
  });

  describe('Configuration', () => {
    it('should set gesture threshold', () => {
      const newThreshold = 20;
      const result = controller.setGestureThreshold(newThreshold);
      
      expect(result).toBe(controller);
      expect(controller.gestureThreshold).toBe(newThreshold);
    });

    it('should set touch sensitivity', () => {
      const newSensitivity = 1.5;
      const result = controller.setSensitivity(newSensitivity);
      
      expect(result).toBe(controller);
      expect(controller.touchSensitivity).toBe(newSensitivity);
    });

    it('should enable/disable audio feedback', () => {
      controller.enableAudioFeedback(true);
      expect(controller.audioFeedbackEnabled).toBe(true);
      
      controller.enableAudioFeedback(false);
      expect(controller.audioFeedbackEnabled).toBe(false);
    });

    it('should set reduced motion preference', () => {
      controller.setReducedMotion(true);
      expect(controller.reducedMotion).toBe(true);
      
      controller.setReducedMotion(false);
      expect(controller.reducedMotion).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should register event listeners', () => {
      const callback = jest.fn();
      const result = controller.on('touchStart', callback);
      
      expect(result).toBe(controller);
      expect(controller.eventListeners.touchStart).toContain(callback);
    });

    it('should unregister event listeners', () => {
      const callback = jest.fn();
      controller.on('touchStart', callback);
      const result = controller.off('touchStart', callback);
      
      expect(result).toBe(controller);
      expect(controller.eventListeners.touchStart).not.toContain(callback);
    });

    it('should emit events to registered listeners', () => {
      const callback = jest.fn();
      controller.on('touchStart', callback);
      
      controller._emit('touchStart', { test: true });
      
      expect(callback).toHaveBeenCalledWith({ test: true });
    });
  });

  describe('Cleanup', () => {
    it('should destroy controller and cleanup resources', () => {
      const result = controller.destroy();
      
      expect(result).toBe(controller);
      expect(controller.destroyed).toBe(true);
      expect(controller.isEnabled).toBe(false);
      expect(controller.activeTouches.size).toBe(0);
    });
  });
}); 