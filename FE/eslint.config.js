import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript any 타입 금지
      '@typescript-eslint/no-explicit-any': 'error',

      // 의존성 배열 누락 체크
      'react-hooks/exhaustive-deps': 'warn',

      // Interface에 I 접두사 금지
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        // Jotai atom 변수: Atom 접미사 필수
        {
          selector: 'variable',
          filter: {
            regex: '[Aa]tom$',
            match: true,
          },
          format: ['camelCase'],
          suffix: ['Atom'],
        },
        // Phaser Scene 클래스: Scene 접미사 필수
        {
          selector: 'class',
          filter: {
            regex: 'Scene$',
            match: true,
          },
          format: ['PascalCase'],
          suffix: ['Scene'],
        },
      ],

      // Import 순서
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. External (react, jotai, phaser 등)
            ['^react', '^@?\\w'],
            // 2. Internal (@/ 절대 경로, 타입/스타일 제외)
            ['^@/(?!.*\\.(types|css)$)'],
            // 3. Relative 상위 경로
            ['^\\.\\./?(?!.*\\.(types|css)$)'],
            // 4. Relative 현재 경로
            ['^\\./?(?!.*\\.(types|css)$)'],
            // 5. Types (import type)
            ['^@/.*\\.types$', '^@/types', '^.*\\.types$', '^.*\\u0000$'],
            // 6. Styles
            ['^.*\\.css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  // Prettier 포매팅 충돌 방지 (항상 마지막)
  prettier
);
