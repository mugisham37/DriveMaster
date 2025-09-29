module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      './tsconfig.json',
      './services/*/tsconfig.json',
      './packages/*/tsconfig.json',
      './services/*/src/scripts/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'prettier', 'node'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:node/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/strict-boolean-expressions': [
      'error',
      { allowString: false, allowNumber: false },
    ],

    // Import rules
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    'import/no-unresolved': 'off', // TypeScript handles this

    // Node.js rules
    'node/no-missing-import': 'off', // TypeScript handles this
    'node/no-unsupported-features/es-syntax': 'off', // We use TypeScript

    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // Prettier integration
    'prettier/prettier': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          './tsconfig.json',
          './services/*/tsconfig.json',
          './packages/*/tsconfig.json',
          './services/*/src/scripts/tsconfig.json',
        ],
      },
    },
  },
  overrides: [
    {
      files: ['**/scripts/*.ts'],
      rules: {
        'node/shebang': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
      parserOptions: {
        project: null,
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', 'android', 'ios', '*.js', '*.d.ts', 'coverage'],
}
