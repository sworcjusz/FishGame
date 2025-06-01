/**
 * Game - Main Game Engine for Mobile Fish Game
 * Coordinates all game systems and manages the main game loop
 * 
 * Features:
 * - 60fps mobile-optimized game loop
 * - State management (menu, playing, paused, gameOver)
 * - Integration of Fish, Player, and TouchController
 * - Performance monitoring and optimization
 * - Fish spawning and management system
 * - Score tracking and combo system
 * - Mobile-first rendering with viewport culling
 * - Battery life optimization
 */

import { Fish } from './Fish.js';
import { Player } from './Player.js';
import { TouchController } from './TouchController.js';
import { AudioManager } from './AudioManager.js';
import { GameUI } from '../ui/GameUI.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Game {
  constructor(options = {}) {
    console.log('Game constructor started with options:', options);
    
    // Canvas setup
    this.canvasId = options.canvasId || 'gameCanvas';
    this.canvas = this._getCanvas();
    this.ctx = this.canvas.getContext('2d');
    
    console.log('Canvas setup completed:', { canvasId: this.canvasId, canvas: this.canvas, ctx: this.ctx });
    
    // Game dimensions
    this.width = options.width || 375;
    this.height = options.height || 667;
    this._setupCanvas();
    
    // Game state
    this.gameState = 'menu'; // menu, playing, paused, gameOver, stopped
    this.isRunning = false;
    this.isPaused = false;
    this.destroyed = false;
    
    // Performance settings
    this.targetFPS = options.targetFPS || 60;
    this.maxDeltaTime = 1000 / 30; // Limit to 30fps minimum
    this.frameCount = 0;
    this.currentFPS = 0;
    this.lastFrameTime = 0;
    this.fpsHistory = [];
    this.animationFrameId = null;
    
    // Mobile detection and optimization
    this.isMobile = this._detectMobile();
    this.devicePixelRatio = window?.devicePixelRatio || 1;
    this.orientation = this._getOrientation();
    
    // Viewport setup
    this.viewport = {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height
    };
    
    // Game statistics
    this.stats = {
      score: 0,
      fishCaught: 0,
      casts: 0,
      accuracy: 0,
      playTime: 0,
      bestScore: this._loadBestScore()
    };
    
    // Fish management
    this.maxFish = options.maxFish || 10;
    this.fishPool = [];
    this.activeFish = [];
    this.fishSpawnRate = 1.0;
    this.lastFishSpawn = 0;
    this.fishSpawnInterval = 2000; // 2 seconds
    
    // Game mechanics
    this.difficulty = 'normal';
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.comboTimeout = 5000; // 5 seconds
    this.lastComboTime = 0;
    this.activePowerUps = [];
    
    // Performance monitoring
    this.performanceMode = 'normal'; // normal, battery, performance
    this.lowFPSThreshold = 45;
    this.lowFPSCount = 0;
    this.adaptiveQuality = true;
    
    // Event system
    this.eventListeners = {};
    
    // Create game entities (if dependencies available)
    if (!options.skipDependencies) {
      this._createGameEntities();
    } else {
      this.player = null;
      this.touchController = null;
    }
    
    // Initialize fish pool
    this._initializeFishPool();
    
    // Initialize UI and Audio systems
    this._initializeUI();
    this._initializeAudio();
    
    // Setup event listeners
    this._setupEventListeners();
    
    // Mobile optimizations
    if (this.isMobile) {
      this._setupMobileOptimizations();
    }
    
    console.log('Game constructor completed successfully!', {
      gameState: this.gameState,
      isRunning: this.isRunning,
      canvas: !!this.canvas,
      ui: !!this.ui,
      audioManager: !!this.audioManager,
      player: !!this.player,
      touchController: !!this.touchController
    });
    
    // Initial render to show menu
    console.log('Calling initial render...');
    this.render();
  }

  // ===============================
  // INITIALIZATION
  // ===============================

  /**
   * Get canvas element
   * @returns {HTMLCanvasElement} Canvas element
   * @private
   */
  _getCanvas() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) {
      throw new Error(`Canvas element with id '${this.canvasId}' not found`);
    }
    return canvas;
  }

  /**
   * Setup canvas properties
   * @private
   */
  _setupCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    // High DPI support
    if (this.devicePixelRatio > 1) {
      this._adjustForDevicePixelRatio(this.devicePixelRatio);
    }
  }

  /**
   * Detect mobile device
   * @returns {boolean} True if mobile
   * @private
   */
  _detectMobile() {
    if (typeof window === 'undefined') return true;
    
    const userAgent = window.navigator?.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
           ('ontouchstart' in window);
  }

  /**
   * Get device orientation
   * @returns {string} 'portrait' or 'landscape'
   * @private
   */
  _getOrientation() {
    if (typeof window === 'undefined') return 'portrait';
    
    const width = window.innerWidth || this.width;
    const height = window.innerHeight || this.height;
    return width > height ? 'landscape' : 'portrait';
  }

  /**
   * Create game entities
   * @private
   */
  _createGameEntities() {
    // Create player
    this.player = new Player({
      x: this.width / 2,
      y: 50,
      waterLevel: this.height * 0.3
    });
    
    // Create touch controller
    this.touchController = new TouchController({
      canvas: this.canvas,
      player: this.player,
      gameState: this
    });
    
    // Setup entity event listeners
    this._setupEntityEventListeners();
  }

  /**
   * Setup entity event listeners
   * @private
   */
  _setupEntityEventListeners() {
    if (this.player) {
      this.player.on('castStarted', this._handlePlayerCast.bind(this));
      this.player.on('fishCaught', this._handleFishCaught.bind(this));
      this.player.on('reelingComplete', this._handleReelingComplete.bind(this));
    }
    
    if (this.touchController) {
      this.touchController.on('touchStart', this._handleTouch.bind(this));
      this.touchController.on('gesture', this._handleGesture.bind(this));
      this.touchController.on('orientationChange', this._handleOrientationChange.bind(this));
    }
  }

  /**
   * Initialize fish object pool
   * @private
   */
  _initializeFishPool() {
    const poolSize = this.maxFish * 2;
    
    for (let i = 0; i < poolSize; i++) {
      const fish = new Fish({
        x: -100, // Off-screen
        y: -100,
        isActive: false
      });
      this.fishPool.push(fish);
    }
  }

  /**
   * Initialize UI system
   * @private
   */
  _initializeUI() {
    try {
      // Initialize GameUI with proper parameters
      this.ui = new GameUI({
        canvas: this.canvas,
        ctx: this.ctx,
        game: this,
        width: this.width,
        height: this.height
      });
      
      // Setup UI event listeners - using buttonClick event
      this.ui.on('buttonClick', (data) => {
        switch (data.action) {
          case 'start':
          case 'startGame':
            this.start();
            break;
          case 'pause':
          case 'pauseGame':
            this.pause();
            break;
          case 'resume':
          case 'resumeGame':
            this.resume();
            break;
          case 'restart':
          case 'restartGame':
            this.restart();
            break;
          default:
            console.warn('Unknown UI action:', data.action);
        }
      });
      
    } catch (error) {
      console.warn('Failed to initialize UI:', error.message);
      this.ui = null;
    }
  }

  /**
   * Initialize Audio system
   * @private
   */
  _initializeAudio() {
    try {
      this.audioManager = new AudioManager();
      
      // Setup audio event listeners
      this.on('fishCaught', () => {
        this.audioManager?.playSound('fishCatch');
      });
      
      this.on('castStarted', () => {
        this.audioManager?.playSound('cast');
      });
      
      this.on('gameOver', () => {
        this.audioManager?.playSound('gameOver');
      });
      
    } catch (error) {
      console.warn('Failed to initialize audio:', error.message);
      this.audioManager = null;
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Visibility change (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
    
    // Window focus/blur
    window.addEventListener('focus', this._handleWindowFocus.bind(this));
    window.addEventListener('blur', this._handleWindowBlur.bind(this));
    
    // Orientation change
    window.addEventListener('orientationchange', this._handleOrientationChange.bind(this));
    window.addEventListener('resize', this._handleResize.bind(this));
  }

  /**
   * Setup mobile optimizations
   * @private
   */
  _setupMobileOptimizations() {
    // Prevent scrolling/zooming
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
    
    // Battery optimization
    if (this.performanceMode === 'battery') {
      this._optimizeForBattery();
    }
    
    // Disable context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ===============================
  // GAME STATE MANAGEMENT
  // ===============================

  /**
   * Start the game
   */
  start() {
    if (this.destroyed || this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.gameState = 'playing';
    this.lastFrameTime = performance.now();
    
    // Enable touch controller
    if (this.touchController) {
      this.touchController.isEnabled = true;
    }
    
    // Start game loop
    this._gameLoop();
    
    this._emit('gameStarted');
  }

  /**
   * Pause the game
   */
  pause() {
    if (this.destroyed || !this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.gameState = 'paused';
    
    // Disable touch controller
    if (this.touchController) {
      this.touchController.isEnabled = false;
    }
    
    this._emit('gamePaused');
  }

  /**
   * Resume the game
   */
  resume() {
    if (this.destroyed || !this.isRunning || !this.isPaused) return;
    
    this.isPaused = false;
    this.gameState = 'playing';
    this.lastFrameTime = performance.now(); // Reset frame time
    
    // Enable touch controller
    if (this.touchController) {
      this.touchController.isEnabled = true;
    }
    
    this._emit('gameResumed');
  }

  /**
   * Stop the game
   */
  stop() {
    if (this.destroyed || !this.isRunning) return;
    
    this.isRunning = false;
    this.isPaused = false;
    this.gameState = 'stopped';
    
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Disable touch controller
    if (this.touchController) {
      this.touchController.isEnabled = false;
    }
    
    this._emit('gameStopped');
  }

  /**
   * Restart the game
   */
  restart() {
    this.stop();
    this._resetGameState();
    this.start();
    
    this._emit('gameRestarted');
  }

  /**
   * Set game state
   * @param {string} state - New game state
   */
  setState(state) {
    const oldState = this.gameState;
    this.gameState = state;
    
    this._emit('stateChanged', state, oldState);
  }

  /**
   * Handle game over
   * @private
   */
  _gameOver() {
    this.isRunning = false;
    this.gameState = 'gameOver';
    
    // Update best score
    this._updateBestScore();
    
    // Disable touch controller
    if (this.touchController) {
      this.touchController.isEnabled = false;
    }
    
    this._emit('gameOver', this.stats);
  }

  /**
   * Reset game state
   * @private
   */
  _resetGameState() {
    // Reset statistics
    this.stats.score = 0;
    this.stats.fishCaught = 0;
    this.stats.casts = 0;
    this.stats.accuracy = 0;
    this.stats.playTime = 0;
    
    // Reset game mechanics
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.difficulty = 'normal';
    this.fishSpawnRate = 1.0;
    
    // Clear active fish
    this.activeFish.forEach(fish => this._returnFishToPool(fish));
    this.activeFish = [];
    
    // Reset player
    if (this.player) {
      this.player.reset();
    }
    
    // Clear power-ups
    this.activePowerUps = [];
  }

  // ===============================
  // GAME LOOP
  // ===============================

  /**
   * Main game loop
   * @param {number} currentTime - Current timestamp
   * @private
   */
  _gameLoop(currentTime = performance.now()) {
    if (!this.isRunning || this.destroyed) return;
    
    // Calculate delta time
    const deltaTime = Math.min(currentTime - this.lastFrameTime, this.maxDeltaTime);
    this.lastFrameTime = currentTime;
    
    // Update FPS
    this._updateFPS(deltaTime);
    
    // Skip frame if paused
    if (!this.isPaused) {
      // Update game
      this.update(deltaTime);
      
      // Render game
      this.render();
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this._gameLoop.bind(this));
  }

  /**
   * Update FPS counter
   * @param {number} deltaTime - Time since last frame
   * @private
   */
  _updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsHistory.push(1000 / deltaTime);
    
    // Keep only last 60 frames for FPS calculation
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
    
    // Calculate average FPS
    this.currentFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    
    // Monitor performance
    if (this.currentFPS < this.lowFPSThreshold) {
      this.lowFPSCount++;
      
      if (this.lowFPSCount > 60 && this.adaptiveQuality) {
        this._adaptQuality();
      }
    } else {
      this.lowFPSCount = 0;
    }
  }

  /**
   * Main update method
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (this.destroyed) return;
    
    // Update play time
    this.stats.playTime += deltaTime;
    
    // Update player
    if (this.player) {
      this.player.update(deltaTime);
    }
    
    // Update fish
    this._updateFish(deltaTime);
    
    // Update game mechanics
    this._updateGameMechanics(deltaTime);
    
    // Update power-ups
    this._updatePowerUps(deltaTime);
    
    // Check collisions
    this._checkFishCollisions();
    
    // Spawn fish
    this._handleFishSpawning(deltaTime);
    
    // Update difficulty
    this._updateDifficulty();
    
    // Update LOD
    this._updateLOD();
    
    // Cleanup
    this._cleanupFish();
  }

  /**
   * Main render method
   */
  render() {
    if (this.destroyed) return;
    
    try {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
      
      // Render based on game state
      switch (this.gameState) {
        case 'menu':
          this._renderBackground();
          // UI handles menu rendering
          break;
        case 'playing':
        case 'paused':
          this._renderGame();
          break;
        case 'gameOver':
          this._renderGame(); // Show game in background
          // UI handles game over screen
          break;
        default:
          this._renderBackground();
      }
      
      // Update UI with current stats - use render() method
      if (this.ui) {
        this.ui.render(this.gameState, this.stats);
      }
      
    } catch (error) {
      console.warn('Game: Rendering error:', error);
    }
  }

  /**
   * Render main game
   * @private
   */
  _renderGame() {
    // Render background
    this._renderBackground();
    
    // Render fish (with viewport culling)
    this.activeFish.forEach(fish => {
      if (fish.isInViewport && fish.isInViewport(this.viewport)) {
        fish.render(this.ctx);
      }
    });
    
    // Render player
    if (this.player) {
      this.player.render(this.ctx);
    }
    
    // Render UI
    this._renderUI();
    
    // Render debug info (if enabled)
    if (this.showDebug) {
      this._renderDebugInfo();
    }
  }

  // ===============================
  // FISH MANAGEMENT
  // ===============================

  /**
   * Spawn a fish
   * @private
   */
  _spawnFish() {
    if (this.activeFish.length >= this.maxFish) return;
    
    const fish = this._getFishFromPool();
    if (!fish) return;
    
    // Random spawn position
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -50 : this.width + 50;
    const y = MathUtils.randomRange(this.height * 0.3, this.height - 50);
    
    // Configure fish
    fish.setPosition(x, y);
    fish.isActive = true;
    fish.reset();
    
    // Add to active fish
    this.activeFish.push(fish);
  }

  /**
   * Get fish from pool
   * @returns {Fish|null} Fish from pool or null if empty
   * @private
   */
  _getFishFromPool() {
    return this.fishPool.pop() || null;
  }

  /**
   * Return fish to pool
   * @param {Fish} fish - Fish to return
   * @private
   */
  _returnFishToPool(fish) {
    if (!fish) return;
    
    fish.isActive = false;
    fish.setPosition(-100, -100); // Move off-screen
    
    // Remove from active fish
    const index = this.activeFish.indexOf(fish);
    if (index > -1) {
      this.activeFish.splice(index, 1);
    }
    
    // Return to pool
    if (this.fishPool.length < this.maxFish * 2) {
      this.fishPool.push(fish);
    }
  }

  /**
   * Update all fish
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateFish(deltaTime) {
    this.activeFish.forEach(fish => {
      fish.update(deltaTime);
    });
  }

  /**
   * Handle fish spawning
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _handleFishSpawning(deltaTime) {
    this.lastFishSpawn += deltaTime;
    
    const spawnInterval = this.fishSpawnInterval / this.fishSpawnRate;
    
    if (this.lastFishSpawn >= spawnInterval) {
      this._spawnFish();
      this.lastFishSpawn = 0;
    }
  }

  /**
   * Cleanup inactive fish
   * @private
   */
  _cleanupFish() {
    for (let i = this.activeFish.length - 1; i >= 0; i--) {
      const fish = this.activeFish[i];
      
      if (!fish.isActive || fish.x < -100 || fish.x > this.width + 100) {
        this._returnFishToPool(fish);
      }
    }
  }

  /**
   * Check fish collisions with player hook
   * @private
   */
  _checkFishCollisions() {
    if (!this.player || !this.player.isCasting) return;
    
    this.activeFish.forEach(fish => {
      if (fish.isActive && this.player.checkFishCollision(fish)) {
        this.player.catchFish(fish);
      }
    });
  }

  // ===============================
  // EVENT HANDLERS
  // ===============================

  /**
   * Handle player casting
   * @param {Object} castData - Cast data
   * @private
   */
  _handlePlayerCast(castData) {
    this.stats.casts++;
    this._emit('playerCast', castData);
  }

  /**
   * Handle fish caught
   * @param {Object} data - Fish caught data
   * @private
   */
  _handleFishCaught(data) {
    const { fish, score } = data;
    
    // Update statistics
    this.stats.fishCaught++;
    this._updateScore(score);
    
    // Update combo
    this._updateCombo();
    
    // Remove fish from active list
    this._returnFishToPool(fish);
    
    this._emit('fishCaught', data);
  }

  /**
   * Handle reeling complete
   * @param {Object} data - Reeling data
   * @private
   */
  _handleReelingComplete(data) {
    // Calculate accuracy
    this.stats.accuracy = this._calculateAccuracy();
    
    this._emit('reelingComplete', data);
  }

  /**
   * Handle touch events
   * @param {Object} touchData - Touch data
   * @private
   */
  _handleTouch(touchData) {
    this._emit('touch', touchData);
  }

  /**
   * Handle gesture events
   * @param {Object} gestureData - Gesture data
   * @private
   */
  _handleGesture(gestureData) {
    this._emit('gesture', gestureData);
  }

  /**
   * Handle visibility change
   * @private
   */
  _handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (this.isRunning && !this.isPaused) {
        this.pause();
      }
    }
  }

  /**
   * Handle window focus
   * @private
   */
  _handleWindowFocus() {
    // Auto-resume if game was paused due to blur
    if (this.gameState === 'paused' && this.isRunning) {
      this.resume();
    }
  }

  /**
   * Handle window blur
   * @private
   */
  _handleWindowBlur() {
    if (this.isRunning && !this.isPaused) {
      this.pause();
    }
  }

  /**
   * Handle orientation change
   * @private
   */
  _handleOrientationChange() {
    setTimeout(() => {
      this.orientation = this._getOrientation();
      this._emit('orientationChange', this.orientation);
    }, 100);
  }

  /**
   * Handle resize
   * @private
   */
  _handleResize() {
    // Update viewport if needed
    this._emit('resize');
  }

  // ===============================
  // GAME MECHANICS
  // ===============================

  /**
   * Update score
   * @param {number} points - Points to add
   * @private
   */
  _updateScore(points) {
    const finalScore = Math.floor(points * this.comboMultiplier);
    this.stats.score += finalScore;
    
    this._emit('scoreChanged', this.stats.score, finalScore);
  }

  /**
   * Update combo system
   * @private
   */
  _updateCombo() {
    this.comboCount++;
    this.lastComboTime = Date.now();
    
    // Increase multiplier
    this.comboMultiplier = 1.0 + (this.comboCount - 1) * 0.1; // 10% per combo
    this.comboMultiplier = Math.min(this.comboMultiplier, 3.0); // Max 3x
    
    this._emit('comboUpdated', this.comboCount, this.comboMultiplier);
  }

  /**
   * Update game mechanics
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateGameMechanics(deltaTime) {
    // Check combo timeout
    if (this.comboCount > 0 && Date.now() - this.lastComboTime > this.comboTimeout) {
      this.comboCount = 0;
      this.comboMultiplier = 1.0;
      this._emit('comboLost');
    }
  }

  /**
   * Update difficulty
   * @private
   */
  _updateDifficulty() {
    const minutes = this.stats.playTime / 60000;
    
    if (minutes > 5) {
      this.difficulty = 'hard';
      this.fishSpawnRate = 1.8;
    } else if (minutes > 2) {
      this.difficulty = 'medium';
      this.fishSpawnRate = 1.4;
    } else {
      this.difficulty = 'normal';
      this.fishSpawnRate = 1.0;
    }
  }

  /**
   * Calculate accuracy
   * @returns {number} Accuracy percentage
   * @private
   */
  _calculateAccuracy() {
    return this.stats.casts > 0 ? (this.stats.fishCaught / this.stats.casts) * 100 : 0;
  }

  /**
   * Update best score
   * @private
   */
  _updateBestScore() {
    if (this.stats.score > this.stats.bestScore) {
      this.stats.bestScore = this.stats.score;
      this._saveBestScore();
      this._emit('newBestScore', this.stats.bestScore);
    }
  }

  /**
   * Apply power-up
   * @param {Object} powerUp - Power-up to apply
   * @private
   */
  _applyPowerUp(powerUp) {
    powerUp.startTime = Date.now();
    this.activePowerUps.push(powerUp);
    
    this._emit('powerUpActivated', powerUp);
  }

  /**
   * Update power-ups
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updatePowerUps(deltaTime) {
    const currentTime = Date.now();
    
    this.activePowerUps = this.activePowerUps.filter(powerUp => {
      if (currentTime - powerUp.startTime >= powerUp.duration) {
        this._emit('powerUpExpired', powerUp);
        return false;
      }
      return true;
    });
  }

  // ===============================
  // PERFORMANCE & OPTIMIZATION
  // ===============================

  /**
   * Update LOD (Level of Detail)
   * @private
   */
  _updateLOD() {
    this.activeFish.forEach(fish => {
      if (fish.setLOD) {
        const distance = MathUtils.distance(
          { x: fish.x, y: fish.y },
          { x: this.width / 2, y: this.height / 2 }
        );
        fish.setLOD(distance);
      }
    });
  }

  /**
   * Adapt quality based on performance
   * @private
   */
  _adaptQuality() {
    if (this.maxFish > 5) {
      this.maxFish -= 2;
      console.log('Game: Reduced max fish count for performance');
    }
  }

  /**
   * Optimize for battery life
   * @private
   */
  _optimizeForBattery() {
    this.targetFPS = Math.min(this.targetFPS, 30);
    this.maxFish = Math.min(this.maxFish, 6);
  }

  /**
   * Adjust for device pixel ratio
   * @param {number} dpr - Device pixel ratio
   * @private
   */
  _adjustForDevicePixelRatio(dpr) {
    const width = this.width * dpr;
    const height = this.height * dpr;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.ctx.scale(dpr, dpr);
  }

  // ===============================
  // RENDERING HELPERS
  // ===============================

  /**
   * Render background
   * @private
   */
  _renderBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(0.3, '#4682B4'); // Steel blue
    gradient.addColorStop(1, '#191970'); // Midnight blue
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Render UI
   * @private
   */
  _renderUI() {
    // Score
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText(`Score: ${this.stats.score}`, 20, 40);
    
    // Fish caught
    this.ctx.font = '18px Arial';
    this.ctx.fillText(`Fish: ${this.stats.fishCaught}`, 20, 70);
    
    // Combo
    if (this.comboCount > 1) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText(`Combo x${this.comboMultiplier.toFixed(1)}`, 20, 100);
    }
    
    // FPS (debug)
    if (this.showDebug) {
      this.ctx.fillStyle = '#00FF00';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(`FPS: ${this.currentFPS.toFixed(1)}`, this.width - 80, 30);
    }
  }

  /**
   * Render debug info
   * @private
   */
  _renderDebugInfo() {
    this.ctx.fillStyle = '#00FF00';
    this.ctx.font = '12px Arial';
    
    const debugInfo = [
      `Active Fish: ${this.activeFish.length}`,
      `Fish Pool: ${this.fishPool.length}`,
      `Combo: ${this.comboCount}`,
      `Difficulty: ${this.difficulty}`,
      `Spawn Rate: ${this.fishSpawnRate.toFixed(1)}`
    ];
    
    debugInfo.forEach((info, index) => {
      this.ctx.fillText(info, 10, this.height - 100 + index * 15);
    });
  }

  // ===============================
  // STORAGE
  // ===============================

  /**
   * Load best score from storage
   * @returns {number} Best score
   * @private
   */
  _loadBestScore() {
    try {
      return parseInt(localStorage.getItem('tinyFishCatch_bestScore') || '0', 10);
    } catch {
      return 0;
    }
  }

  /**
   * Save best score to storage
   * @private
   */
  _saveBestScore() {
    try {
      localStorage.setItem('tinyFishCatch_bestScore', this.stats.bestScore.toString());
    } catch {
      // Storage not available
    }
  }

  // ===============================
  // PLACEHOLDER METHODS FOR TESTS
  // ===============================

  /**
   * Placeholder for expensive operation (testing)
   * @private
   */
  _expensiveOperation() {
    // Placeholder for testing
  }

  /**
   * Throttled expensive operation (testing)
   * @private
   */
  _throttledExpensiveOperation() {
    // Placeholder for testing throttling
    this._expensiveOperation();
  }

  /**
   * Handle player event (testing)
   * @private
   */
  _handlePlayerEvent() {
    // Placeholder for testing
  }

  /**
   * Update player actions (testing)
   * @private
   */
  _updatePlayerActions() {
    // Placeholder for testing
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
        console.warn('Game: Error in event callback:', error);
      }
    });
  }

  // ===============================
  // CLEANUP
  // ===============================

  /**
   * Destroy game and cleanup resources
   */
  destroy() {
    this.destroyed = true;
    
    // Stop game loop
    this.stop();
    
    // Destroy entities
    if (this.player) {
      this.player.destroy();
    }
    
    if (this.touchController) {
      this.touchController.destroy();
    }
    
    // Cleanup fish
    [...this.activeFish, ...this.fishPool].forEach(fish => {
      if (fish.destroy) fish.destroy();
    });
    
    this.activeFish = [];
    this.fishPool = [];
    
    // Remove event listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this._handleWindowFocus);
      window.removeEventListener('blur', this._handleWindowBlur);
      window.removeEventListener('orientationchange', this._handleOrientationChange);
      window.removeEventListener('resize', this._handleResize);
    }
    
    // Clear event listeners
    this.eventListeners = {};
    
    this._emit('destroyed', this);
  }
} 