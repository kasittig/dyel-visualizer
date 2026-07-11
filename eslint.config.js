import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['**/dist/**', '.claude/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of default exports (Google TypeScript Style Guide).',
        },
      ],
    },
  },
  {
    // Vite and Vitest config files must use default exports (framework requirement).
    files: ['**/vite.config.ts', '**/vitest.config.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Enforce the @dyel/api boundary: packages/app/src must not import @dyel/pipeline directly,
    // except for the small set of files with a documented reason to do so (see below).
    files: ['packages/app/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@dyel/pipeline',
              message:
                'packages/app must consume @dyel/pipeline only through @dyel/api. See root CLAUDE.md "Strict Importing Rules".',
            },
          ],
        },
      ],
    },
  },
  {
    // Allowlisted exceptions: these are the only packages/app/src files permitted to import
    // @dyel/pipeline directly (App.tsx and usePipelineValidation.ts for production wiring;
    // the radar data test for real-fixture PipelineModel coverage).
    files: [
      'packages/app/src/App.tsx',
      'packages/app/src/hooks/infra/usePipelineValidation.ts',
      'packages/app/src/hooks/pipeline/usePipelineVariationRadarData.test.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
