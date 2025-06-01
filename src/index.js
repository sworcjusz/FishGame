import './styles/main.css';
import { Game } from './game/Game.js';

/**
 * Initialize the Tiny Fish Catch game
 * Entry point for the application
 */
class FishGameApp {
  constructor() {
    this.game = null;
    this.initialized = false;
  }

  /**
   * Initialize the game application
   * @param {HTMLElement|string} container - Container element or selector
   */
  init(container = '#fish-game-container') {
    try {
      const gameContainer = this._getGameContainer(container);

      if (!this.checkBrowserSupport()) {
        this.showUnsupportedBrowserMessage(gameContainer);
        return;
      }

      this._initializeGame(gameContainer);
    } catch (error) {
      console.error('Failed to initialize fish game:', error);
      this.showErrorMessage(container, error.message);
    }
  }

  /**
   * Get game container element
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {HTMLElement} Game container element
   * @private
   */
  _getGameContainer(container) {
    const gameContainer =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!gameContainer) {
      throw new Error(`Game container not found: ${container}`);
    }

    return gameContainer;
  }

  /**
   * Initialize the game instance
   * @param {HTMLElement} gameContainer - Game container element
   * @private
   */
  _initializeGame(gameContainer) {
    // Clear container (remove loading screen)
    gameContainer.innerHTML = '';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.style.width = '100%';
    canvas.style.height = '100vh';
    canvas.style.maxHeight = '667px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.backgroundColor = '#87CEEB'; // Sky blue water background
    gameContainer.appendChild(canvas);

    // Create simple start menu overlay
    const menuOverlay = document.createElement('div');
    menuOverlay.id = 'game-menu';
    menuOverlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 10;
    `;
    menuOverlay.innerHTML = `
      <h1 style="font-size: 2em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">🐟 Tiny Fish Catch</h1>
      <button id="startGameBtn" style="
        font-size: 1.2em; 
        padding: 15px 30px; 
        background: #4CAF50; 
        color: white; 
        border: none; 
        border-radius: 5px;
        cursor: pointer;
        margin: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        min-height: 44px;
        min-width: 120px;">
        🎣 Zacznij grę
      </button>
    `;
    gameContainer.appendChild(menuOverlay);

    // Initialize game with proper options
    this.game = new Game({ 
      canvasId: 'gameCanvas'
    });
    
    // Setup start button functionality
    const startBtn = document.getElementById('startGameBtn');
    startBtn.addEventListener('click', () => {
      menuOverlay.style.display = 'none';
      this.game.start();
    });
    
    this.initialized = true;
  }

  /**
   * Check if the browser supports required features
   * @returns {boolean} Browser support status
   */
  checkBrowserSupport() {
    // Check for Canvas support
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.getContext('2d')) {
      return false;
    }

    // Check for requestAnimationFrame
    if (!window.requestAnimationFrame) {
      return false;
    }

    return true;
  }

  /**
   * Show unsupported browser message
   * @param {HTMLElement} container - Container element
   */
  showUnsupportedBrowserMessage(container) {
    container.innerHTML = `
      <div class="fish-game-error">
        <h3>🐟 Tiny Fish Catch</h3>
        <p>Twoja przeglądarka nie obsługuje tej gry.</p>
        <p>Spróbuj zaktualizować przeglądarkę lub użyć nowszej wersji.</p>
      </div>
    `;
  }

  /**
   * Show error message
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} message - Error message
   */
  showErrorMessage(container, message) {
    const gameContainer =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (gameContainer) {
      gameContainer.innerHTML = `
        <div class="fish-game-error">
          <h3>🐟 Tiny Fish Catch</h3>
          <p>Wystąpił błąd podczas ładowania gry:</p>
          <p>${message}</p>
          <button onclick="location.reload()">Spróbuj ponownie</button>
        </div>
      `;
    }
  }

  /**
   * Destroy the game instance
   */
  destroy() {
    if (this.game) {
      this.game.destroy();
      this.game = null;
      this.initialized = false;
    }
  }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired - initializing fish game');
  const container = document.querySelector('#fish-game-container');
  if (container) {
    console.log('Fish game container found, initializing...');
    const app = new FishGameApp();
    app.init(container);

    // Make app available globally for WordPress shortcode
    window.FishGameApp = app;
  } else {
    console.error('Fish game container #fish-game-container not found!');
  }
});

// Fallback if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('DOM is still loading, waiting for DOMContentLoaded');
} else {
  console.log('DOM already loaded, initializing immediately');
  const container = document.querySelector('#fish-game-container');
  if (container) {
    console.log('Fish game container found (immediate init)');
    const app = new FishGameApp();
    app.init(container);
    window.FishGameApp = app;
  } else {
    console.error('Fish game container #fish-game-container not found (immediate init)!');
  }
}

// Export for manual initialization (WordPress shortcode)
export default FishGameApp;
