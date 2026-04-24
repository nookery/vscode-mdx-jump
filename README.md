# MDX Jump

A VS Code extension that adds **Go to Definition** support for Astro/Vue components used in `.mdx` files.

## Features

- In an `.mdx` file, place cursor on component tag like `<Projects />` and run **Go to Definition** (`F12`).
- In an `.mdx` file, type `import ` and get component import completion suggestions. Selecting one inserts `import ComponentName from '...';`.
  - Prioritizes components under `src/components` and `components`.
  - Uses `@/` import paths when target file is under `<workspace>/src`.
- In an `.mdx` component tag, typing a prop prefix (for example `<Projects a`) suggests matching props from imported `.astro` / `.vue` component definitions.
  - Already-used props in the same tag are filtered out from suggestions.
  - Completion details show prop type when it can be inferred from component definitions.
- In an `.mdx` file, top-level ESM lines get semantic highlighting for common patterns:
  - `import Component from 'path'`
  - `import { A, B as C } from 'path'`
  - `import type { A, B as C } from 'path'`
  - `import * as NS from 'path'`
  - `export const X = Y`
  - `export { A, B as C } from 'path'`
  - `export type { A, B as C } from 'path'`
  - `export * from 'path'`
  - `export * as NS from 'path'`
  - Multiline brace forms, e.g. `import { A, \n B } from 'path'`
- In an `.mdx` file, place cursor on Astro component props like `<Projects title="x" />` and run **Go to Definition** (`F12`) to jump to the `Props` declaration in the `.astro` file.
- In an `.mdx` file, using a non-existent prop on imported Astro/Vue components shows a diagnostic error.
- Resolves default imports such as:
  - Relative paths: `../../components/Projects.vue`
  - Aliased paths: `@/components/...` (tries `<workspace>/src` first, then workspace root)
- Supports target file extensions:
  - `.astro`, `.vue`, `.tsx`, `.ts`, `.jsx`, `.js`
- For `.astro` files, prop definition jump supports:
  - `interface Props { ... }`
  - `type Props = { ... }`
- For `.vue` files, prop definition jump supports:
  - `defineProps<{ ... }>()`
  - `defineProps({ ... })`
  - `props: { ... }` (Options API)

## Quick Start (Local)

1. Open this folder in VS Code
2. Install deps:

```bash
pnpm install
```

3. Build:

```bash
pnpm run build
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
4. Add repository secret in GitHub: `VSCE_PAT`.
5. Push to `main` to trigger auto publish (workflow will auto bump patch version).

Manual publish (optional):

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
