/**
 * Player - Fishing Hook System for Mobile Fish Game
 * Handles casting, hook physics, reeling, and fish catching mechanics
 * 
 * Features:
 * - Physics-based casting with power and angle
 * - Realistic hook movement with gravity and water resistance
 * - Line tension physics with breaking mechanics
 * - Fish collision detection and catching
 * - Mobile touch gesture integration
 * - Advanced fishing mechanics (power-ups, weather, skill)
 * - Performance optimizations for 60fps mobile gameplay
 */

import { MathUtils } from '../utils/MathUtils.js';

export class Player {
  constructor(options = {}) {
    // Position and basic properties
    this.x = options.x || 400;
    this.y = options.y || 50;
    this.isActive = true;
    this.destroyed = false;
    
    // Hook position and properties
    this.hookX = this.x;
    this.hookY = this.y;
    this.hookSize = options.hookSize || 8;
    this.hookVelocity = { x: 0, y: 0 };
    this.hookType = options.hookType || 'basic';
    this.hookEffectiveness = this._getHookEffectiveness(this.hookType);
    
    // Fishing line properties
    this.lineLength = 0;
    this.maxLineLength = options.maxLineLength || 300;
    this.lineWeight = options.lineWeight || 0.1;
    this.lineTension = 0;
    this.lineBroken = false;
    
    // Physics system
    this.gravity = options.gravity || 0.3;
    this.waterLevel = options.waterLevel || 200;
    this.waterResistance = options.waterResistance || 0.85;
    this.airResistance = options.airResistance || 0.98;
    
    // Casting system
    this.isCasting = false;
    this.castingPower = options.castingPower || 5;
    this.maxCastingPower = options.maxCastingPower || 10;
    this.castingAngle = 0;
    this.castCount = 0;
    
    // Reeling system
    this.isReeling = false;
    this.reelingSpeed = options.reelingSpeed || 3;
    this.reelingDistance = 10; // Minimum distance to complete reeling
    
    // Game mechanics
    this.caughtFish = [];
    this.totalScore = 0;
    this.fishesCaught = 0;
    
    // Environment and conditions
    this.environment = options.environment || 'shallow_water';
    this.weather = options.weather || 'calm';
    this.weatherEffects = this._getWeatherEffects(this.weather);
    
    // Power-ups and effects
    this.activePowerUps = [];
    this.powerUpEffects = {};
    
    // Event system
    this.eventListeners = {};
    
    // Mobile optimizations
    this.touchCastSensitivity = options.touchCastSensitivity || 20;
    this.touchReelThreshold = options.touchReelThreshold || 5;
    
    // Performance tracking
    this.lastUpdateTime = 0;
    this.updateOptimization = true;
    
    // Initialize physics constraints
    this._applyEnvironmentEffects();
  }

  // ===============================
  // INITIALIZATION & SETUP
  // ===============================

  /**
   * Get hook effectiveness based on type
   * @param {string} hookType - Type of hook
   * @returns {number} Effectiveness multiplier
   * @private
   */
  _getHookEffectiveness(hookType) {
    const effectiveness = {
      basic: 1.0,
      silver_hook: 1.2,
      golden_hook: 1.5,
      diamond_hook: 2.0,
      legendary_hook: 3.0
    };
    return effectiveness[hookType] || 1.0;
  }

  /**
   * Get weather effects
   * @param {string} weather - Weather condition
   * @returns {Object} Weather effects
   * @private
   */
  _getWeatherEffects(weather) {
    const effects = {
      calm: { windForce: 0, visibility: 1.0, fishActivity: 1.0 },
      windy: { windForce: 2, visibility: 0.8, fishActivity: 0.7 },
      stormy: { windForce: 5, visibility: 0.5, fishActivity: 0.3 },
      foggy: { windForce: 0, visibility: 0.3, fishActivity: 1.2 }
    };
    return effects[weather] || effects.calm;
  }

  /**
   * Apply environment-specific effects
   * @private
   */
  _applyEnvironmentEffects() {
    switch (this.environment) {
      case 'shallow_water':
        this.waterResistance = 0.85;
        this.maxLineLength *= 0.8;
        break;
      case 'deep_water':
        this.waterResistance = 0.9;
        this.gravity *= 1.2;
        break;
      case 'fast_current':
        this.waterResistance = 0.7;
        this.hookVelocity.x += 1; // Current effect
        break;
    }
  }

  // ===============================
  // CASTING SYSTEM
  // ===============================

  /**
   * Cast the fishing line
   * @param {number} power - Casting power (0-maxCastingPower)
   * @param {number} angle - Casting angle in radians
   */
  cast(power, angle) {
    if (this.destroyed || this.isCasting || this.isReeling) return;
    
    // Normalize inputs
    this.castingPower = MathUtils.clamp(power, 0, this.maxCastingPower);
    this.castingAngle = MathUtils.normalizeAngle(angle);
    
    // Apply weather effects
    if (this.weatherEffects.windForce > 0) {
      const windEffect = this.weatherEffects.windForce * 0.1;
      this.castingAngle += MathUtils.randomRange(-windEffect, windEffect);
      this.castingAngle = MathUtils.normalizeAngle(this.castingAngle);
    }
    
    // Calculate initial velocity
    this.hookVelocity.x = this.castingPower * Math.cos(this.castingAngle);
    this.hookVelocity.y = this.castingPower * Math.sin(this.castingAngle);
    
    // Start casting
    this.isCasting = true;
    this.lineBroken = false;
    this.castCount++;
    
    this._emit('castStarted', {
      power: this.castingPower,
      angle: this.castingAngle,
      count: this.castCount
    });
  }

  /**
   * Handle touch-based casting
   * @param {Object} startTouch - Touch start position
   * @param {Object} endTouch - Touch end position
   */
  handleTouchCast(startTouch, endTouch) {
    if (this.destroyed || this.isCasting || this.isReeling) return;
    
    const deltaX = endTouch.x - startTouch.x;
    const deltaY = endTouch.y - startTouch.y;
    
    // Calculate power from distance
    const distance = MathUtils.distance(startTouch, endTouch);
    const power = Math.min(distance / this.touchCastSensitivity, this.maxCastingPower);
    
    // Calculate angle from direction
    const angle = Math.atan2(deltaY, deltaX);
    
    this.cast(power, angle);
  }

  // ===============================
  // HOOK PHYSICS
  // ===============================

  /**
   * Update hook physics
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateHookPhysics(deltaTime) {
    if (!this.isCasting && !this.isReeling) return;
    
    const deltaSeconds = deltaTime / 1000;
    
    // Apply gravity
    this.hookVelocity.y += this.gravity * deltaSeconds * 60;
    
    // Apply resistance based on environment
    if (this.hookY < this.waterLevel) {
      // Air resistance
      this.hookVelocity.x *= this.airResistance;
      this.hookVelocity.y *= this.airResistance;
    } else {
      // Water resistance
      this.hookVelocity.x *= this.waterResistance;
      this.hookVelocity.y *= this.waterResistance;
    }
    
    // Apply weather effects
    if (this.weatherEffects.windForce > 0 && this.hookY < this.waterLevel) {
      this.hookVelocity.x += this.weatherEffects.windForce * 0.01;
    }
    
    // Update position
    this.hookX += this.hookVelocity.x * deltaSeconds * 60;
    this.hookY += this.hookVelocity.y * deltaSeconds * 60;
    
    // Update line length and tension
    this._updateLineLength();
    this._updateLineTension();
    
    // Handle line breaking
    if (this.lineLength > this.maxLineLength) {
      this._breakLine();
    }
    
    // Handle fish resistance if any caught
    if (this.caughtFish.length > 0) {
      this._applyFishResistance(deltaTime);
    }
  }

  /**
   * Update line length
   * @private
   */
  _updateLineLength() {
    this.lineLength = MathUtils.distance(
      { x: this.x, y: this.y },
      { x: this.hookX, y: this.hookY }
    );
  }

  /**
   * Update line tension
   * @private
   */
  _updateLineTension() {
    const tensionRatio = this.lineLength / this.maxLineLength;
    this.lineTension = MathUtils.clamp(tensionRatio, 0, 1);
    
    // Apply tension effects
    if (this.lineTension > 0.8) {
      const tensionForce = (this.lineTension - 0.8) * 0.5;
      const directionToPlayer = Math.atan2(
        this.y - this.hookY,
        this.x - this.hookX
      );
      
      this.hookVelocity.x += Math.cos(directionToPlayer) * tensionForce;
      this.hookVelocity.y += Math.sin(directionToPlayer) * tensionForce;
    }
  }

  /**
   * Break the fishing line
   * @private
   */
  _breakLine() {
    this.lineBroken = true;
    this.isCasting = false;
    this.isReeling = false;
    
    // Release caught fish
    this.caughtFish.forEach(fish => {
      if (fish.escape) fish.escape();
    });
    this.caughtFish = [];
    
    this._emit('lineBroken', { lineLength: this.lineLength });
    this._resetHook();
  }

  /**
   * Apply resistance from caught fish
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _applyFishResistance(deltaTime) {
    const totalResistance = this.caughtFish.reduce((sum, fish) => {
      return sum + (fish.weight || 1) * 0.1;
    }, 0);
    
    this.hookVelocity.x *= (1 - totalResistance);
    this.hookVelocity.y *= (1 - totalResistance);
  }

  // ===============================
  // REELING SYSTEM
  // ===============================

  /**
   * Start reeling in the line
   */
  startReeling() {
    if (this.destroyed || this.isReeling || !this.isCasting) return;
    
    this.isReeling = true;
    this.isCasting = false;
    
    this._emit('reelingStarted', { caughtFish: this.caughtFish.length });
  }

  /**
   * Stop reeling
   */
  stopReeling() {
    if (this.destroyed) return;
    
    this.isReeling = false;
    this._emit('reelingStopped');
  }

  /**
   * Handle touch-based reeling
   */
  handleTouchReel() {
    this.startReeling();
  }

  /**
   * Update reeling mechanics
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateReeling(deltaTime) {
    if (!this.isReeling) return;
    
    const deltaSeconds = deltaTime / 1000;
    
    // Calculate direction toward player
    const directionToPlayer = Math.atan2(
      this.y - this.hookY,
      this.x - this.hookX
    );
    
    // Apply reeling force
    let reelingForce = this.reelingSpeed;
    
    // Reduce force with fish resistance
    if (this.caughtFish.length > 0) {
      const resistance = this.caughtFish.length * 0.3;
      reelingForce *= (1 - resistance);
    }
    
    // Apply power-up effects
    if (this.powerUpEffects.reelingSpeed) {
      reelingForce *= this.powerUpEffects.reelingSpeed;
    }
    
    // Set velocity toward player
    this.hookVelocity.x = Math.cos(directionToPlayer) * reelingForce;
    this.hookVelocity.y = Math.sin(directionToPlayer) * reelingForce;
    
    // Check if reeling is complete
    if (this.lineLength <= this.reelingDistance) {
      this._completeReeling();
    }
  }

  /**
   * Complete the reeling process
   * @private
   */
  _completeReeling() {
    this.isReeling = false;
    this.isCasting = false;
    
    // Finalize caught fish
    this.caughtFish.forEach(fish => {
      this.totalScore += fish.getScore ? fish.getScore() : 10;
    });
    
    this.fishesCaught += this.caughtFish.length;
    
    this._emit('reelingComplete', {
      fishCaught: this.caughtFish.length,
      scoreGained: this.caughtFish.reduce((sum, fish) => 
        sum + (fish.getScore ? fish.getScore() : 10), 0)
    });
    
    this.caughtFish = [];
    this._resetHook();
  }

  /**
   * Reset hook to player position
   * @private
   */
  _resetHook() {
    this.hookX = this.x;
    this.hookY = this.y;
    this.hookVelocity = { x: 0, y: 0 };
    this.lineLength = 0;
    this.lineTension = 0;
  }

  // ===============================
  // FISH CATCHING
  // ===============================

  /**
   * Check collision with fish
   * @param {Object} fish - Fish object
   * @returns {boolean} True if collision detected
   */
  checkFishCollision(fish) {
    if (!fish || !fish.checkCollision || fish.isCaught) return false;
    
    const hookBounds = {
      x: this.hookX - this.hookSize / 2,
      y: this.hookY - this.hookSize / 2,
      width: this.hookSize,
      height: this.hookSize
    };
    
    return fish.checkCollision(hookBounds);
  }

  /**
   * Catch a fish
   * @param {Object} fish - Fish to catch
   */
  catchFish(fish) {
    if (this.destroyed || !fish || fish.isCaught || this.caughtFish.includes(fish)) return;
    
    // Apply hook effectiveness
    const catchChance = this.hookEffectiveness * this.weatherEffects.fishActivity;
    if (Math.random() > catchChance * 0.8) return; // 80% base catch rate
    
    // Catch the fish
    if (fish.catch) fish.catch();
    this.caughtFish.push(fish);
    
    // Update score immediately for feedback
    const score = fish.getScore ? fish.getScore() : 10;
    this.totalScore += score;
    this.fishesCaught++;
    
    this._emit('fishCaught', { fish, score });
  }

  /**
   * Handle fish escape during reeling
   * @param {Object} fish - Fish that might escape
   * @param {number} escapeChance - Probability of escape (0-1)
   */
  handleFishEscape(fish, escapeChance = 0.1) {
    if (Math.random() < escapeChance) {
      const index = this.caughtFish.indexOf(fish);
      if (index > -1) {
        this.caughtFish.splice(index, 1);
        if (fish.escape) fish.escape();
        
        // Subtract score
        const score = fish.getScore ? fish.getScore() : 10;
        this.totalScore = Math.max(0, this.totalScore - score);
        this.fishesCaught = Math.max(0, this.fishesCaught - 1);
        
        this._emit('fishEscaped', { fish, score });
      }
    }
  }

  // ===============================
  // GAME MECHANICS
  // ===============================

  /**
   * Get player statistics
   * @returns {Object} Player statistics
   */
  getStatistics() {
    const accuracy = this.castCount > 0 ? (this.fishesCaught / this.castCount) * 100 : 0;
    const averageScore = this.fishesCaught > 0 ? this.totalScore / this.fishesCaught : 0;
    
    return {
      totalScore: this.totalScore,
      fishesCaught: this.fishesCaught,
      castCount: this.castCount,
      accuracy: Math.round(accuracy * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      currentStreak: this._calculateStreak(),
      skillLevel: this.calculateSkill()
    };
  }

  /**
   * Calculate current fishing streak
   * @returns {number} Current streak
   * @private
   */
  _calculateStreak() {
    // Simple streak calculation - could be enhanced
    return Math.min(this.fishesCaught, 10);
  }

  /**
   * Calculate skill level based on performance
   * @returns {number} Skill level (0-100)
   */
  calculateSkill() {
    const stats = this.getStatistics();
    const accuracyWeight = 0.4;
    const scoreWeight = 0.3;
    const experienceWeight = 0.3;
    
    const accuracyScore = Math.min(stats.accuracy, 100);
    const scoreScore = Math.min(stats.averageScore * 2, 100);
    const experienceScore = Math.min(this.castCount * 2, 100);
    
    return Math.round(
      accuracyScore * accuracyWeight +
      scoreScore * scoreWeight +
      experienceScore * experienceWeight
    );
  }

  /**
   * Apply power-up effect
   * @param {Object} powerUp - Power-up object
   */
  applyPowerUp(powerUp) {
    if (this.destroyed || !powerUp) return;
    
    // Apply immediate effects
    Object.keys(powerUp.effect).forEach(property => {
      if (property === 'maxLineLength') {
        this.maxLineLength = powerUp.effect[property];
      } else if (property === 'reelingSpeed') {
        this.reelingSpeed = powerUp.effect[property];
      } else if (property === 'castingPower') {
        this.maxCastingPower = powerUp.effect[property];
      }
    });
    
    // Store power-up for duration tracking
    powerUp.startTime = Date.now();
    this.activePowerUps.push(powerUp);
    this.powerUpEffects[powerUp.type] = powerUp.effect;
    
    this._emit('powerUpApplied', powerUp);
  }

  /**
   * Update power-ups
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updatePowerUps(deltaTime) {
    const currentTime = Date.now();
    
    this.activePowerUps = this.activePowerUps.filter(powerUp => {
      const elapsed = currentTime - powerUp.startTime;
      
      if (elapsed >= powerUp.duration) {
        // Remove expired power-up effects
        delete this.powerUpEffects[powerUp.type];
        
        // Reset properties to defaults
        if (powerUp.effect.maxLineLength) {
          this.maxLineLength = 300; // Default value
        }
        if (powerUp.effect.reelingSpeed) {
          this.reelingSpeed = 3; // Default value
        }
        
        this._emit('powerUpExpired', powerUp);
        return false;
      }
      
      return true;
    });
  }

  /**
   * Set hook type
   * @param {string} hookType - Type of hook
   */
  setHookType(hookType) {
    this.hookType = hookType;
    this.hookEffectiveness = this._getHookEffectiveness(hookType);
  }

  /**
   * Set fishing environment
   * @param {string} environment - Environment type
   */
  setEnvironment(environment) {
    this.environment = environment;
    this._applyEnvironmentEffects();
  }

  /**
   * Set weather conditions
   * @param {string} weather - Weather type
   */
  setWeather(weather) {
    this.weather = weather;
    this.weatherEffects = this._getWeatherEffects(weather);
  }

  /**
   * Reset player state
   */
  reset() {
    this.isCasting = false;
    this.isReeling = false;
    this.lineBroken = false;
    this.caughtFish = [];
    this._resetHook();
    
    this._emit('playerReset');
  }

  // ===============================
  // PERFORMANCE OPTIMIZATIONS
  // ===============================

  /**
   * Check if hook is in viewport
   * @param {Object} viewport - Viewport bounds
   * @returns {boolean} True if in viewport
   */
  isHookInViewport(viewport) {
    return !(this.hookX < viewport.x - this.hookSize ||
             this.hookX > viewport.x + viewport.width + this.hookSize ||
             this.hookY < viewport.y - this.hookSize ||
             this.hookY > viewport.y + viewport.height + this.hookSize);
  }

  // ===============================
  // RENDERING
  // ===============================

  /**
   * Render player and fishing line
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (this.destroyed) return;
    
    ctx.save();
    
    // Render fishing line
    if (this.isCasting || this.isReeling) {
      this._renderLine(ctx);
    }
    
    // Render hook
    this._renderHook(ctx);
    
    // Render player (simple representation)
    this._renderPlayer(ctx);
    
    ctx.restore();
  }

  /**
   * Render fishing line
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  _renderLine(ctx) {
    // Set line color based on tension
    if (this.lineTension < 0.5) {
      ctx.strokeStyle = '#4a90e2'; // Blue for normal tension
    } else if (this.lineTension < 0.8) {
      ctx.strokeStyle = '#f5a623'; // Orange for medium tension
    } else {
      ctx.strokeStyle = '#d0021b'; // Red for high tension
    }
    
    ctx.lineWidth = Math.max(1, this.lineTension * 3);
    
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.hookX, this.hookY);
    ctx.stroke();
  }

  /**
   * Render hook
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  _renderHook(ctx) {
    ctx.save();
    
    // Apply underwater effects
    if (this.hookY > this.waterLevel) {
      ctx.globalAlpha = 0.7;
      ctx.shadowColor = 'rgba(0, 100, 200, 0.3)';
      ctx.shadowBlur = 5;
    }
    
    // Render hook based on type
    switch (this.hookType) {
      case 'golden_hook':
        ctx.fillStyle = '#ffd700';
        break;
      case 'silver_hook':
        ctx.fillStyle = '#c0c0c0';
        break;
      default:
        ctx.fillStyle = '#8b4513';
    }
    
    ctx.fillRect(
      this.hookX - this.hookSize / 2,
      this.hookY - this.hookSize / 2,
      this.hookSize,
      this.hookSize
    );
    
    ctx.restore();
  }

  /**
   * Render player
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  _renderPlayer(ctx) {
    // Simple player representation
    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - 5, this.y - 10, 10, 10);
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
        console.warn('Player: Error in event callback:', error);
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
    
    this.lastUpdateTime = deltaTime;
    
    // Update hook physics
    this._updateHookPhysics(deltaTime);
    
    // Update reeling
    this._updateReeling(deltaTime);
    
    // Update power-ups
    this._updatePowerUps(deltaTime);
  }

  /**
   * Destroy player and cleanup resources
   */
  destroy() {
    this.destroyed = true;
    this.isActive = false;
    
    // Release caught fish
    this.caughtFish.forEach(fish => {
      if (fish.escape) fish.escape();
    });
    
    this.caughtFish = [];
    this.activePowerUps = [];
    this.powerUpEffects = {};
    this.eventListeners = {};
    
    this._emit('destroyed', this);
  }
} 