# MDX Astro Jump

A minimal VS Code extension that adds **Go to Definition** support for Astro/Vue components used in `.mdx` files.

## Features

- In an `.mdx` file, put cursor on component tag like `<Projects />` and run **Go to Definition**.
- Resolves imports like:
  - Relative paths: `../../components/Projects.vue`
  - Aliased paths: `@/components/...` (tries `<workspace>/src` first, then workspace root)
- Supports target files with extensions:
  - `.astro`, `.vue`, `.tsx`, `.ts`, `.jsx`, `.js`
- Adds simple CodeLens on component imports: `Open <ComponentName>`.

## How to run locally

1. Open this folder in VS Code.
2. Install deps:
   ```bash
   npm install
   ```
3. Build extension:
   ```bash
   npm run build
   ```
4. Press `F5` to launch Extension Development Host.
5. Open an `.mdx` file and test on component tags.

## Notes

- This extension is intentionally lightweight and regex-based.
- It focuses on default imports and PascalCase component tags.
- If you need named imports / tsconfig path aliases / robust MDX AST parsing, we can extend it next.
