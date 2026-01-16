import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";

export default defineConfig([
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/**/*.*"],
  },
  {
    files: ["src/**/*.ts"],
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    extends: [eslintPluginPrettierRecommended],
    languageOptions: {
      sourceType: "module",
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      "prettier/prettier": [
        "error",
        {
          printWidth: 80,
          singleQuote: true,
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "class",
          format: ["PascalCase"],
          leadingUnderscore: "allow",
        },
      ],
      "no-extra-semi": "warn",
      curly: "warn",
      eqeqeq: "error",
      "constructor-super": "warn",
      "prefer-const": [
        "warn",
        {
          destructuring: "all",
        },
      ],
      "no-buffer-constructor": "warn",
      "no-caller": "warn",
      "no-case-declarations": "warn",
      "no-debugger": "warn",
      "no-duplicate-case": "warn",
      "no-duplicate-imports": "warn",
      "no-eval": "warn",
      "no-async-promise-executor": "warn",
      "no-new-wrappers": "warn",
      "no-redeclare": "off",
      "no-sparse-arrays": "warn",
      "no-throw-literal": "warn",
      "no-unsafe-finally": "warn",
      "no-unused-labels": "warn",
      "no-restricted-globals": [
        "warn",
        "name",
        "length",
        "event",
        "closed",
        "external",
        "status",
        "origin",
        "orientation",
        "context",
      ],
      "no-var": "warn",
    },
  },
]);
