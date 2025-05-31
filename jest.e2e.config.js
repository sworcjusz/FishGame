module.exports = {
  // Display name for multi-config runs
  displayName: 'E2E Tests',
  
  // Test environment for Puppeteer
  testEnvironment: 'node',
  
  // Test file patterns for E2E
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.js',
    '<rootDir>/tests/e2e/**/*.spec.js'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/tests/e2e/setup.js'
  ],
  
  // Global setup/teardown for Puppeteer
  globalSetup: '<rootDir>/tests/e2e/globalSetup.js',
  globalTeardown: '<rootDir>/tests/e2e/globalTeardown.js',
  
  // Ignore unit and integration tests
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/unit/',
    '<rootDir>/tests/integration/',
    '<rootDir>/src/'
  ],
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // No coverage for E2E tests (covered by unit/integration)
  collectCoverage: false,
  
  // Longer timeout for E2E tests and mobile device simulation
  testTimeout: 30000,
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Verbose output for E2E debugging
  verbose: true,
  
  // Clear mocks
  clearMocks: true,
  restoreMocks: true,
  
  // E2E specific globals
  globals: {
    // Puppeteer browser and page will be available
    '__BROWSER__': {},
    '__PAGE__': {},
    
    // Mobile device configurations
    '__MOBILE_DEVICES__': {
      'iPhone SE': {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      },
      'iPhone 12': {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      },
      'Samsung Galaxy S21': {
        width: 384,
        height: 854,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      },
      'iPad': {
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      }
    },
    
    // Performance thresholds for E2E testing
    '__PERFORMANCE_THRESHOLDS__': {
      firstContentfulPaint: 1500, // 1.5s
      timeToInteractive: 3000,    // 3s
      cumulativeLayoutShift: 0.1,
      largestContentfulPaint: 2500, // 2.5s
      totalBlockingTime: 300,
      speedIndex: 2000
    },
    
    // Network conditions for testing
    '__NETWORK_CONDITIONS__': {
      'Fast 3G': {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
        latency: 40
      },
      'Slow 3G': {
        offline: false,
        downloadThroughput: 500 * 1024 / 8,  // 500 Kbps
        uploadThroughput: 500 * 1024 / 8,    // 500 Kbps
        latency: 400
      }
    }
  },
  
  // Maximum concurrent workers for E2E (resource intensive)
  maxWorkers: 2,
  
  // Retry failed tests (mobile can be flaky)
  retry: 2,
  
  // Test reporter for E2E
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './e2e-reports',
      filename: 'e2e-report.html',
      expand: true
    }]
  ]
}; 