/**
 * Fish - Fish Entity for Mobile Fish Game
 * Sprite-based animated entity with movement, collision detection, and game mechanics
 * 
 * Features:
 * - Sprite sheet animation with frame management
 * - Physics-based movement with bounds checking
 * - Collision detection using MathUtils
 * - Mobile optimizations and LOD system
 * - Event system for game interactions
 * - Object pooling support
 * - AI behaviors and schooling
 */

import { MathUtils } from '../utils/MathUtils.js';

export class Fish {
  constructor(options = {}) {
    // Position and dimensions
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 32;
    this.height = options.height || 32;
    this.scale = options.scale || 1;
    this.rotation = options.rotation || 0;
    this.opacity = options.opacity || 1;
    
    // Sprite management
    this.spriteSheet = options.spriteSheet || 'assets/fish-sprite.png';
    this.spriteLoader = options.spriteLoader;
    this.sprite = null;
    this.spriteLoaded = false;
    
    // Animation system
    this.frameWidth = options.frameWidth || 32;
    this.frameHeight = options.frameHeight || 32;
    this.frameCount = options.frameCount || 8;
    this.framesPerRow = options.framesPerRow || 8;
    this.currentFrame = 0;
    this.animationSpeed = options.animationSpeed || 150; // ms per frame
    this.lastFrameTime = 0;
    this.animationPaused = false;
    
    // Movement system
    this.speed = options.speed || 2;
    this.velocity = { 
      x: MathUtils.randomRange(-this.speed, this.speed),
      y: MathUtils.randomRange(-this.speed, this.speed)
    };
    this.direction = Math.atan2(this.velocity.y, this.velocity.x);
    this.bounds = options.bounds || {
      left: 0,
      right: 800,
      top: 0,
      bottom: 600
    };
    
    // Game mechanics
    this.isActive = true;
    this.isCaught = false;
    this.fishType = options.fishType || 'common';
    this.behavior = options.behavior || 'normal';
    this.rarity = this._getRarityValue(this.fishType);
    this.scoreValue = this._calculateBaseScore();
    
    // Performance optimizations
    this.lodLevel = 0; // Level of detail
    this.debugMode = false;
    this.destroyed = false;
    this.poolId = this._generatePoolId();
    
    // Mobile optimizations
    this.mobileMode = false;
    this.touchRadius = this.width; // Touch interaction radius
    
    // AI and behavior
    this.ai = null;
    this.schoolmates = [];
    this.threats = [];
    this.lastBehaviorUpdate = 0;
    this.behaviorUpdateInterval = 100; // ms
    
    // Event system
    this.eventListeners = {};
    
    // Initialize
    this._initializeMovement();
    if (this.spriteLoader) {
      this.loadSprites().catch(console.warn);
    }
  }

  // ===============================
  // INITIALIZATION
  // ===============================

  /**
   * Initialize movement parameters
   * @private
   */
  _initializeMovement() {
    // Randomize initial direction
    this.direction = MathUtils.randomRange(0, 2 * Math.PI);
    this.velocity = MathUtils.velocityFromAngle(this.direction, this.speed);
    
    // Apply behavior-specific modifications
    this._applyBehaviorModifications();
  }

  /**
   * Apply behavior-specific modifications
   * @private
   */
  _applyBehaviorModifications() {
    switch (this.behavior) {
      case 'aggressive':
        this.speed *= 1.5;
        this.animationSpeed *= 0.8; // Faster animation
        break;
      case 'lazy':
        this.speed *= 0.6;
        this.animationSpeed *= 1.3; // Slower animation
        break;
      case 'erratic':
        this.behaviorUpdateInterval = 50; // More frequent behavior changes
        break;
    }
  }

  /**
   * Generate unique pool ID for object pooling
   * @returns {string} Pool ID
   * @private
   */
  _generatePoolId() {
    return `fish_${this.fishType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get rarity value from fish type
   * @param {string} fishType - Fish type
   * @returns {number} Rarity multiplier
   * @private
   */
  _getRarityValue(fishType) {
    const rarityMap = {
      common: 1,
      uncommon: 2,
      rare: 5,
      epic: 10,
      legendary: 25
    };
    return rarityMap[fishType] || 1;
  }

  /**
   * Calculate base score value
   * @returns {number} Base score
   * @private
   */
  _calculateBaseScore() {
    const sizeMultiplier = (this.width + this.height) / 64; // Normalized to 32x32
    return Math.round(10 * this.rarity * sizeMultiplier);
  }

  // ===============================
  // SPRITE MANAGEMENT
  // ===============================

  /**
   * Load sprite sheets
   * @returns {Promise<void>}
   */
  async loadSprites() {
    if (!this.spriteLoader) {
      throw new Error('SpriteLoader is required for Fish');
    }

    try {
      this.sprite = await this.spriteLoader.loadImage(this.spriteSheet);
      this.spriteLoaded = true;
      this._emit('spriteLoaded', this.sprite);
    } catch (error) {
      // Try fallback sprite
      try {
        this.sprite = await this.spriteLoader.loadImage('assets/fallback-fish.png');
        this.spriteLoaded = true;
        this._emit('spriteLoaded', this.sprite);
      } catch (fallbackError) {
        this.spriteLoaded = false;
        throw error;
      }
    }
  }

  /**
   * Get sprite frame coordinates
   * @param {number} frameIndex - Frame index
   * @returns {Object} Frame coordinates
   */
  getSpriteFrame(frameIndex) {
    // Clamp frame index
    const frame = MathUtils.clamp(frameIndex, 0, this.frameCount - 1);
    
    const row = Math.floor(frame / this.framesPerRow);
    const col = frame % this.framesPerRow;
    
    return {
      x: col * this.frameWidth,
      y: row * this.frameHeight,
      width: this.frameWidth,
      height: this.frameHeight
    };
  }

  // ===============================
  // ANIMATION SYSTEM
  // ===============================

  /**
   * Update animation
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateAnimation(deltaTime) {
    if (this.animationPaused || this.lodLevel > 2) return;
    
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      this.lastFrameTime = 0;
    }
  }

  /**
   * Set animation speed
   * @param {number} speed - Animation speed in ms per frame
   */
  setAnimationSpeed(speed) {
    this.animationSpeed = Math.max(50, speed); // Minimum 50ms per frame
  }

  /**
   * Pause animation
   */
  pauseAnimation() {
    this.animationPaused = true;
  }

  /**
   * Resume animation
   */
  resumeAnimation() {
    this.animationPaused = false;
  }

  // ===============================
  // MOVEMENT SYSTEM
  // ===============================

  /**
   * Update position and movement
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateMovement(deltaTime) {
    if (!this.isActive || this.isCaught) return;
    
    const deltaSeconds = deltaTime / 1000;
    
    // Update position
    this.x += this.velocity.x * deltaSeconds * 60; // Normalize to 60fps
    this.y += this.velocity.y * deltaSeconds * 60;
    
    // Handle bounds collision
    this._handleBoundsCollision();
    
    // Update rotation based on movement direction
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
      this.direction = this.rotation;
    }
    
    // Apply behavior-specific movement patterns
    this._updateBehaviorMovement(deltaTime);
  }

  /**
   * Handle bounds collision
   * @private
   */
  _handleBoundsCollision() {
    const halfWidth = (this.width * this.scale) / 2;
    const halfHeight = (this.height * this.scale) / 2;
    
    // Left/Right bounds
    if (this.x - halfWidth < this.bounds.left) {
      this.x = this.bounds.left + halfWidth;
      this.velocity.x = Math.abs(this.velocity.x);
    } else if (this.x + halfWidth > this.bounds.right) {
      this.x = this.bounds.right - halfWidth;
      this.velocity.x = -Math.abs(this.velocity.x);
    }
    
    // Top/Bottom bounds
    if (this.y - halfHeight < this.bounds.top) {
      this.y = this.bounds.top + halfHeight;
      this.velocity.y = Math.abs(this.velocity.y);
    } else if (this.y + halfHeight > this.bounds.bottom) {
      this.y = this.bounds.bottom - halfHeight;
      this.velocity.y = -Math.abs(this.velocity.y);
    }
  }

  /**
   * Update behavior-specific movement
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateBehaviorMovement(deltaTime) {
    this.lastBehaviorUpdate += deltaTime;
    
    if (this.lastBehaviorUpdate < this.behaviorUpdateInterval) return;
    this.lastBehaviorUpdate = 0;
    
    switch (this.behavior) {
      case 'erratic':
        this._applyErraticBehavior();
        break;
      case 'schooling':
        this._applySchoolingBehavior();
        break;
      case 'avoidance':
        this._applyAvoidanceBehavior();
        break;
    }
    
    // Apply AI if available
    if (this.ai) {
      this.ai.update(this, deltaTime);
    }
  }

  /**
   * Apply erratic movement behavior
   * @private
   */
  _applyErraticBehavior() {
    if (Math.random() < 0.3) { // 30% chance to change direction
      const newDirection = this.direction + MathUtils.randomRange(-Math.PI / 4, Math.PI / 4);
      this.velocity = MathUtils.velocityFromAngle(newDirection, this.speed);
      this.direction = newDirection;
    }
  }

  /**
   * Apply schooling behavior
   * @private
   */
  _applySchoolingBehavior() {
    if (this.schoolmates.length === 0) return;
    
    let avgX = 0, avgY = 0, avgVelX = 0, avgVelY = 0;
    let count = 0;
    
    this.schoolmates.forEach(mate => {
      if (mate.isActive && !mate.isCaught) {
        const distance = MathUtils.distance(this, mate);
        if (distance < 100) { // Schooling radius
          avgX += mate.x;
          avgY += mate.y;
          avgVelX += mate.velocity.x;
          avgVelY += mate.velocity.y;
          count++;
        }
      }
    });
    
    if (count > 0) {
      avgX /= count;
      avgY /= count;
      avgVelX /= count;
      avgVelY /= count;
      
      // Influence movement toward school center
      const influence = 0.1;
      const directionToCenter = Math.atan2(avgY - this.y, avgX - this.x);
      
      this.velocity.x = MathUtils.lerp(this.velocity.x, avgVelX, influence);
      this.velocity.y = MathUtils.lerp(this.velocity.y, avgVelY, influence);
      
      // Slight attraction to center
      this.velocity.x += Math.cos(directionToCenter) * influence * this.speed;
      this.velocity.y += Math.sin(directionToCenter) * influence * this.speed;
      
      // Maintain speed
      const currentSpeed = MathUtils.magnitude(this.velocity);
      if (currentSpeed > 0) {
        this.velocity = MathUtils.multiplyVector(
          MathUtils.normalize(this.velocity), 
          this.speed
        );
      }
    }
  }

  /**
   * Apply avoidance behavior
   * @private
   */
  _applyAvoidanceBehavior() {
    this.threats.forEach(threat => {
      const distance = MathUtils.distance(this, threat);
      if (distance < threat.radius) {
        const avoidanceDirection = Math.atan2(this.y - threat.y, this.x - threat.x);
        const avoidanceForce = (threat.radius - distance) / threat.radius;
        
        this.velocity.x += Math.cos(avoidanceDirection) * avoidanceForce * this.speed;
        this.velocity.y += Math.sin(avoidanceDirection) * avoidanceForce * this.speed;
        
        // Limit velocity
        const currentSpeed = MathUtils.magnitude(this.velocity);
        if (currentSpeed > this.speed * 2) {
          this.velocity = MathUtils.multiplyVector(
            MathUtils.normalize(this.velocity), 
            this.speed * 2
          );
        }
      }
    });
  }

  /**
   * Set position manually
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Set velocity manually
   * @param {number} vx - X velocity
   * @param {number} vy - Y velocity
   */
  setVelocity(vx, vy) {
    this.velocity.x = vx;
    this.velocity.y = vy;
    this.direction = Math.atan2(vy, vx);
  }

  // ===============================
  // COLLISION DETECTION
  // ===============================

  /**
   * Check collision with point, rectangle, or circle
   * @param {Object} target - Target object to check collision with
   * @returns {boolean} True if collision detected
   */
  checkCollision(target) {
    if (target.radius !== undefined) {
      // Circle collision
      const fishCenter = {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2
      };
      return MathUtils.pointInCircle(fishCenter, target);
    } else if (target.width !== undefined && target.height !== undefined) {
      // Rectangle collision
      const fishBounds = this.getBounds();
      return MathUtils.rectangleCollision(fishBounds, target);
    } else {
      // Point collision
      return MathUtils.pointInRectangle(target, this.getBounds());
    }
  }

  /**
   * Get bounding box
   * @returns {Object} Bounding box coordinates
   */
  getBounds() {
    const scaledWidth = this.width * this.scale;
    const scaledHeight = this.height * this.scale;
    
    return {
      left: this.x,
      top: this.y,
      right: this.x + scaledWidth,
      bottom: this.y + scaledHeight,
      x: this.x,
      y: this.y,
      width: scaledWidth,
      height: scaledHeight
    };
  }

  // ===============================
  // GAME MECHANICS
  // ===============================

  /**
   * Handle being caught
   */
  catch() {
    this.isCaught = true;
    this.isActive = false;
    this.velocity = { x: 0, y: 0 };
    this._emit('caught', this);
  }

  /**
   * Handle escaping
   */
  escape() {
    this.isCaught = false;
    this.isActive = true;
    this._initializeMovement();
    this._emit('escaped', this);
  }

  /**
   * Get score value
   * @returns {number} Score value
   */
  getScore() {
    let multiplier = 1;
    
    // Size bonus
    const sizeBonus = (this.width + this.height) / 64;
    multiplier *= sizeBonus;
    
    // Behavior bonus
    switch (this.behavior) {
      case 'aggressive':
        multiplier *= 1.5;
        break;
      case 'erratic':
        multiplier *= 1.3;
        break;
    }
    
    return Math.round(this.scoreValue * multiplier);
  }

  /**
   * Set behavior pattern
   * @param {string} behavior - Behavior type
   */
  setBehavior(behavior) {
    this.behavior = behavior;
    this._applyBehaviorModifications();
  }

  // ===============================
  // AI AND SCHOOLING
  // ===============================

  /**
   * Add fish to school
   * @param {Array<Fish>} schoolmates - Array of fish to school with
   */
  addToSchool(schoolmates) {
    this.schoolmates = schoolmates;
    this.setBehavior('schooling');
  }

  /**
   * Add threat to avoid
   * @param {Object} threat - Threat object with x, y, radius
   */
  addThreat(threat) {
    this.threats.push(threat);
    this.setBehavior('avoidance');
  }

  /**
   * Set custom AI
   * @param {Object} ai - AI object with update method
   */
  setAI(ai) {
    this.ai = ai;
  }

  // ===============================
  // RENDERING
  // ===============================

  /**
   * Render fish to canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (this.destroyed || !this.isActive) return;
    
    ctx.save();
    
    // Apply transformations
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    
    if (this.opacity < 1) {
      ctx.globalAlpha = this.opacity;
    }
    
    if (this.spriteLoaded && this.sprite) {
      const frame = this.getSpriteFrame(this.currentFrame);
      
      ctx.drawImage(
        this.sprite,
        frame.x, frame.y, frame.width, frame.height,
        -this.width / 2, -this.height / 2, this.width, this.height
      );
    } else if (this.debugMode) {
      // Render placeholder rectangle
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
    
    ctx.restore();
    
    // Render debug information
    if (this.debugMode) {
      this._renderDebugInfo(ctx);
    }
  }

  /**
   * Render debug information
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  _renderDebugInfo(ctx) {
    const bounds = this.getBounds();
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Velocity vector
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
    ctx.lineTo(
      this.x + this.width / 2 + this.velocity.x * 10,
      this.y + this.height / 2 + this.velocity.y * 10
    );
    ctx.stroke();
  }

  // ===============================
  // PERFORMANCE OPTIMIZATIONS
  // ===============================

  /**
   * Check if fish is in viewport
   * @param {Object} viewport - Viewport bounds
   * @returns {boolean} True if in viewport
   */
  isInViewport(viewport) {
    const bounds = this.getBounds();
    
    return !(bounds.right < viewport.x || 
             bounds.left > viewport.x + viewport.width ||
             bounds.bottom < viewport.y || 
             bounds.top > viewport.y + viewport.height);
  }

  /**
   * Set level of detail based on distance
   * @param {number} distance - Distance from camera
   */
  setLOD(distance) {
    if (distance < 200) {
      this.lodLevel = 0; // Full detail
    } else if (distance < 500) {
      this.lodLevel = 1; // Reduced animation
    } else if (distance < 1000) {
      this.lodLevel = 2; // Very reduced animation
    } else {
      this.lodLevel = 3; // No animation
    }
  }

  /**
   * Get pool ID for object pooling
   * @returns {string} Pool ID
   */
  getPoolId() {
    return this.poolId;
  }

  /**
   * Reset fish for object pooling
   */
  reset() {
    this.isActive = false;
    this.isCaught = false;
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.velocity = { x: 0, y: 0 };
    this.schoolmates = [];
    this.threats = [];
    this.ai = null;
    this.destroyed = false;
  }

  // ===============================
  // MOBILE OPTIMIZATIONS
  // ===============================

  /**
   * Adapt to mobile viewport
   * @param {Object} viewport - Mobile viewport dimensions
   */
  adaptToViewport(viewport) {
    if (viewport.width < 500) { // Mobile screen
      this.scale = Math.min(this.scale, 0.8);
      this.setMobileMode(true);
    }
  }

  /**
   * Set mobile mode optimizations
   * @param {boolean} enabled - Enable mobile mode
   */
  setMobileMode(enabled) {
    this.mobileMode = enabled;
    
    if (enabled) {
      this.animationSpeed = Math.max(this.animationSpeed, 200); // Slower animation
      this.lodLevel = Math.max(this.lodLevel, 1); // Reduce detail
      this.behaviorUpdateInterval = Math.max(this.behaviorUpdateInterval, 150); // Less frequent updates
    }
  }

  /**
   * Handle touch interaction
   * @param {Object} touch - Touch coordinates
   * @returns {boolean} True if touch hits fish
   */
  handleTouch(touch) {
    const distance = MathUtils.distance(
      { x: this.x + this.width / 2, y: this.y + this.height / 2 },
      touch
    );
    
    return distance <= this.touchRadius;
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
        console.warn('Fish: Error in event callback:', error);
      }
    });
  }

  // ===============================
  // UPDATE AND CLEANUP
  // ===============================

  /**
   * Main update method
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (this.destroyed) return;
    
    this._updateAnimation(deltaTime);
    this._updateMovement(deltaTime);
  }

  /**
   * Destroy fish and cleanup resources
   */
  destroy() {
    this.destroyed = true;
    this.isActive = false;
    this.sprite = null;
    this.spriteLoaded = false;
    this.eventListeners = {};
    this.schoolmates = [];
    this.threats = [];
    this.ai = null;
    
    this._emit('destroyed', this);
  }
} 