/**
 * Canvas API mock for game testing
 * Provides realistic Canvas 2D context mock for mobile game development
 */

// Enhanced Canvas 2D context mock
const createCanvasContext2D = () => ({
  // Drawing rectangles
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  clearRect: jest.fn(),

  // Drawing text
  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100, height: 12 })),

  // Line styles
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,

  // Text styles
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',

  // Fill and stroke styles
  fillStyle: '#000000',
  strokeStyle: '#000000',

  // Shadows
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,

  // Paths
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  ellipse: jest.fn(),
  rect: jest.fn(),

  // Path drawing
  fill: jest.fn(),
  stroke: jest.fn(),
  drawFocusIfNeeded: jest.fn(),
  scrollPathIntoView: jest.fn(),
  clip: jest.fn(),
  isPointInPath: jest.fn(() => false),
  isPointInStroke: jest.fn(() => false),

  // Transformations
  rotate: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),

  // Compositing
  globalAlpha: 1.0,
  globalCompositeOperation: 'source-over',

  // Drawing images
  drawImage: jest.fn(),

  // Pixel manipulation
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  putImageData: jest.fn(),

  // State
  save: jest.fn(),
  restore: jest.fn(),

  // Hit regions (experimental)
  addHitRegion: jest.fn(),
  removeHitRegion: jest.fn(),
  clearHitRegions: jest.fn(),

  // Canvas dimensions (for game calculations)
  canvas: {
    width: 375,  // iPhone SE width
    height: 667, // iPhone SE height
    getBoundingClientRect: jest.fn(() => ({
      left: 0,
      top: 0,
      width: 375,
      height: 667,
      right: 375,
      bottom: 667,
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  },
});

// Mock HTMLCanvasElement
if (!global.HTMLCanvasElement) {
  global.HTMLCanvasElement = class HTMLCanvasElement {
    constructor() {
      this.width = 375;
      this.height = 667;
      this.style = {};
    }

    getContext(contextType) {
      if (contextType === '2d') {
        return createCanvasContext2D();
      }
      return null;
    }

    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: this.width,
        height: this.height,
        right: this.width,
        bottom: this.height,
      };
    }

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {}
  };
}

// Enhance existing Canvas prototype if needed
if (global.HTMLCanvasElement && !global.HTMLCanvasElement.prototype.getContext) {
  global.HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === '2d') {
      return createCanvasContext2D();
    }
    return null;
  };
}

// Mock CanvasRenderingContext2D if not available
if (!global.CanvasRenderingContext2D) {
  global.CanvasRenderingContext2D = function() {
    return createCanvasContext2D();
  };
}

// Mock Path2D for advanced path operations
if (!global.Path2D) {
  global.Path2D = class Path2D {
    constructor(path) {
      this.path = path || '';
    }

    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  };
}

// Export for manual usage in tests
module.exports = {
  createCanvasContext2D,
  HTMLCanvasElement: global.HTMLCanvasElement,
  Path2D: global.Path2D,
}; 