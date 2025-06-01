/**
 * GameUI - Mobile-First User Interface for Fish Game
 * Handles all UI elements, score display, buttons, and mobile interactions
 * 
 * Features:
 * - Mobile-optimized touch buttons (44px minimum)
 * - Responsive score display
 * - Game state UI (menu, playing, paused, gameOver)
 * - Touch-friendly controls
 * - Accessibility support
 * - Performance optimized rendering
 */

export class GameUI {
  constructor(options = {}) {
    // Canvas and context
    this.canvas = options.canvas;
    this.ctx = options.ctx;
    this.game = options.game;
    
    // UI dimensions
    this.width = options.width || 375;
    this.height = options.height || 667;
    
    // Mobile detection
    this.isMobile = this._detectMobile();
    this.devicePixelRatio = window?.devicePixelRatio || 1;
    
    // UI state
    this.isVisible = true;
    this.fadeOpacity = 1.0;
    this.animationsEnabled = true;
    
    // Button definitions (mobile-optimized sizes)
    this.buttons = {
      start: {
        x: this.width / 2 - 80,
        y: this.height / 2 + 50,
        width: 160,
        height: 50,
        text: 'START GAME',
        visible: ['menu', 'gameOver'],
        action: 'startGame'
      },
      pause: {
        x: this.width - 70,
        y: 20,
        width: 50,
        height: 50,
        text: '⏸',
        visible: ['playing'],
        action: 'pauseGame'
      },
      resume: {
        x: this.width / 2 - 80,
        y: this.height / 2,
        width: 160,
        height: 50,
        text: 'RESUME',
        visible: ['paused'],
        action: 'resumeGame'
      },
      restart: {
        x: this.width / 2 - 80,
        y: this.height / 2 + 80,
        width: 160,
        height: 50,
        text: 'RESTART',
        visible: ['paused', 'gameOver'],
        action: 'restartGame'
      },
      menu: {
        x: this.width / 2 - 80,
        y: this.height / 2 + 140,
        width: 160,
        height: 50,
        text: 'MAIN MENU',
        visible: ['paused', 'gameOver'],
        action: 'mainMenu'
      }
    };
    
    // UI elements positions
    this.elements = {
      score: {
        x: 20,
        y: 40,
        fontSize: 24,
        color: '#FFFFFF',
        shadow: true
      },
      fishCount: {
        x: 20,
        y: 70,
        fontSize: 18,
        color: '#FFFFFF',
        shadow: true
      },
      combo: {
        x: 20,
        y: 100,
        fontSize: 20,
        color: '#FFD700',
        shadow: true
      },
      timer: {
        x: this.width - 20,
        y: 40,
        fontSize: 18,
        color: '#FFFFFF',
        shadow: true,
        align: 'right'
      },
      accuracy: {
        x: this.width - 20,
        y: 70,
        fontSize: 16,
        color: '#00FF00',
        shadow: true,
        align: 'right'
      }
    };
    
    // Animation properties
    this.animations = {
      scorePopup: {
        active: false,
        text: '',
        x: 0,
        y: 0,
        opacity: 1.0,
        scale: 1.0,
        duration: 1000,
        startTime: 0
      },
      comboFlash: {
        active: false,
        opacity: 1.0,
        duration: 300,
        startTime: 0
      },
      buttonHover: {
        activeButton: null,
        scale: 1.0,
        opacity: 1.0
      }
    };
    
    // Touch feedback
    this.touchFeedback = {
      ripples: [],
      maxRipples: 5,
      rippleDuration: 600
    };
    
    // Performance settings
    this.enableShadows = true;
    this.enableAnimations = true;
    this.enableRipples = true;
    
    // Event listeners
    this.eventListeners = {};
    
    // Setup UI
    this._setupEventListeners();
    
    // Mobile optimizations
    if (this.isMobile) {
      this._setupMobileOptimizations();
    }
  }

  // ===============================
  // INITIALIZATION
  // ===============================

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
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.canvas) return;
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
    
    // Mouse events for desktop fallback
    this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this._handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
  }

  /**
   * Setup mobile optimizations
   * @private
   */
  _setupMobileOptimizations() {
    // Larger touch targets
    Object.keys(this.buttons).forEach(key => {
      const button = this.buttons[key];
      button.width = Math.max(button.width, 44); // Apple guideline
      button.height = Math.max(button.height, 44);
    });
    
    // Disable shadows on low-end devices
    if (this.devicePixelRatio < 2) {
      this.enableShadows = false;
    }
    
    // Disable complex animations on older devices
    if (!window.requestAnimationFrame) {
      this.enableAnimations = false;
    }
  }

  // ===============================
  // RENDERING
  // ===============================

  /**
   * Main render method
   * @param {string} gameState - Current game state
   * @param {Object} gameStats - Game statistics
   */
  render(gameState, gameStats = {}) {
    if (!this.isVisible || !this.ctx) return;
    
    try {
      // Set global opacity for fade effects
      this.ctx.globalAlpha = this.fadeOpacity;
      
      // Render based on game state
      switch (gameState) {
        case 'menu':
          this._renderMenu();
          break;
        case 'playing':
          this._renderGameplay(gameStats);
          break;
        case 'paused':
          this._renderPaused(gameStats);
          break;
        case 'gameOver':
          this._renderGameOver(gameStats);
          break;
      }
      
      // Render buttons
      this._renderButtons(gameState);
      
      // Render animations
      if (this.enableAnimations) {
        this._renderAnimations();
      }
      
      // Render touch feedback
      if (this.enableRipples) {
        this._renderTouchFeedback();
      }
      
      // Reset global alpha
      this.ctx.globalAlpha = 1.0;
      
    } catch (error) {
      console.warn('GameUI: Rendering error:', error);
    }
  }

  /**
   * Render menu screen
   * @private
   */
  _renderMenu() {
    // Game title
    this._renderText({
      text: 'Tiny Fish Catch',
      x: this.width / 2,
      y: this.height / 3,
      fontSize: 32,
      color: '#FFFFFF',
      align: 'center',
      shadow: true,
      bold: true
    });
    
    // Subtitle
    this._renderText({
      text: 'Catch fish with your hook!',
      x: this.width / 2,
      y: this.height / 3 + 50,
      fontSize: 18,
      color: '#87CEEB',
      align: 'center',
      shadow: true
    });
    
    // Instructions
    this._renderText({
      text: 'Tap and drag to cast',
      x: this.width / 2,
      y: this.height / 2 - 20,
      fontSize: 16,
      color: '#FFFFFF',
      align: 'center',
      opacity: 0.8
    });
  }

  /**
   * Render gameplay UI
   * @param {Object} stats - Game statistics
   * @private
   */
  _renderGameplay(stats) {
    // Score
    this._renderText({
      text: `Score: ${stats.score || 0}`,
      x: this.elements.score.x,
      y: this.elements.score.y,
      fontSize: this.elements.score.fontSize,
      color: this.elements.score.color,
      shadow: this.elements.score.shadow,
      bold: true
    });
    
    // Fish caught
    this._renderText({
      text: `Fish: ${stats.fishCaught || 0}`,
      x: this.elements.fishCount.x,
      y: this.elements.fishCount.y,
      fontSize: this.elements.fishCount.fontSize,
      color: this.elements.fishCount.color,
      shadow: this.elements.fishCount.shadow
    });
    
    // Combo multiplier
    if (stats.comboMultiplier && stats.comboMultiplier > 1) {
      this._renderText({
        text: `Combo x${stats.comboMultiplier.toFixed(1)}`,
        x: this.elements.combo.x,
        y: this.elements.combo.y,
        fontSize: this.elements.combo.fontSize,
        color: this.elements.combo.color,
        shadow: this.elements.combo.shadow,
        bold: true
      });
    }
    
    // Timer (if applicable)
    if (stats.playTime) {
      const minutes = Math.floor(stats.playTime / 60000);
      const seconds = Math.floor((stats.playTime % 60000) / 1000);
      this._renderText({
        text: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        x: this.elements.timer.x,
        y: this.elements.timer.y,
        fontSize: this.elements.timer.fontSize,
        color: this.elements.timer.color,
        align: this.elements.timer.align,
        shadow: this.elements.timer.shadow
      });
    }
    
    // Accuracy
    if (stats.accuracy !== undefined) {
      this._renderText({
        text: `${stats.accuracy.toFixed(0)}%`,
        x: this.elements.accuracy.x,
        y: this.elements.accuracy.y,
        fontSize: this.elements.accuracy.fontSize,
        color: this.elements.accuracy.color,
        align: this.elements.accuracy.align,
        shadow: this.elements.accuracy.shadow
      });
    }
  }

  /**
   * Render paused screen
   * @param {Object} stats - Game statistics
   * @private
   */
  _renderPaused(stats) {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Paused text
    this._renderText({
      text: 'PAUSED',
      x: this.width / 2,
      y: this.height / 3,
      fontSize: 36,
      color: '#FFFFFF',
      align: 'center',
      shadow: true,
      bold: true
    });
    
    // Current score
    this._renderText({
      text: `Score: ${stats.score || 0}`,
      x: this.width / 2,
      y: this.height / 3 + 60,
      fontSize: 24,
      color: '#FFFFFF',
      align: 'center',
      shadow: true
    });
  }

  /**
   * Render game over screen
   * @param {Object} stats - Game statistics
   * @private
   */
  _renderGameOver(stats) {
    // Game Over title
    this._renderText({
      text: 'GAME OVER',
      x: this.width / 2,
      y: this.height / 3,
      fontSize: 32,
      color: '#FF6B6B',
      align: 'center',
      shadow: true,
      bold: true
    });
    
    // Final score
    this._renderText({
      text: `Final Score: ${stats.score || 0}`,
      x: this.width / 2,
      y: this.height / 3 + 60,
      fontSize: 24,
      color: '#FFFFFF',
      align: 'center',
      shadow: true
    });
    
    // Best score
    if (stats.bestScore !== undefined && stats.bestScore > 0) {
      const isNewBest = stats.score >= stats.bestScore;
      this._renderText({
        text: `Best Score: ${stats.bestScore}`,
        x: this.width / 2,
        y: this.height / 3 + 100,
        fontSize: 18,
        color: isNewBest ? '#FFD700' : '#87CEEB',
        align: 'center',
        shadow: true
      });
      
      if (isNewBest) {
        this._renderText({
          text: 'NEW BEST!',
          x: this.width / 2,
          y: this.height / 3 + 130,
          fontSize: 16,
          color: '#FFD700',
          align: 'center',
          shadow: true,
          bold: true
        });
      }
    }
    
    // Statistics
    this._renderGameStats(stats);
  }

  /**
   * Render game statistics
   * @param {Object} stats - Game statistics
   * @private
   */
  _renderGameStats(stats) {
    const startY = this.height / 2 + 20;
    const lineHeight = 25;
    
    const statLines = [
      `Fish Caught: ${stats.fishCaught || 0}`,
      `Casts Made: ${stats.casts || 0}`,
      `Accuracy: ${stats.accuracy ? stats.accuracy.toFixed(1) : 0}%`
    ];
    
    statLines.forEach((line, index) => {
      this._renderText({
        text: line,
        x: this.width / 2,
        y: startY + index * lineHeight,
        fontSize: 16,
        color: '#FFFFFF',
        align: 'center',
        opacity: 0.8
      });
    });
  }

  /**
   * Render buttons
   * @param {string} gameState - Current game state
   * @private
   */
  _renderButtons(gameState) {
    Object.keys(this.buttons).forEach(key => {
      const button = this.buttons[key];
      
      if (button.visible.includes(gameState)) {
        this._renderButton(button, key);
      }
    });
  }

  /**
   * Render single button
   * @param {Object} button - Button configuration
   * @param {string} key - Button key
   * @private
   */
  _renderButton(button, key) {
    const isHovered = this.animations.buttonHover.activeButton === key;
    const scale = isHovered ? this.animations.buttonHover.scale : 1.0;
    const opacity = isHovered ? this.animations.buttonHover.opacity : 1.0;
    
    // Button background
    const cornerRadius = 8;
    const x = button.x - (button.width * scale - button.width) / 2;
    const y = button.y - (button.height * scale - button.height) / 2;
    const width = button.width * scale;
    const height = button.height * scale;
    
    // Shadow
    if (this.enableShadows) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
      this.ctx.shadowBlur = 4;
    }
    
    // Button background
    this.ctx.fillStyle = `rgba(70, 130, 180, ${opacity})`;
    this._roundRect(x, y, width, height, cornerRadius);
    this.ctx.fill();
    
    // Button border
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    
    // Button text
    this._renderText({
      text: button.text,
      x: button.x + button.width / 2,
      y: button.y + button.height / 2 + 6,
      fontSize: 16,
      color: '#FFFFFF',
      align: 'center',
      bold: true,
      opacity: opacity
    });
  }

  /**
   * Render animations
   * @private
   */
  _renderAnimations() {
    // Score popup animation
    if (this.animations.scorePopup.active) {
      this._renderScorePopup();
    }
    
    // Combo flash animation
    if (this.animations.comboFlash.active) {
      this._renderComboFlash();
    }
  }

  /**
   * Render score popup animation
   * @private
   */
  _renderScorePopup() {
    const anim = this.animations.scorePopup;
    const elapsed = Date.now() - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    
    // Animate opacity and scale
    anim.opacity = 1 - progress;
    anim.scale = 1 + progress * 0.5;
    anim.y -= 1; // Float upward
    
    this._renderText({
      text: anim.text,
      x: anim.x,
      y: anim.y,
      fontSize: 20 * anim.scale,
      color: '#FFD700',
      align: 'center',
      opacity: anim.opacity,
      bold: true,
      shadow: true
    });
    
    // End animation
    if (progress >= 1) {
      anim.active = false;
    }
  }

  /**
   * Render combo flash animation
   * @private
   */
  _renderComboFlash() {
    const anim = this.animations.comboFlash;
    const elapsed = Date.now() - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    
    // Flash effect
    anim.opacity = 1 - progress;
    
    // Flash overlay
    this.ctx.fillStyle = `rgba(255, 215, 0, ${anim.opacity * 0.3})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // End animation
    if (progress >= 1) {
      anim.active = false;
    }
  }

  /**
   * Render touch feedback ripples
   * @private
   */
  _renderTouchFeedback() {
    const currentTime = Date.now();
    
    this.touchFeedback.ripples = this.touchFeedback.ripples.filter(ripple => {
      const elapsed = currentTime - ripple.startTime;
      const progress = Math.min(elapsed / this.touchFeedback.rippleDuration, 1);
      
      if (progress >= 1) return false;
      
      // Animate ripple
      const radius = ripple.maxRadius * progress;
      const opacity = (1 - progress) * 0.3;
      
      // Render ripple
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      return true;
    });
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Render text with options
   * @param {Object} options - Text options
   * @private
   */
  _renderText(options) {
    const {
      text,
      x,
      y,
      fontSize = 16,
      color = '#FFFFFF',
      align = 'left',
      bold = false,
      shadow = false,
      opacity = 1.0
    } = options;
    
    this.ctx.save();
    
    // Set font
    this.ctx.font = `${bold ? 'bold ' : ''}${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.globalAlpha = opacity;
    
    // Shadow
    if (shadow && this.enableShadows) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;
      this.ctx.shadowBlur = 2;
    }
    
    // Render text
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
  }

  /**
   * Draw rounded rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} radius - Corner radius
   * @private
   */
  _roundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // ===============================
  // EVENT HANDLERS
  // ===============================

  /**
   * Handle touch start
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchStart(event) {
    event.preventDefault();
    
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this._handlePointerDown(x, y);
  }

  /**
   * Handle touch end
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchEnd(event) {
    event.preventDefault();
    
    const touch = event.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this._handlePointerUp(x, y);
  }

  /**
   * Handle touch move
   * @param {TouchEvent} event - Touch event
   * @private
   */
  _handleTouchMove(event) {
    event.preventDefault();
    
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this._handlePointerMove(x, y);
  }

  /**
   * Handle mouse down
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  _handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this._handlePointerDown(x, y);
  }

  /**
   * Handle mouse up
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  _handleMouseUp(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this._handlePointerUp(x, y);
  }

  /**
   * Handle mouse move
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  _handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this._handlePointerMove(x, y);
  }

  /**
   * Handle pointer down (unified for touch/mouse)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @private
   */
  _handlePointerDown(x, y) {
    // Add touch ripple
    if (this.enableRipples) {
      this._addTouchRipple(x, y);
    }
    
    // Check button clicks
    const button = this._getButtonAt(x, y);
    if (button) {
      this._handleButtonClick(button.key, button.button);
    }
  }

  /**
   * Handle pointer up (unified for touch/mouse)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @private
   */
  _handlePointerUp(x, y) {
    // Reset button hover
    this.animations.buttonHover.activeButton = null;
  }

  /**
   * Handle pointer move (unified for touch/mouse)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @private
   */
  _handlePointerMove(x, y) {
    // Check button hover
    const button = this._getButtonAt(x, y);
    this.animations.buttonHover.activeButton = button ? button.key : null;
    
    if (this.animations.buttonHover.activeButton) {
      this.animations.buttonHover.scale = 1.1;
      this.animations.buttonHover.opacity = 0.8;
    } else {
      this.animations.buttonHover.scale = 1.0;
      this.animations.buttonHover.opacity = 1.0;
    }
  }

  /**
   * Get button at coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Button object or null
   * @private
   */
  _getButtonAt(x, y) {
    for (const [key, button] of Object.entries(this.buttons)) {
      if (this.game && button.visible.includes(this.game.gameState)) {
        if (x >= button.x && x <= button.x + button.width &&
            y >= button.y && y <= button.y + button.height) {
          return { key, button };
        }
      }
    }
    return null;
  }

  /**
   * Handle button click
   * @param {string} key - Button key
   * @param {Object} button - Button object
   * @private
   */
  _handleButtonClick(key, button) {
    this._emit('buttonClick', {
      action: button.action,
      key: key,
      button: button
    });
  }

  /**
   * Add touch ripple effect
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @private
   */
  _addTouchRipple(x, y) {
    // Remove oldest ripple if at max
    if (this.touchFeedback.ripples.length >= this.touchFeedback.maxRipples) {
      this.touchFeedback.ripples.shift();
    }
    
    // Add new ripple
    this.touchFeedback.ripples.push({
      x: x,
      y: y,
      startTime: Date.now(),
      maxRadius: 50
    });
  }

  // ===============================
  // PUBLIC METHODS
  // ===============================

  /**
   * Show score popup animation
   * @param {number} score - Score to show
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  showScorePopup(score, x, y) {
    this.animations.scorePopup = {
      active: true,
      text: `+${score}`,
      x: x,
      y: y,
      opacity: 1.0,
      scale: 1.0,
      duration: 1000,
      startTime: Date.now()
    };
  }

  /**
   * Show combo flash animation
   */
  showComboFlash() {
    this.animations.comboFlash = {
      active: true,
      opacity: 1.0,
      duration: 300,
      startTime: Date.now()
    };
  }

  /**
   * Set UI visibility
   * @param {boolean} visible - Visibility state
   */
  setVisible(visible) {
    this.isVisible = visible;
  }

  /**
   * Fade UI in/out
   * @param {number} opacity - Target opacity (0-1)
   * @param {number} duration - Animation duration in ms
   */
  fadeTo(opacity, duration = 300) {
    // Simple fade implementation
    this.fadeOpacity = opacity;
  }

  /**
   * Update UI (called every frame)
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update animations
    if (this.enableAnimations) {
      this._updateAnimations(deltaTime);
    }
  }

  /**
   * Update animations
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateAnimations(deltaTime) {
    // Smooth button hover transitions
    const hoverSpeed = deltaTime * 0.01;
    
    if (this.animations.buttonHover.activeButton) {
      this.animations.buttonHover.scale = Math.min(
        this.animations.buttonHover.scale + hoverSpeed,
        1.1
      );
      this.animations.buttonHover.opacity = Math.max(
        this.animations.buttonHover.opacity - hoverSpeed,
        0.8
      );
    } else {
      this.animations.buttonHover.scale = Math.max(
        this.animations.buttonHover.scale - hoverSpeed,
        1.0
      );
      this.animations.buttonHover.opacity = Math.min(
        this.animations.buttonHover.opacity + hoverSpeed,
        1.0
      );
    }
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
        console.warn('GameUI: Error in event callback:', error);
      }
    });
  }

  // ===============================
  // CLEANUP
  // ===============================

  /**
   * Destroy UI and cleanup resources
   */
  destroy() {
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this._handleTouchStart);
      this.canvas.removeEventListener('touchend', this._handleTouchEnd);
      this.canvas.removeEventListener('touchmove', this._handleTouchMove);
      this.canvas.removeEventListener('mousedown', this._handleMouseDown);
      this.canvas.removeEventListener('mouseup', this._handleMouseUp);
      this.canvas.removeEventListener('mousemove', this._handleMouseMove);
    }
    
    // Clear event listeners
    this.eventListeners = {};
    
    // Clear animations
    this.animations = {};
    this.touchFeedback.ripples = [];
  }
} 