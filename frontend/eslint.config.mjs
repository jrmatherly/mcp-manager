import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

const eslintConfig = [
  // Global ignores - MUST be first for proper exclusion
  {
    ignores: [
      '**/node_modules/**',  // Exclude all node_modules (ESLint does this by default but being explicit)
      '**/.next/**',         // Next.js build output
      '**/out/**',           // Next.js export output
      '**/dist/**',          // Distribution/build output
      '**/build/**',         // Build output
      '**/coverage/**',      // Test coverage reports
      '**/.nyc_output/**',   // NYC test coverage
      '**/public/**/*.js',   // Generated/third-party scripts in public
      '**/.git/**',          // Git directory (ESLint does this by default but being explicit)
      '**/.vscode/**',       // VS Code settings
      '**/.idea/**',         // IntelliJ IDEA settings
      '**/temp/**',          // Temporary files
      '**/tmp/**',           // Temporary files
      '**/*.min.js',         // Minified files
      '**/*.d.ts',           // TypeScript declaration files
      'vitest.d.ts',         // Vitest type declarations
      '**/drizzle/**/*.sql', // SQL migration files
      '**/drizzle/meta/**',  // Drizzle metadata
    ],
  },

  // Base configuration
  js.configs.recommended,

  // TypeScript configuration
  ...tseslint.configs.recommended,

  // Next.js configuration (includes React rules)
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // React hooks configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Language options
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Custom rules (avoid duplicating Next.js rules)
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false }
      ],

      // General rules (not covered by Next.js)
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'no-duplicate-imports': 'error',
    },
  },

  // Scripts directory overrides
  {
    files: ['scripts/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Test files overrides
  {
    files: [
      'tests/**/*.test.{js,jsx,ts,tsx}',
      'tests/**/*.spec.{js,jsx,ts,tsx}',
      'tests/**/*-utils.{js,jsx,ts,tsx}',
      'tests/**/utils/**/*.{js,jsx,ts,tsx}',
      'tests/**/*.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console.log in test files for debugging
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' types in test assertions
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow more flexible naming for test data
      '@typescript-eslint/naming-convention': 'off',
      // Allow require() for dynamic imports in tests
      '@typescript-eslint/no-require-imports': 'off',
      // Allow non-null assertions in tests for known test data
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Allow array access on unknown types for database query results
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // Allow flexible type assertions in tests
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Allow case declarations
      'no-case-declarations': 'off',
    },
  },
]

export default eslintConfig