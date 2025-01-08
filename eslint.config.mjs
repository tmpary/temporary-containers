import globals from 'globals';
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import jquery from 'eslint-config-jquery';

export default tseslint.config(
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.jquery,

        // TODO: should node really be here?
        ...globals.node,
      },

      ecmaVersion: 2018,
      sourceType: 'commonjs',

      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  },
  {
    ignores: ['src/ui/vendor', '**/*.html', 'dist'],
  },
  eslint.configs.recommended,

  // TODO: reenable after updating typescript
  // ...tseslint.configs.strict,
  // ...tseslint.configs.stylistic,
  ...vue.configs['flat/vue2-recommended'],
  prettier,
  jquery,
  {
    rules: {
      'computed-property-spacing': ['warn', 'never'],
      'array-bracket-spacing': ['warn', 'never'],
      quotes: ['warn', 'single'],
      'comma-dangle': ['warn', 'only-multiline'],
      'space-in-parens': ['warn', 'never'],
      'lines-around-comment': 'off',
      'operator-linebreak': 'off',
      'template-curly-spacing': ['warn', 'never'],
    },
  }
);
