module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins: ['jest'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Performance-oriented rules for mobile games
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Mobile-first best practices
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'prefer-destructuring': ['error', {
      array: true,
      object: true
    }],
    
    // Performance rules
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-new-object': 'error',
    'no-array-constructor': 'error',
    
    // Mobile touch event rules
    'no-restricted-globals': ['error',
      {
        name: 'event',
        message: 'Use local parameter instead of global event object'
      }
    ],
    
    // Code quality for game development
    'complexity': ['error', { max: 10 }],
    'max-depth': ['error', { max: 4 }],
    'max-lines-per-function': ['error', { max: 20, skipBlankLines: true }],
    'max-params': ['error', { max: 4 }],
    
    // Canvas and game-specific rules
    'no-magic-numbers': ['warn', { 
      ignore: [0, 1, -1, 2, 60, 1000],
      ignoreArrayIndexes: true,
      detectObjects: false
    }],
    
    // Jest testing rules
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-magic-numbers': 'off',
        'max-lines-per-function': 'off'
      }
    },
    {
      files: ['webpack.config.js', '.eslintrc.js'],
      env: {
        node: true,
        browser: false
      }
    }
  ]
}; 