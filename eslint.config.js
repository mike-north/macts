import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow underscore-prefixed unused variables and parameters
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Allow ++ and -- operators
      'no-plusplus': 'off',
    },
  },
  {
    // Generated CLI command and MCP tool handlers bridge a type-erasure boundary:
    // CLI flags / JSON-Schema inputs arrive as broad primitives and are asserted to
    // the SDK method's exact parameter type (`value as unknown as Parameters<...>[i]`).
    // For parameters whose flag type already matches the SDK type, that assertion is
    // a no-op and trips `no-unnecessary-type-assertion`; but the generator emits a
    // uniform assertion because it cannot resolve per-argument SDK types at generation
    // time, and the assertion is required for the non-matching cases (Date, number,
    // enums, arrays). Disable the rule for these generated files only.
    files: ['**/src/cli/commands/**/*.ts', '**/src/mcp/tools/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  // Prettier must be last to disable formatting rules
  prettierConfig
)
