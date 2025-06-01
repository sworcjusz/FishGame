/**
 * TouchController - Mobile Touch Input System for Fish Game
 * Handles all touch interactions, gesture recognition, and mobile optimizations
 * 
 * Features:
 * - Multi-touch gesture recognition (tap, swipe, pinch, long press)
 * - Performance-optimized touch handling for 60fps
 * - Mobile-first design with accessibility support
 * - Touch zones for game interaction areas
 * - Haptic feedback and audio feedback support
 * - Memory management with object pooling
 * - Integration with Fish and Player game mechanics
 */

export class TouchController {
  constructor(options = {}) {
    // Core dependencies
    this.canvas = options.canvas;
    this.player = options.player;
    this.gameState = options.gameState;
    
    // Validation
    if (!this.canvas) {
      throw new Error('TouchController requires a canvas element');
    }
    
    // State management
    this.isEnabled = true;
    this.destroyed = false;
    this.currentMode = this.gameState?.currentMode || 'fishing';
    
    // Touch tracking
    this.activeTouches = new Map();
    this.touchPool = [];
    this.maxTouches = options.maxTouches || 10;
    this.touchTimeout = options.touchTimeout || 5000; // 5 seconds
    
    // Gesture configuration
    this.touchSensitivity = options.touchSensitivity || 1.0;
    this.gestureThreshold = options.gestureThreshold || 10;
    this.doubleTapDelay = options.doubleTapDelay || 300;
    this.longPressDelay = options.longPressDelay || 500;
    this.swipeMinDistance = options.swipeMinDistance || 50;
    this.pinchThreshold = options.pinchThreshold || 20;
    
    // Performance optimizations
    this.throttleInterval = options.throttleInterval || 16; // ~60fps
    this.lastMoveTime = 0;
    this.moveThrottle = true;
    
    // Device detection
    this.isMobile = this._detectMobile();
    this.supportsMultiTouch = this._detectMultiTouch();
    this.devicePixelRatio = window?.devicePixelRatio || 1;
    this.orientation = this._getOrientation();
    
    // Canvas properties
    this.canvasScale = 1;
    this.canvasOffset = { x: 0, y: 0 };
    this._updateCanvasProperties();
    
    // Touch zones
    this.touchZones = this._initializeTouchZones();
    
    // Gesture state
    this.lastGesture = null;
    this.lastTapTime = 0;
    this.lastTapPosition = null;
    this.gestureInProgress = false;
    this.customGestures = {};
    
    // Accessibility
    this.audioFeedbackEnabled = false;
    this.reducedMotion = false;
    this.assistiveMode = false;
    
    // Event system
    this.eventListeners = {};
    
    // Mouse support for desktop
    this.mouseDown = false;
    this.mouseTouch = null;
    
    // Timers for cleanup
    this.orientationTimer = null;
    
    // Initialize touch pool
    this._initializeTouchPool();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Adapt to initial screen size
    this._handleOrientationChange();
  }

  // ===============================
  // INITIALIZATION
  // ===============================

  /**
   * Detect if device is mobile
   * @returns {boolean} True if mobile device
   * @private
   */
  _detectMobile() {
    if (typeof window === 'undefined') return true; // Assume mobile in test environment
    
    const userAgent = window.navigator?.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
           ('ontouchstart' in window) ||
           (window.DocumentTouch && document instanceof window.DocumentTouch);
  }

  /**
   * Detect multi-touch support
   * @returns {boolean} True if multi-touch supported
   * @private
   */
  _detectMultiTouch() {
    return ('ontouchstart' in window) && this.isMobile;
  }

  /**
   * Get device orientation
   * @returns {string} 'portrait' or 'landscape'
   * @private
   */
  _getOrientation() {
    if (typeof window === 'undefined') return 'portrait';
    
    const width = window.innerWidth || 375;
    const height = window.innerHeight || 667;
    return width > height ? 'landscape' : 'portrait';
  }

  /**
   * Update canvas properties for touch coordinate conversion
   * @private
   */
  _updateCanvasProperties() {
    if (!this.canvas || !this.canvas.getBoundingClientRect) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.canvasOffset = { x: rect.left, y: rect.top };
    this.canvasScale = rect.width / (this.canvas.width || rect.width);
  }

  /**
   * Initialize touch zones for game interactions
   * @returns {Object} Touch zones configuration
   * @private
   */
  _initializeTouchZones() {
    const canvasRect = this.canvas?.getBoundingClientRect() || { width: 375, height: 667 };
    
    return {
      casting: {
        x: 0,
        y: 0,
        width: canvasRect.width,
        height: canvasRect.height * 0.4 // Top 40% for casting
      },
      reeling: {
        x: 0,
        y: canvasRect.height * 0.4,
        width: canvasRect.width,
        height: canvasRect.height * 0.6 // Bottom 60% for reeling
      },
      player: {
        x: (this.player?.x || canvasRect.width / 2) - 44,
        y: (this.player?.y || 50) - 44,
        width: 88, // Minimum 44px touch target
        height: 88
      }
    };
  }

  /**
   * Initialize touch object pool for memory efficiency
   * @private
   */
  _initializeTouchPool() {
    const poolSize = this.maxTouches * 2;
    
    for (let i = 0; i < poolSize; i++) {
      this.touchPool.push(this._createTouchObject());
    }
  }

  /**
   * Create touch object template
   * @returns {Object} Touch object
   * @private
   */
  _createTouchObject() {
    return {
      id: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      previousX: 0,
      previousY: 0,
      deltaX: 0,
      deltaY: 0,
      startTime: 0,
      lastMoveTime: 0,
      isActive: false,
      gestureData: {},
      reset() {
        this.id = null;
        this.startX = this.startY = 0;
        this.currentX = this.currentY = 0;
        this.previousX = this.previousY = 0;
        this.deltaX = this.deltaY = 0;
        this.startTime = this.lastMoveTime = 0;
        this.isActive = false;
        this.gestureData = {};
      }
    };
  }

  /**
   * Setup touch event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.canvas) return;
    
    const options = { passive: false };
    
    this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this), options);
    this.canvas.addEventListener('touchmove', this._handleTouchMove.bind(this), options);
    this.canvas.addEventListener('touchend', this._handleTouchEnd.bind(this), options);
    this.canvas.addEventListener('touchcancel', this._handleTouchCancel.bind(this), options);
    
    // Mouse support for desktop
    this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this), options);
    this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this), options);
    this.canvas.addEventListener('mouseup', this._handleMouseUp.bind(this), options);
    this.canvas.addEventListener('mouseleave', this._handleMouseUp.bind(this), options);
    
    // Orientation change handling
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', this._handleOrientationChange.bind(this));
      window.addEventListener('resize', this._handleOrientationChange.bind(this));
    }
  }

  // ===============================
  // TOUCH EVENT HANDLERS
  // ===============================

  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchStart(event) {
    if (this.destroyed || !this.isEnabled) return;
    if (this.gameState?.isPaused) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const currentTime = Date.now();
    
    for (const touch of event.changedTouches) {
      if (this.activeTouches.size >= this.maxTouches) break;
      
      const coordinates = this._getTouchCoordinates(touch);
      if (!this._isInGameArea(coordinates.x, coordinates.y)) continue;
      
      const touchObj = this._getTouchFromPool();
      touchObj.id = touch.identifier;
      touchObj.startX = touchObj.currentX = coordinates.x;
      touchObj.startY = touchObj.currentY = coordinates.y;
      touchObj.startTime = currentTime;
      touchObj.lastMoveTime = currentTime;
      touchObj.isActive = true;
      
      this.activeTouches.set(touch.identifier, touchObj);
      
      // Emit touch start event
      this._emit('touchStart', {
        id: touch.identifier,
        x: coordinates.x,
        y: coordinates.y,
        timestamp: currentTime
      });
      
      // Handle long press detection
      this._setupLongPressDetection(touchObj);
    }
    
    // Update current mode
    this.currentMode = this.gameState?.currentMode || 'fishing';
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchMove(event) {
    if (this.destroyed || !this.isEnabled) return;
    if (this.gameState?.isPaused) return;
    
    event.preventDefault();
    
    const currentTime = Date.now();
    
    // Throttle move events for performance
    if (this.moveThrottle && currentTime - this.lastMoveTime < this.throttleInterval) {
      return;
    }
    this.lastMoveTime = currentTime;
    
    for (const touch of event.changedTouches) {
      const touchObj = this.activeTouches.get(touch.identifier);
      if (!touchObj) continue;
      
      const coordinates = this._getTouchCoordinates(touch);
      
      // Update touch object
      touchObj.previousX = touchObj.currentX;
      touchObj.previousY = touchObj.currentY;
      touchObj.currentX = coordinates.x;
      touchObj.currentY = coordinates.y;
      touchObj.deltaX = touchObj.currentX - touchObj.startX;
      touchObj.deltaY = touchObj.currentY - touchObj.startY;
      touchObj.lastMoveTime = currentTime;
      
      // Process gesture recognition
      this._processTouchMove(touchObj);
      
      // Emit touch move event
      this._emit('touchMove', {
        id: touch.identifier,
        x: coordinates.x,
        y: coordinates.y,
        deltaX: touchObj.deltaX,
        deltaY: touchObj.deltaY,
        timestamp: currentTime
      });
    }
    
    // Handle multi-touch gestures
    if (this.activeTouches.size >= 2) {
      this._handleMultiTouchGestures();
    }
  }

  /**
   * Handle touch end event
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchEnd(event) {
    if (this.destroyed || !this.isEnabled) return;
    
    event.preventDefault();
    
    const currentTime = Date.now();
    
    for (const touch of event.changedTouches) {
      const touchObj = this.activeTouches.get(touch.identifier);
      if (!touchObj) continue;
      
      const coordinates = this._getTouchCoordinates(touch);
      const duration = currentTime - touchObj.startTime;
      const distance = Math.sqrt(touchObj.deltaX ** 2 + touchObj.deltaY ** 2);
      
      // Determine gesture type
      this._recognizeGesture(touchObj, duration, distance);
      
      // Emit touch end event
      this._emit('touchEnd', {
        id: touch.identifier,
        x: coordinates.x,
        y: coordinates.y,
        duration,
        distance,
        timestamp: currentTime
      });
      
      // Return touch to pool
      this._returnTouchToPool(touchObj);
      this.activeTouches.delete(touch.identifier);
    }
  }

  /**
   * Handle touch cancel event
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchCancel(event) {
    if (this.destroyed) return;
    
    for (const touch of event.changedTouches) {
      const touchObj = this.activeTouches.get(touch.identifier);
      if (touchObj) {
        this._returnTouchToPool(touchObj);
        this.activeTouches.delete(touch.identifier);
      }
    }
    
    this._emit('touchCancel', { timestamp: Date.now() });
  }

  // ===============================
  // GESTURE RECOGNITION
  // ===============================

  /**
   * Process touch move for gesture recognition
   * @param {Object} touchObj - Touch object
   * @private
   */
  _processTouchMove(touchObj) {
    // Implementation for move processing
    const distance = Math.sqrt(touchObj.deltaX ** 2 + touchObj.deltaY ** 2);
    
    if (distance > this.gestureThreshold) {
      this.gestureInProgress = true;
    }
  }

  /**
   * Recognize gesture from touch data
   * @param {Object} touchObj - Touch object
   * @param {number} duration - Touch duration
   * @param {number} distance - Touch distance
   * @private
   */
  _recognizeGesture(touchObj, duration, distance) {
    if (distance < this.gestureThreshold && duration < this.longPressDelay) {
      this._handleTap({ x: touchObj.currentX, y: touchObj.currentY });
    } else if (distance >= this.swipeMinDistance) {
      this._handleSwipe({
        startX: touchObj.startX,
        startY: touchObj.startY,
        endX: touchObj.currentX,
        endY: touchObj.currentY,
        distance,
        duration,
        direction: this._getSwipeDirection(touchObj.deltaX, touchObj.deltaY),
        velocity: distance / duration
      });
    }
  }

  /**
   * Handle tap gesture
   * @param {Object} position - Tap position
   * @private
   */
  _handleTap(position) {
    const currentTime = Date.now();
    
    // Check for double tap
    if (this.lastTapTime && 
        currentTime - this.lastTapTime < this.doubleTapDelay &&
        this.lastTapPosition &&
        Math.abs(position.x - this.lastTapPosition.x) < this.gestureThreshold &&
        Math.abs(position.y - this.lastTapPosition.y) < this.gestureThreshold) {
      
      this._handleDoubleTap(position);
      this.lastTapTime = 0; // Reset to prevent triple tap
      return;
    }
    
    this.lastTapTime = currentTime;
    this.lastTapPosition = position;
    
    // Handle game-specific tap actions
    this._handleGameTap(position);
    
    this.lastGesture = { type: 'tap', position, timestamp: currentTime };
    this._emit('gesture', this.lastGesture);
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('light');
  }

  /**
   * Handle double tap gesture
   * @param {Object} position - Double tap position
   * @private
   */
  _handleDoubleTap(position) {
    this.lastGesture = { type: 'doubleTap', position, timestamp: Date.now() };
    this._emit('gesture', this.lastGesture);
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');
  }

  /**
   * Handle swipe gesture
   * @param {Object} swipeData - Swipe gesture data
   * @private
   */
  _handleSwipe(swipeData) {
    this._handleGameSwipe(swipeData);
    
    this.lastGesture = { type: 'swipe', ...swipeData, timestamp: Date.now() };
    this._emit('gesture', this.lastGesture);
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('light');
  }

  /**
   * Handle long press gesture
   * @param {Object} position - Long press position
   * @private
   */
  _handleLongPress(position) {
    this.lastGesture = { type: 'longPress', position, timestamp: Date.now() };
    this._emit('gesture', this.lastGesture);
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('heavy');
  }

  /**
   * Handle pinch gesture
   * @param {Object} pinchData - Pinch gesture data
   * @private
   */
  _handlePinch(pinchData) {
    this.lastGesture = { type: 'pinch', ...pinchData, timestamp: Date.now() };
    this._emit('gesture', this.lastGesture);
  }

  /**
   * Setup long press detection for touch
   * @param {Object} touchObj - Touch object
   * @private
   */
  _setupLongPressDetection(touchObj) {
    // Clear any existing timer for this touch
    if (touchObj.gestureData.longPressTimer) {
      clearTimeout(touchObj.gestureData.longPressTimer);
    }
    
    touchObj.gestureData.longPressTimer = setTimeout(() => {
      if (touchObj.isActive && 
          this.activeTouches.has(touchObj.id) &&
          Math.sqrt(touchObj.deltaX ** 2 + touchObj.deltaY ** 2) < this.gestureThreshold) {
        this._handleLongPress({ x: touchObj.currentX, y: touchObj.currentY });
      }
      touchObj.gestureData.longPressTimer = null;
    }, this.longPressDelay);
  }

  /**
   * Handle multi-touch gestures
   * @private
   */
  _handleMultiTouchGestures() {
    if (this.activeTouches.size === 2) {
      const touches = Array.from(this.activeTouches.values());
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      // Calculate pinch data
      const currentDistance = Math.sqrt(
        (touch2.currentX - touch1.currentX) ** 2 + 
        (touch2.currentY - touch1.currentY) ** 2
      );
      
      const initialDistance = Math.sqrt(
        (touch2.startX - touch1.startX) ** 2 + 
        (touch2.startY - touch1.startY) ** 2
      );
      
      const scale = currentDistance / initialDistance;
      const center = {
        x: (touch1.currentX + touch2.currentX) / 2,
        y: (touch1.currentY + touch2.currentY) / 2
      };
      
      if (Math.abs(scale - 1) > 0.1) { // 10% threshold
        this._handlePinch({ scale, center });
      }
    }
  }

  /**
   * Get swipe direction
   * @param {number} deltaX - X delta
   * @param {number} deltaY - Y delta
   * @returns {string} Direction
   * @private
   */
  _getSwipeDirection(deltaX, deltaY) {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  // ===============================
  // GAME-SPECIFIC TOUCH HANDLING
  // ===============================

  /**
   * Handle game-specific tap actions
   * @param {Object} position - Touch position
   * @private
   */
  _handleGameTap(position) {
    if (this.currentMode !== 'fishing' || !this.player) return;
    
    // TEMP DISABLE: Auto-reeling on tap - let player control when to reel
    // If player is casting, tap starts reeling
    // if (this.player.isCasting && this.isInReelingZone(position.x, position.y)) {
    //   this.player.handleTouchReel();
    //   return;
    // }
  }

  /**
   * Handle game-specific swipe actions
   * @param {Object} swipeData - Swipe data
   * @private
   */
  _handleGameSwipe(swipeData) {
    if (this.currentMode !== 'fishing' || !this.player) return;
    
    // If swipe starts near player and moves significantly, it's a cast
    if (this.isInCastingZone(swipeData.startX, swipeData.startY) && 
        swipeData.distance >= this.swipeMinDistance) {
      
      const startPos = { x: swipeData.startX, y: swipeData.startY };
      const endPos = { x: swipeData.endX, y: swipeData.endY };
      
      this.player.handleTouchCast(startPos, endPos);
    }
  }

  // ===============================
  // TOUCH ZONES
  // ===============================

  /**
   * Get casting zone
   * @returns {Object} Casting zone bounds
   */
  getCastingZone() {
    return { ...this.touchZones.casting };
  }

  /**
   * Get reeling zone
   * @returns {Object} Reeling zone bounds
   */
  getReelingZone() {
    return { ...this.touchZones.reeling };
  }

  /**
   * Check if position is in casting zone
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if in casting zone
   */
  isInCastingZone(x, y) {
    const zone = this.touchZones.casting;
    return x >= zone.x && x <= zone.x + zone.width &&
           y >= zone.y && y <= zone.y + zone.height;
  }

  /**
   * Check if position is in reeling zone
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if in reeling zone
   */
  isInReelingZone(x, y) {
    const zone = this.touchZones.reeling;
    return x >= zone.x && x <= zone.x + zone.width &&
           y >= zone.y && y <= zone.y + zone.height;
  }

  /**
   * Check if position is in game area
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if in game area
   * @private
   */
  _isInGameArea(x, y) {
    const rect = this.canvas?.getBoundingClientRect() || { width: 375, height: 667 };
    return x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
  }

  // ===============================
  // MOBILE OPTIMIZATIONS
  // ===============================

  /**
   * Adapt to screen size
   * @param {Object} screenSize - Screen dimensions
   */
  adaptToScreenSize(screenSize) {
    if (screenSize.width < 375) { // Small screen
      this.gestureThreshold = Math.max(5, this.gestureThreshold * 0.7);
      this.swipeMinDistance = Math.max(30, this.swipeMinDistance * 0.8);
    }
    
    // Update touch zones
    this.touchZones = this._initializeTouchZones();
  }

  /**
   * Handle orientation change
   * @private
   */
  _handleOrientationChange() {
    // Clear any existing orientation timer
    if (this.orientationTimer) {
      clearTimeout(this.orientationTimer);
    }
    
    this.orientationTimer = setTimeout(() => {
      this.orientation = this._getOrientation();
      this._updateCanvasProperties();
      this.touchZones = this._initializeTouchZones();
      
      this._emit('orientationChange', { orientation: this.orientation });
      this.orientationTimer = null;
    }, 100); // Delay to ensure layout update
  }

  /**
   * Adjust for device pixel ratio
   * @param {number} dpr - Device pixel ratio
   * @private
   */
  _adjustForDevicePixelRatio(dpr) {
    this.touchSensitivity *= (1 / Math.max(1, dpr / 2));
  }

  /**
   * Trigger haptic feedback
   * @param {string} type - Feedback type ('light', 'medium', 'heavy')
   */
  triggerHapticFeedback(type) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }

  // ===============================
  // ACCESSIBILITY SUPPORT
  // ===============================

  /**
   * Enable audio feedback
   * @param {boolean} enabled - Enable audio feedback
   */
  enableAudioFeedback(enabled) {
    this.audioFeedbackEnabled = enabled;
  }

  /**
   * Set reduced motion preference
   * @param {boolean} reduced - Reduce motion
   */
  setReducedMotion(reduced) {
    this.reducedMotion = reduced;
    if (reduced) {
      this.gestureThreshold *= 1.5; // Higher threshold for reduced motion
    }
  }

  /**
   * Enable assistive mode
   * @param {boolean} enabled - Enable assistive mode
   */
  enableAssistiveMode(enabled) {
    this.assistiveMode = enabled;
    if (enabled) {
      this.doubleTapDelay *= 1.5; // Longer delay for assistive technology
    }
  }

  /**
   * Handle assistive touch
   * @param {Object} touchData - Touch data
   * @private
   */
  _handleAssistiveTouch(touchData) {
    // Enhanced touch handling for assistive technology
    this._emit('assistiveTouch', touchData);
  }

  // ===============================
  // CONFIGURATION
  // ===============================

  /**
   * Set gesture threshold
   * @param {number} threshold - Gesture threshold
   * @returns {TouchController} This instance for chaining
   */
  setGestureThreshold(threshold) {
    if (threshold <= 0) {
      throw new Error('Gesture threshold must be positive');
    }
    this.gestureThreshold = threshold;
    return this;
  }

  /**
   * Set touch sensitivity
   * @param {number} sensitivity - Touch sensitivity
   * @returns {TouchController} This instance for chaining
   */
  setSensitivity(sensitivity) {
    if (sensitivity < 0) {
      throw new Error('Touch sensitivity must be non-negative');
    }
    this.touchSensitivity = sensitivity;
    return this;
  }

  /**
   * Add custom gesture handler
   * @param {string} name - Gesture name
   * @param {Function} handler - Gesture handler
   * @returns {TouchController} This instance for chaining
   */
  addCustomGesture(name, handler) {
    this.customGestures[name] = handler;
    return this;
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get touch coordinates relative to canvas
   * @param {Touch} touch - Touch object
   * @returns {Object} Coordinates
   * @private
   */
  _getTouchCoordinates(touch) {
    return {
      x: (touch.clientX - this.canvasOffset.x) / this.canvasScale,
      y: (touch.clientY - this.canvasOffset.y) / this.canvasScale
    };
  }

  /**
   * Get touch from pool
   * @returns {Object} Touch object
   * @private
   */
  _getTouchFromPool() {
    const touch = this.touchPool.pop() || this._createTouchObject();
    touch.reset();
    return touch;
  }

  /**
   * Return touch to pool
   * @param {Object} touch - Touch object
   * @private
   */
  _returnTouchToPool(touch) {
    if (this.touchPool.length < this.maxTouches * 2) {
      this.touchPool.push(touch);
    }
  }

  /**
   * Cleanup inactive touches
   * @param {number} currentTime - Current timestamp
   * @private
   */
  _cleanupInactiveTouches(currentTime) {
    for (const [id, touch] of this.activeTouches) {
      if (currentTime - touch.lastMoveTime > this.touchTimeout) {
        this._returnTouchToPool(touch);
        this.activeTouches.delete(id);
      }
    }
  }

  // ===============================
  // EVENT SYSTEM
  // ===============================

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {TouchController} This instance for chaining
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    return this;
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {TouchController} This instance for chaining
   */
  off(event, callback) {
    if (!this.eventListeners[event]) return this;
    
    const index = this.eventListeners[event].indexOf(callback);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
    return this;
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
        console.warn('TouchController: Error in event callback:', error);
      }
    });
  }

  // ===============================
  // MOUSE EVENT HANDLERS (Desktop Support)
  // ===============================

  /**
   * Handle mouse down event - simulate touch start
   * @param {MouseEvent} event Mouse down event
   * @private
   */
  _handleMouseDown(event) {
    if (!this.isEnabled || this.destroyed) return;
    
    event.preventDefault();
    
    // Skip if touch events are active (hybrid devices)
    if (this.activeTouches.size > 0) return;
    
    this.mouseDown = true;
    
    // Create simulated touch from mouse
    const mouseTouch = this._createMouseTouch(event);
    if (!mouseTouch) return;
    
    this.mouseTouch = mouseTouch;
    this.activeTouches.set('mouse', mouseTouch);
    
    // Process as touch start
    this._processMouseAsTouch(mouseTouch, 'start');
  }

  /**
   * Handle mouse move event - simulate touch move
   * @param {MouseEvent} event Mouse move event
   * @private
   */
  _handleMouseMove(event) {
    if (!this.isEnabled || this.destroyed || !this.mouseDown || !this.mouseTouch) return;
    
    event.preventDefault();
    
    // Throttle for performance
    const currentTime = performance.now();
    if (this.moveThrottle && currentTime - this.lastMoveTime < this.throttleInterval) {
      return;
    }
    this.lastMoveTime = currentTime;
    
    // Update mouse touch coordinates
    const coordinates = this._getMouseCoordinates(event);
    if (!coordinates) return;
    
    this.mouseTouch.previousX = this.mouseTouch.currentX;
    this.mouseTouch.previousY = this.mouseTouch.currentY;
    this.mouseTouch.currentX = coordinates.x;
    this.mouseTouch.currentY = coordinates.y;
    this.mouseTouch.deltaX = this.mouseTouch.currentX - this.mouseTouch.previousX;
    this.mouseTouch.deltaY = this.mouseTouch.currentY - this.mouseTouch.previousY;
    this.mouseTouch.lastMoveTime = currentTime;
    
    // Process as touch move
    this._processMouseAsTouch(this.mouseTouch, 'move');
  }

  /**
   * Handle mouse up/leave event - simulate touch end
   * @param {MouseEvent} event Mouse up/leave event
   * @private
   */
  _handleMouseUp(event) {
    if (!this.isEnabled || this.destroyed || !this.mouseDown || !this.mouseTouch) return;
    
    event.preventDefault();
    
    this.mouseDown = false;
    
    // Process as touch end
    this._processMouseAsTouch(this.mouseTouch, 'end');
    
    // Clean up mouse touch
    this.activeTouches.delete('mouse');
    this._returnTouchToPool(this.mouseTouch);
    this.mouseTouch = null;
  }

  /**
   * Create simulated touch object from mouse event
   * @param {MouseEvent} event Mouse event
   * @returns {Object|null} Touch object or null if failed
   * @private
   */
  _createMouseTouch(event) {
    const coordinates = this._getMouseCoordinates(event);
    if (!coordinates) return null;
    
    const touchObj = this._getTouchFromPool();
    if (!touchObj) return null;
    
    const currentTime = performance.now();
    
    touchObj.id = 'mouse';
    touchObj.startX = coordinates.x;
    touchObj.startY = coordinates.y;
    touchObj.currentX = coordinates.x;
    touchObj.currentY = coordinates.y;
    touchObj.previousX = coordinates.x;
    touchObj.previousY = coordinates.y;
    touchObj.deltaX = 0;
    touchObj.deltaY = 0;
    touchObj.startTime = currentTime;
    touchObj.lastMoveTime = currentTime;
    touchObj.isActive = true;
    touchObj.gestureData = {};
    
    return touchObj;
  }

  /**
   * Get mouse coordinates relative to canvas
   * @param {MouseEvent} event Mouse event
   * @returns {Object|null} Coordinates {x, y} or null if invalid
   * @private
   */
  _getMouseCoordinates(event) {
    if (!this.canvas) return null;
    
    this._updateCanvasProperties();
    
    // Calculate coordinates relative to canvas
    const x = (event.clientX - this.canvasOffset.x) / this.canvasScale;
    const y = (event.clientY - this.canvasOffset.y) / this.canvasScale;
    
    // Validate coordinates are within canvas bounds
    const canvasWidth = this.canvas.width || this.canvas.clientWidth;
    const canvasHeight = this.canvas.height || this.canvas.clientHeight;
    
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
      return null;
    }
    
    return { x, y };
  }

  /**
   * Process mouse event as touch event
   * @param {Object} mouseTouch Simulated touch object
   * @param {string} phase Event phase: 'start', 'move', 'end'
   * @private
   */
  _processMouseAsTouch(mouseTouch, phase) {
    if (!mouseTouch) return;
    
    const currentTime = performance.now();
    
    try {
      switch (phase) {
        case 'start':
          // Trigger haptic feedback for desktop mouse (if supported)
          this.triggerHapticFeedback('light');
          
          // Setup long press detection
          this._setupLongPressDetection(mouseTouch);
          
          // Emit touch start event
          this._emit('touchStart', {
            touches: [mouseTouch],
            position: { x: mouseTouch.currentX, y: mouseTouch.currentY },
            isSimulated: true
          });
          break;
          
        case 'move':
          // Process movement
          this._processTouchMove(mouseTouch);
          
          // Emit touch move event
          this._emit('touchMove', {
            touches: [mouseTouch],
            position: { x: mouseTouch.currentX, y: mouseTouch.currentY },
            delta: { x: mouseTouch.deltaX, y: mouseTouch.deltaY },
            isSimulated: true
          });
          break;
          
        case 'end':
          const duration = currentTime - mouseTouch.startTime;
          const distance = Math.sqrt(
            Math.pow(mouseTouch.currentX - mouseTouch.startX, 2) +
            Math.pow(mouseTouch.currentY - mouseTouch.startY, 2)
          );
          
          // Recognize gesture
          const gesture = this._recognizeGesture(mouseTouch, duration, distance);
          
          if (gesture) {
            this.lastGesture = gesture;
            this._handleMouseGesture(gesture, mouseTouch);
          }
          
          // Emit touch end event
          this._emit('touchEnd', {
            touches: [mouseTouch],
            position: { x: mouseTouch.currentX, y: mouseTouch.currentY },
            gesture,
            isSimulated: true
          });
          break;
      }
    } catch (error) {
      console.warn('Error processing mouse as touch:', error);
    }
  }

  /**
   * Handle mouse gesture recognition
   * @param {Object} gesture Recognized gesture
   * @param {Object} mouseTouch Mouse touch object
   * @private
   */
  _handleMouseGesture(gesture, mouseTouch) {
    const position = { x: mouseTouch.currentX, y: mouseTouch.currentY };
    
    switch (gesture.type) {
      case 'tap':
        this._handleTap(position);
        break;
        
      case 'double-tap':
        this._handleDoubleTap(position);
        break;
        
      case 'swipe':
        this._handleSwipe({
          direction: gesture.direction,
          distance: gesture.distance,
          velocity: gesture.velocity,
          startPosition: { x: mouseTouch.startX, y: mouseTouch.startY },
          endPosition: position
        });
        break;
        
      case 'long-press':
        this._handleLongPress(position);
        break;
        
      default:
        // Handle custom gestures
        if (this.customGestures[gesture.type]) {
          this.customGestures[gesture.type](gesture, position);
        }
        break;
    }
  }

  // ===============================
  // CLEANUP
  // ===============================

  /**
   * Destroy touch controller and cleanup resources
   */
  destroy() {
    this.destroyed = true;
    this.isEnabled = false;
    
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this._handleTouchStart);
      this.canvas.removeEventListener('touchmove', this._handleTouchMove);
      this.canvas.removeEventListener('touchend', this._handleTouchEnd);
      this.canvas.removeEventListener('touchcancel', this._handleTouchCancel);
      
      // Remove mouse event listeners
      this.canvas.removeEventListener('mousedown', this._handleMouseDown);
      this.canvas.removeEventListener('mousemove', this._handleMouseMove);
      this.canvas.removeEventListener('mouseup', this._handleMouseUp);
      this.canvas.removeEventListener('mouseleave', this._handleMouseUp);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this._handleOrientationChange);
      window.removeEventListener('resize', this._handleOrientationChange);
    }
    
    // Clear mouse state
    this.mouseDown = false;
    if (this.mouseTouch) {
      this._returnTouchToPool(this.mouseTouch);
      this.mouseTouch = null;
    }
    
    // Clear active touches
    for (const touch of this.activeTouches.values()) {
      this._returnTouchToPool(touch);
    }
    this.activeTouches.clear();
    
    // Clear touch pool
    this.touchPool = [];
    
    // Clear event listeners
    this.eventListeners = {};
    
    // Clear custom gestures
    this.customGestures = {};
    
    // Clear all pending timers
    this._clearAllTimers();
    
    this._emit('destroyed', this);
    
    return this;
  }
  
  /**
   * Clear all pending timers
   * @private
   */
  _clearAllTimers() {
    // Clear orientation timer
    if (this.orientationTimer) {
      clearTimeout(this.orientationTimer);
      this.orientationTimer = null;
    }
    
    // Clear any touch-related timers
    for (const touch of this.activeTouches.values()) {
      if (touch.gestureData && touch.gestureData.longPressTimer) {
        clearTimeout(touch.gestureData.longPressTimer);
        touch.gestureData.longPressTimer = null;
      }
    }
  }
} 