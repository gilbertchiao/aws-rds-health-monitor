// ESLint flat config（ESLint 9 起的設定格式，取代舊版 .eslintrc.js）
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // 忽略不需檢查的目錄
  {
    ignores: ['node_modules/**', 'coverage/**']
  },

  // 套用官方推薦規則
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      // Lambda function 需要用 console 輸出到 CloudWatch Logs，故關閉此規則
      'no-console': 'off',

      // 允許以底線開頭的參數為未使用（例如 Lambda handler 必須保留的 event / context）
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // 程式碼風格規則
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'comma-dangle': ['error', 'never'],
      'arrow-parens': ['error', 'as-needed']
    }
  }
];
