// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = defineConfig([
  {
    ignores: ["dist/**", ".angular/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      "max-len": [
        "error",
        {
          code: 200,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],

      // Correctness / safety
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",

      // Modern Angular best practices
      "@angular-eslint/prefer-standalone": "error",
      "@angular-eslint/use-injectable-provided-in": "error",
      "@angular-eslint/no-uncalled-signals": "error",
      "@angular-eslint/prefer-on-push-component-change-detection": "warn",
      "@angular-eslint/prefer-signals": "warn",
    },
  },
  {
    files: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      "max-len": ["error", { code: 200 }],
      "@angular-eslint/template/prefer-control-flow": "error",
      "@angular-eslint/template/no-negated-async": "error",
      "@angular-eslint/template/eqeqeq": "error",
      "@angular-eslint/template/no-any": "error",
      "@angular-eslint/template/button-has-type": "error",
      "@angular-eslint/template/prefer-self-closing-tags": "warn",
      "@angular-eslint/template/use-track-by-function": "warn",
    },
  }
]);


