/**
 * AudioManager - Mobile-Optimized Audio System for Fish Game
 * Handles sound effects, background music, and audio feedback
 * 
 * Features:
 * - Web Audio API with fallback to HTML5 Audio
 * - Mobile audio optimization (user gesture requirement)
 * - Audio sprite support for performance
 * - Dynamic volume control
 * - Audio pooling for overlapping sounds
 * - Battery-conscious audio management
 * - Accessibility support (mute options)
 */

export class AudioManager {
  constructor(options = {}) {
    // Audio context
    this.audioContext = null;
    this.audioContextState = 'suspended';
    this.useWebAudio = options.useWebAudio !== false;
    
    // Mobile detection
    this.isMobile = this._detectMobile();
    this.requiresUserGesture = this.isMobile;
    this.userGestureReceived = false;
    
    // Audio settings
    this.masterVolume = options.masterVolume || 0.7;
    this.sfxVolume = options.sfxVolume || 0.8;
    this.musicVolume = options.musicVolume || 0.5;
    this.isMuted = options.isMuted || false;
    
    // Audio buffers and sources
    this.audioBuffers = new Map();
    this.audioSources = new Map();
    this.audioElements = new Map(); // Fallback HTML5 Audio
    
    // Audio pools for overlapping sounds
    this.audioPools = new Map();
    this.maxPoolSize = 5;
    
    // Sound definitions
    this.sounds = {
      cast: {
        url: 'assets/sounds/cast.mp3',
        volume: 0.6,
        pool: true
      },
      splash: {
        url: 'assets/sounds/splash.mp3',
        volume: 0.5,
        pool: true
      },
      fishCatch: {
        url: 'assets/sounds/fish-catch.mp3',
        volume: 0.8,
        pool: true
      },
      combo: {
        url: 'assets/sounds/combo.mp3',
        volume: 0.7,
        pool: false
      },
      buttonClick: {
        url: 'assets/sounds/button-click.mp3',
        volume: 0.4,
        pool: true
      },
      gameOver: {
        url: 'assets/sounds/game-over.mp3',
        volume: 0.6,
        pool: false
      },
      newBest: {
        url: 'assets/sounds/new-best.mp3',
        volume: 0.8,
        pool: false
      },
      backgroundMusic: {
        url: 'assets/sounds/background.mp3',
        volume: 0.3,
        loop: true,
        pool: false
      }
    };
    
    // Loading state
    this.isLoading = false;
    this.loadedSounds = new Set();
    this.failedSounds = new Set();
    
    // Performance settings
    this.enableAudio = options.enableAudio !== false;
    this.enableMusic = options.enableMusic !== false;
    this.enableSFX = options.enableSFX !== false;
    this.audioQuality = options.audioQuality || 'medium'; // low, medium, high
    
    // Battery optimization
    this.batteryOptimization = this.isMobile;
    this.maxConcurrentSounds = this.isMobile ? 3 : 8;
    this.activeSounds = 0;
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialize audio system
    this._initialize();
  }

  // ===============================
  // INITIALIZATION
  // ===============================

  /**
   * Initialize audio system
   * @private
   */
  async _initialize() {
    if (!this.enableAudio) return;
    
    try {
      // Setup audio context
      if (this.useWebAudio && this._isWebAudioSupported()) {
        await this._setupWebAudio();
      } else {
        this._setupHTML5Audio();
      }
      
      // Setup event listeners
      this._setupEventListeners();
      
      // Load audio files
      if (!this.requiresUserGesture) {
        await this.preloadSounds();
      }
      
    } catch (error) {
      console.warn('AudioManager: Initialization failed:', error);
      this.enableAudio = false;
    }
  }

  /**
   * Setup Web Audio API
   * @private
   */
  async _setupWebAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.audioContextState = this.audioContext.state;
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.masterVolume;
      
      // Create separate gain nodes for different audio types
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = this.sfxVolume;
      
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = this.musicVolume;
      
    } catch (error) {
      console.warn('AudioManager: Web Audio setup failed:', error);
      this._setupHTML5Audio();
    }
  }

  /**
   * Setup HTML5 Audio fallback
   * @private
   */
  _setupHTML5Audio() {
    this.useWebAudio = false;
    console.log('AudioManager: Using HTML5 Audio fallback');
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Document interaction for mobile audio unlock
    if (this.requiresUserGesture) {
      const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown'];
      
      unlockEvents.forEach(event => {
        document.addEventListener(event, this._handleUserGesture.bind(this), {
          once: true,
          passive: true
        });
      });
    }
    
    // Visibility change for audio pause/resume
    document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
    
    // Audio context state change
    if (this.audioContext) {
      this.audioContext.addEventListener('statechange', this._handleContextStateChange.bind(this));
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
   * Check Web Audio API support
   * @returns {boolean} True if supported
   * @private
   */
  _isWebAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  // ===============================
  // AUDIO LOADING
  // ===============================

  /**
   * Preload all sounds
   * @returns {Promise} Loading promise
   */
  async preloadSounds() {
    if (!this.enableAudio || this.isLoading) return;
    
    this.isLoading = true;
    const loadPromises = [];
    
    Object.entries(this.sounds).forEach(([name, config]) => {
      loadPromises.push(this._loadSound(name, config));
    });
    
    try {
      await Promise.allSettled(loadPromises);
      this._emit('soundsLoaded', {
        loaded: this.loadedSounds.size,
        total: Object.keys(this.sounds).length,
        failed: this.failedSounds.size
      });
    } catch (error) {
      console.warn('AudioManager: Some sounds failed to load:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load individual sound
   * @param {string} name - Sound name
   * @param {Object} config - Sound configuration
   * @returns {Promise} Loading promise
   * @private
   */
  async _loadSound(name, config) {
    try {
      if (this.useWebAudio && this.audioContext) {
        await this._loadWebAudioSound(name, config);
      } else {
        await this._loadHTML5Sound(name, config);
      }
      
      // Setup audio pool if needed
      if (config.pool) {
        this._setupAudioPool(name, config);
      }
      
      this.loadedSounds.add(name);
      
    } catch (error) {
      console.warn(`AudioManager: Failed to load sound '${name}':`, error);
      this.failedSounds.add(name);
    }
  }

  /**
   * Load sound using Web Audio API
   * @param {string} name - Sound name
   * @param {Object} config - Sound configuration
   * @returns {Promise} Loading promise
   * @private
   */
  async _loadWebAudioSound(name, config) {
    const response = await fetch(config.url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.audioBuffers.set(name, audioBuffer);
  }

  /**
   * Load sound using HTML5 Audio
   * @param {string} name - Sound name
   * @param {Object} config - Sound configuration
   * @returns {Promise} Loading promise
   * @private
   */
  _loadHTML5Sound(name, config) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => {
        this.audioElements.set(name, audio);
        resolve();
      }, { once: true });
      
      audio.addEventListener('error', reject, { once: true });
      
      audio.preload = 'auto';
      audio.volume = config.volume * this.sfxVolume * this.masterVolume;
      audio.loop = config.loop || false;
      audio.src = config.url;
      audio.load();
    });
  }

  /**
   * Setup audio pool for overlapping sounds
   * @param {string} name - Sound name
   * @param {Object} config - Sound configuration
   * @private
   */
  _setupAudioPool(name, config) {
    const pool = [];
    const poolSize = Math.min(this.maxPoolSize, this.maxConcurrentSounds);
    
    for (let i = 0; i < poolSize; i++) {
      if (this.useWebAudio) {
        pool.push({ available: true, source: null });
      } else {
        const audio = new Audio(config.url);
        audio.volume = config.volume * this.sfxVolume * this.masterVolume;
        audio.preload = 'auto';
        pool.push({ available: true, element: audio });
      }
    }
    
    this.audioPools.set(name, pool);
  }

  // ===============================
  // SOUND PLAYBACK
  // ===============================

  /**
   * Play sound effect
   * @param {string} name - Sound name
   * @param {Object} options - Playback options
   * @returns {Promise} Playback promise
   */
  async playSound(name, options = {}) {
    if (!this.enableAudio || !this.enableSFX || this.isMuted) return;
    if (!this.loadedSounds.has(name)) return;
    
    // Check concurrent sounds limit
    if (this.activeSounds >= this.maxConcurrentSounds) return;
    
    // Check user gesture requirement
    if (this.requiresUserGesture && !this.userGestureReceived) {
      console.warn('AudioManager: User gesture required for audio playback');
      return;
    }
    
    try {
      if (this.useWebAudio && this.audioContext) {
        return await this._playWebAudioSound(name, options);
      } else {
        return await this._playHTML5Sound(name, options);
      }
    } catch (error) {
      console.warn(`AudioManager: Failed to play sound '${name}':`, error);
    }
  }

  /**
   * Play sound using Web Audio API
   * @param {string} name - Sound name
   * @param {Object} options - Playback options
   * @returns {Promise} Playback promise
   * @private
   */
  async _playWebAudioSound(name, options = {}) {
    const audioBuffer = this.audioBuffers.get(name);
    if (!audioBuffer) return;
    
    const config = this.sounds[name];
    const pool = this.audioPools.get(name);
    
    // Get audio source (from pool or create new)
    let poolItem = null;
    if (pool) {
      poolItem = pool.find(item => item.available);
      if (!poolItem) return; // Pool exhausted
    }
    
    // Create audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = config.loop || false;
    
    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = (config.volume || 1.0) * (options.volume || 1.0);
    
    // Connect audio graph
    source.connect(gainNode);
    
    if (config.loop || name === 'backgroundMusic') {
      gainNode.connect(this.musicGain);
    } else {
      gainNode.connect(this.sfxGain);
    }
    
    // Setup cleanup
    const cleanup = () => {
      this.activeSounds--;
      if (poolItem) {
        poolItem.available = true;
        poolItem.source = null;
      }
    };
    
    source.addEventListener('ended', cleanup);
    
    // Start playback
    this.activeSounds++;
    if (poolItem) {
      poolItem.available = false;
      poolItem.source = source;
    }
    
    source.start(0, options.offset || 0, options.duration);
    
    return source;
  }

  /**
   * Play sound using HTML5 Audio
   * @param {string} name - Sound name
   * @param {Object} options - Playback options
   * @returns {Promise} Playback promise
   * @private
   */
  async _playHTML5Sound(name, options = {}) {
    const config = this.sounds[name];
    const pool = this.audioPools.get(name);
    
    let audio;
    
    if (pool) {
      const poolItem = pool.find(item => item.available);
      if (!poolItem) return; // Pool exhausted
      
      audio = poolItem.element;
      poolItem.available = false;
      
      // Setup cleanup
      const cleanup = () => {
        this.activeSounds--;
        poolItem.available = true;
      };
      
      audio.addEventListener('ended', cleanup, { once: true });
      audio.addEventListener('pause', cleanup, { once: true });
      
    } else {
      audio = this.audioElements.get(name);
      if (!audio) return;
    }
    
    // Set volume
    audio.volume = (config.volume || 1.0) * 
                   (options.volume || 1.0) * 
                   this.sfxVolume * 
                   this.masterVolume;
    
    // Set playback position
    if (options.offset) {
      audio.currentTime = options.offset;
    }
    
    this.activeSounds++;
    
    return audio.play();
  }

  /**
   * Play background music
   * @param {string} name - Music name (default: 'backgroundMusic')
   * @param {Object} options - Playback options
   */
  async playMusic(name = 'backgroundMusic', options = {}) {
    if (!this.enableAudio || !this.enableMusic || this.isMuted) return;
    
    // Stop current music
    this.stopMusic();
    
    try {
      const source = await this.playSound(name, {
        ...options,
        volume: this.musicVolume
      });
      
      if (source) {
        this.currentMusic = { name, source };
      }
      
    } catch (error) {
      console.warn('AudioManager: Failed to play music:', error);
    }
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (!this.currentMusic) return;
    
    try {
      if (this.useWebAudio && this.currentMusic.source) {
        this.currentMusic.source.stop();
      } else {
        const audio = this.audioElements.get(this.currentMusic.name);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    } catch (error) {
      console.warn('AudioManager: Failed to stop music:', error);
    } finally {
      this.currentMusic = null;
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds() {
    // Stop Web Audio sources
    if (this.useWebAudio) {
      this.audioPools.forEach(pool => {
        pool.forEach(item => {
          if (item.source && !item.available) {
            try {
              item.source.stop();
              item.available = true;
              item.source = null;
            } catch (error) {
              // Source may already be stopped
            }
          }
        });
      });
    } else {
      // Stop HTML5 Audio elements
      this.audioPools.forEach(pool => {
        pool.forEach(item => {
          if (!item.available) {
            try {
              item.element.pause();
              item.element.currentTime = 0;
              item.available = true;
            } catch (error) {
              // Element may already be paused
            }
          }
        });
      });
    }
    
    this.activeSounds = 0;
    this.stopMusic();
  }

  // ===============================
  // VOLUME CONTROL
  // ===============================

  /**
   * Set master volume
   * @param {number} volume - Volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    if (this.useWebAudio && this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    } else {
      // Update HTML5 Audio volumes
      this.audioElements.forEach(audio => {
        const soundName = this._getSoundNameFromAudio(audio);
        const config = this.sounds[soundName];
        if (config) {
          audio.volume = config.volume * this.sfxVolume * this.masterVolume;
        }
      });
    }
    
    this._emit('volumeChanged', { type: 'master', volume: this.masterVolume });
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume (0-1)
   */
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    
    if (this.useWebAudio && this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
    
    this._emit('volumeChanged', { type: 'sfx', volume: this.sfxVolume });
  }

  /**
   * Set music volume
   * @param {number} volume - Volume (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    
    if (this.useWebAudio && this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
    
    this._emit('volumeChanged', { type: 'music', volume: this.musicVolume });
  }

  /**
   * Mute/unmute audio
   * @param {boolean} muted - Mute state
   */
  setMuted(muted) {
    this.isMuted = muted;
    
    if (muted) {
      this.stopAllSounds();
    }
    
    this._emit('muteChanged', this.isMuted);
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.setMuted(!this.isMuted);
  }

  // ===============================
  // EVENT HANDLERS
  // ===============================

  /**
   * Handle user gesture for audio unlock
   * @param {Event} event - User interaction event
   * @private
   */
  async _handleUserGesture(event) {
    if (this.userGestureReceived) return;
    
    this.userGestureReceived = true;
    
    try {
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Start loading sounds if not already loaded
      if (!this.isLoading && this.loadedSounds.size === 0) {
        await this.preloadSounds();
      }
      
      this._emit('audioUnlocked');
      
    } catch (error) {
      console.warn('AudioManager: Audio unlock failed:', error);
    }
  }

  /**
   * Handle visibility change
   * @private
   */
  _handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      // Pause audio when tab/app is hidden
      if (this.batteryOptimization) {
        this.stopAllSounds();
      }
    }
  }

  /**
   * Handle audio context state change
   * @private
   */
  _handleContextStateChange() {
    if (this.audioContext) {
      this.audioContextState = this.audioContext.state;
      this._emit('contextStateChanged', this.audioContextState);
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get sound name from HTML5 Audio element
   * @param {HTMLAudioElement} audio - Audio element
   * @returns {string|null} Sound name
   * @private
   */
  _getSoundNameFromAudio(audio) {
    for (const [name, element] of this.audioElements.entries()) {
      if (element === audio) return name;
    }
    return null;
  }

  /**
   * Get audio loading progress
   * @returns {Object} Loading progress
   */
  getLoadingProgress() {
    const total = Object.keys(this.sounds).length;
    const loaded = this.loadedSounds.size;
    const failed = this.failedSounds.size;
    
    return {
      total,
      loaded,
      failed,
      progress: total > 0 ? loaded / total : 0,
      isComplete: loaded + failed >= total
    };
  }

  /**
   * Check if sound is available
   * @param {string} name - Sound name
   * @returns {boolean} True if available
   */
  isSoundAvailable(name) {
    return this.loadedSounds.has(name);
  }

  /**
   * Get audio system info
   * @returns {Object} System information
   */
  getSystemInfo() {
    return {
      audioSupported: this.enableAudio,
      webAudioSupported: this._isWebAudioSupported(),
      usingWebAudio: this.useWebAudio,
      isMobile: this.isMobile,
      requiresUserGesture: this.requiresUserGesture,
      userGestureReceived: this.userGestureReceived,
      audioContextState: this.audioContextState,
      activeSounds: this.activeSounds,
      maxConcurrentSounds: this.maxConcurrentSounds
    };
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
        console.warn('AudioManager: Error in event callback:', error);
      }
    });
  }

  // ===============================
  // CLEANUP
  // ===============================

  /**
   * Destroy audio manager and cleanup resources
   */
  destroy() {
    // Stop all sounds
    this.stopAllSounds();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Clear buffers and elements
    this.audioBuffers.clear();
    this.audioElements.clear();
    this.audioPools.clear();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    
    // Clear event listeners
    this.eventListeners = {};
    
    this._emit('destroyed');
  }
} 