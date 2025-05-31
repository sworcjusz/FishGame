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
      const gameContainer = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;

      if (!gameContainer) {
        throw new Error(`Game container not found: ${container}`);
      }

      // Check for required browser features
      if (!this.checkBrowserSupport()) {
        this.showUnsupportedBrowserMessage(gameContainer);
        return;
      }

      // Initialize the game
      this.game = new Game(gameContainer);
      this.game.init();
      this.initialized = true;

      console.log('🐟 Tiny Fish Catch game initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize fish game:', error);
      this.showErrorMessage(container, error.message);
    }
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

    // Check for touch events (mobile devices)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
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
    const gameContainer = typeof container === 'string' 
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
  const container = document.querySelector('#fish-game-container');
  if (container) {
    const app = new FishGameApp();
    app.init(container);
    
    // Make app available globally for WordPress shortcode
    window.FishGameApp = app;
  }
});

// Export for manual initialization (WordPress shortcode)
export default FishGameApp; 