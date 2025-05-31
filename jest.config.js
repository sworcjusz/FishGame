module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    'jest-canvas-mock',
    '<rootDir>/tests/setup.js'
  ],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/e2e/'
  ],
  
  // Module mapping for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds for mobile game quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher standards for core game files
    'src/game/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Critical utilities need higher coverage
    'src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Mock settings for Canvas and Web APIs
  setupFiles: ['<rootDir>/tests/mocks/canvas.js'],
  
  // Test timeout for performance tests
  testTimeout: 10000,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,
  
  // For mobile performance testing
  globals: {
    'performance': {},
    'requestAnimationFrame': {}
  }
}; 