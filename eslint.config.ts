import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default defineConfig(
  {
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'coverage',
      '.vite-scaffold',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      'no-undef': 'off',
      'vue/multi-word-component-names': [
        'error',
        { ignores: ['Waveform', 'App'] },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  eslintConfigPrettier,
)
