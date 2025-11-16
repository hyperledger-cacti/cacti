import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a compat instance using the equivalent of your .eslintrc.js
const compat = new FlatCompat({
  baseDirectory: __dirname
});

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/**/*',
      'src/main/typescript/generated/**',
      'src/main/solidity/generated/**',  
      'src/test/solidity/generated/**',
      'src/test/typescript/fabric/contracts/**',
    ],
  },

  // Include JS config
  js.configs.recommended,
  
  // Main TypeScript configuration
  ...compat.config({
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    extends: [
      "plugin:@typescript-eslint/recommended",
      "prettier",
      "plugin:prettier/recommended",
    ],
    rules: {
      "no-prototype-builtins": "error",
      "@typescript-eslint/no-duplicate-enum-values": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-dupe-class-members": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
      "indent": ["off"],
      "semi": ["error", "always"],
      "new-cap": ["off"],
      "comma-dangle": ["warn", "always-multiline"],
      // Turn off some rules that are causing issues in the codebase
      "no-constant-condition": "warn",
      "no-fallthrough": "warn",
      "no-empty": "warn",
      "no-case-declarations": "warn",
      "no-duplicate-case": "warn",
    },
  }),
  
  // Special config for test files
  {
    files: ["**/*.test.js", "**/test/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        Buffer: "readonly",
        console: "readonly",
        module: "readonly",
        describe: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        it: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
  
  // Special config for contract files
  {
    files: ["**/contracts/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        Buffer: "readonly",
        console: "readonly",
        module: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
];
