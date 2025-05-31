/**
 * Jest setup file for unit and integration tests
 * Mobile-first game testing utilities
 */

// Mock Canvas API for testing
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock requestAnimationFrame for smooth testing
global.requestAnimationFrame = jest.fn(cb => {
  setTimeout(cb, 16); // ~60fps
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock performance API for mobile performance testing
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  timing: {
    navigationStart: Date.now(),
    loadEventEnd: Date.now() + 1000,
  },
};

// Mock touch events for mobile testing
global.TouchEvent = class TouchEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.touches = eventInitDict.touches || [];
    this.targetTouches = eventInitDict.targetTouches || [];
    this.changedTouches = eventInitDict.changedTouches || [];
  }
};

global.Touch = class Touch {
  constructor(touchInit) {
    this.identifier = touchInit.identifier || 0;
    this.target = touchInit.target || null;
    this.clientX = touchInit.clientX || 0;
    this.clientY = touchInit.clientY || 0;
    this.pageX = touchInit.pageX || 0;
    this.pageY = touchInit.pageY || 0;
    this.screenX = touchInit.screenX || 0;
    this.screenY = touchInit.screenY || 0;
    this.radiusX = touchInit.radiusX || 0;
    this.radiusY = touchInit.radiusY || 0;
    this.rotationAngle = touchInit.rotationAngle || 0;
    this.force = touchInit.force || 1;
  }
};

// Mock Web Audio API (optional for fish game)
global.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 },
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 },
  })),
  destination: {},
  currentTime: 0,
}));

// Mock Image loading for sprites
global.Image = class Image {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 100;
    this.height = 100;
  }
  
  set src(value) {
    this._src = value;
    // Simulate async loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
  
  get src() {
    return this._src;
  }
};

// Mock localStorage for game state persistence
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock screen orientation for mobile testing
Object.defineProperty(screen, 'orientation', {
  value: {
    type: 'portrait-primary',
    angle: 0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Mock navigator for mobile device detection
Object.defineProperty(navigator, 'maxTouchPoints', {
  value: 5,
  writable: true,
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  writable: true,
});

// Utility function for creating touch events in tests
global.createTouchEvent = (type, touches = []) => {
  return new TouchEvent(type, {
    touches,
    targetTouches: touches,
    changedTouches: touches,
  });
};

// Utility function for creating touch objects
global.createTouch = (x = 0, y = 0, id = 0) => {
  return new Touch({
    identifier: id,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    screenX: x,
    screenY: y,
  });
};

// Mobile viewport simulation
global.setMobileViewport = (width = 375, height = 667) => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    writable: true,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    value: 2,
    writable: true,
  });
};

// Initialize mobile viewport by default
global.setMobileViewport();

// Console warning filter for known Canvas testing issues
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('Canvas')
  ) {
    return;
  }
  originalWarn.apply(console, args);
}; 