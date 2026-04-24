# MDX Astro Jump

A VS Code extension that adds **Go to Definition** support for Astro/Vue components used in `.mdx` files.

## Features

- In an `.mdx` file, place cursor on component tag like `<Projects />` and run **Go to Definition** (`F12`).
- Resolves default imports such as:
  - Relative paths: `../../components/Projects.vue`
  - Aliased paths: `@/components/...` (tries `<workspace>/src` first, then workspace root)
- Supports target file extensions:
  - `.astro`, `.vue`, `.tsx`, `.ts`, `.jsx`, `.js`
- Adds lightweight import CodeLens: `Open <ComponentName>`.

## Quick Start (Local)

1. Open this folder in VS Code
2. Install deps:

```bash
npm install
```

3. Build:

```bash
npm run build
```

4. Press `F5` to launch Extension Development Host.
5. Open an `.mdx` file in the host window and test on component tags.

## Publish Checklist

1. Replace placeholders in `package.json`:
   - `repository.url`
   - `bugs.url`
   - `homepage`
2. Create a publisher in Visual Studio Marketplace.
3. Create an Azure DevOps PAT with Marketplace publish permission.
4. Login and publish:

```bash
npx @vscode/vsce login <publisher>
npx @vscode/vsce publish
```

You can also package first:

```bash
npx @vscode/vsce package
```

## Notes

- This extension is intentionally lightweight and regex-based.
- It currently focuses on default imports + PascalCase component tags.
- Named imports and tsconfig path mappings can be added in later versions.
