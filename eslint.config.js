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
    // Allowlisted exception: the only packages/app/src file permitted to import @dyel/pipeline
    // directly (real-fixture PipelineModel coverage). App.tsx and usePipelineValidation.ts no
    // longer need this exception as of Phase 3 of the App Refactor migration (App Refactor
    // migration's Phase 3, see root HANDOFF.md) — both now go through @dyel/api exclusively.
    files: ['packages/app/src/features/lift/usePipelineVariationRadarData.test.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Enforce component render-only constraint: .tsx files in features/*/and shared/* must not
    // import @dyel/api derivation functions directly — they must be called in feature hooks instead.
    files: ['packages/app/src/{features,shared}/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@dyel/api',
              message: 'Components must be render-only — derive data via a feature hook, not @dyel/api directly. See packages/app/CLAUDE.md.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // shared/charts/* imports chart display helpers (formatChartDate, color constants)
    files: ['packages/app/src/shared/charts/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // ConjugateCharts.tsx imports LINE_COLORS (display constant array)
    files: ['packages/app/src/features/lift/ConjugateCharts.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // TeamHistoryChart.tsx imports LINE_COLORS (display constant array) and NORMALIZED_KEY_SUFFIX
    // (a plain string constant used to key/label the normalized companion line's tooltip) — same
    // category as ConjugateCharts.tsx's LINE_COLORS exception above, not business-logic derivation.
    files: ['packages/app/src/features/team-view/TeamHistoryChart.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // DiagnosticsPanel.tsx imports formatEffect/formatAddlWtOffset (display formatters)
    files: ['packages/app/src/features/lift/DiagnosticsPanel.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // VariationRadarChart.tsx imports roundWeight (display rounding in tooltip renderer)
    files: ['packages/app/src/features/lift/VariationRadarChart.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // SessionBarChart.tsx imports formatChartDate (display formatter)
    files: ['packages/app/src/features/sigma/SessionBarChart.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // RepCalculator.tsx imports CONJUGATE_BARS/STANCES/EQUIPMENT/ADDL_WTS (facet option constants, not derivation)
    files: ['packages/app/src/features/calculator/RepCalculator.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // DateRangePicker.tsx imports presetDateRange/activePreset (pure Date-range utilities, no PipelineModel dependency)
    files: ['packages/app/src/shared/components/DateRangePicker.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    // Enforce feature barrel imports: features may only import sibling features via their index.ts barrel.
    // This blocks deep relative imports like ../sigma/SigmaChart while allowing barrel imports like ../sigma.
    // Uses explicit feature directory names to avoid false positives with ../../app or ../../shared imports.
    // Patterns include both ../name/* (correct deep-import form) and ../../features/name/* (evasion form) to
    // catch both intended and accidental violations.
    files: ['packages/app/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../data-source/*',
                '../index-page/*',
                '../lift/*',
                '../sigma/*',
                '../validation/*',
                '../calculator/*',
                '../conjugate-info/*',
                '../../features/data-source/*',
                '../../features/index-page/*',
                '../../features/lift/*',
                '../../features/sigma/*',
                '../../features/validation/*',
                '../../features/calculator/*',
                '../../features/conjugate-info/*',
              ],
              message:
                'Features may import other features only via their index.ts barrel (e.g. `../sigma`, not `../sigma/SigmaChart`) — see root CLAUDE.md and packages/app/CLAUDE.md.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allowlisted exception: index-page/index.ts also re-exports the IndexPage page component,
    // which main.tsx lazy-loads for code-splitting. Barrel-importing useIndexData here would
    // statically pull IndexPage into the main bundle and defeat that split, so this file keeps
    // the deep import `../index-page/useIndexData` instead. See the comment in SheetUrlPanel.tsx.
    files: ['packages/app/src/features/data-source/SheetUrlPanel.tsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
