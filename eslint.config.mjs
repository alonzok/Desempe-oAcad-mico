import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

// generate a disable map for rules tied to legacy (now ignored) function component
// propTypes/defaultProps features; we don't blanket disable every react rule—only those that hinge
// on removed runtime behavior
const react19LegacyRulesOff = {
  'react/prop-types': 'off',
  'react/require-default-props': 'off',
  'react/default-props-match-prop-types': 'off',
  'react/no-unused-prop-types': 'off',
  'react/react-in-jsx-scope': 'off'
};

export default [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  jsxA11yPlugin.flatConfigs.recommended,
  reactPlugin.configs.flat.recommended,
  reactHooksPlugin.configs['recommended-latest'],
  { ignores: ['dist/', 'extension.js'] },
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        // Globals del navegador
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        // Globals de Node
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    settings: {
      'import/extensions': ['.js', '.jsx'],
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx']
        }
      },
      react: {
        version: 'detect'
      },
      linkComponents: [
        'Hyperlink', { name: 'Link', linkAttribute: 'to' }
      ]
    },
    // merge Jest recommended rules and disable legacy React 19 function component prop rules
    rules: {
      ...react19LegacyRulesOff,
      // no-unused-vars: warn en lugar de error, e ignora lo que empieza con _
      'no-unused-vars': ['warn', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_',   // parámetros como _e, _req no generan warning
        varsIgnorePattern: '^_'    // variables como _unused tampoco
      }]
    }
  }
];