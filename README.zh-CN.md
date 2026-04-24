# MDX Jump

一个 VS Code 扩展，为 `.mdx` 文件中使用的 Astro/Vue 组件添加**转到定义**支持。

## 功能特性

- 在 `.mdx` 文件中，将光标放在组件标签（如 `<Projects />`）上，运行**转到定义**（`F12`）即可跳转到组件定义文件。
- 在 `.mdx` 文件中，输入 `import ` 后可获得组件导入补全建议。选择后会插入 `import ComponentName from '...';`。
  - 优先搜索 `src/components` 和 `components` 目录下的组件。
  - 当目标文件位于 `<workspace>/src` 下时，使用 `@/` 导入路径。
- 在 `.mdx` 文件中，顶层 ESM 语句可获得以下常见模式的语义高亮：
  - `import Component from 'path'`
  - `import { A, B as C } from 'path'`
  - `import type { A, B as C } from 'path'`
  - `import * as NS from 'path'`
  - `export const X = Y`
  - `export { A, B as C } from 'path'`
  - `export type { A, B as C } from 'path'`
  - `export * from 'path'`
  - `export * as NS from 'path'`
- 在 `.mdx` 文件中，将光标放在 Astro 组件属性上（如 `<Projects title="x" />`），运行**转到定义**（`F12`）可跳转到 `.astro` 文件中的 `Props` 声明。
- 支持解析以下类型的默认导入：
  - 相对路径：`../../components/Projects.vue`
  - 别名路径：`@/components/...`（优先尝试 `<workspace>/src`，其次为工作区根目录）
- 支持的目标文件扩展名：
  - `.astro`、`.vue`、`.tsx`、`.ts`、`.jsx`、`.js`
- 对于 `.astro` 文件，属性定义跳转支持：
  - `interface Props { ... }`
  - `type Props = { ... }`
- 对于 `.vue` 文件，属性定义跳转支持：
  - `defineProps<{ ... }>()`
  - `defineProps({ ... })`
  - `props: { ... }`（Options API）

## 快速开始（本地开发）

1. 在 VS Code 中打开此项目文件夹
2. 安装依赖：

```bash
pnpm install
```

3. 构建：

```bash
pnpm run build
```

4. 按 `F5` 启动扩展开发主机窗口。
5. 在主机窗口中打开 `.mdx` 文件，测试组件标签的跳转功能。

## 发布清单

1. 替换 `package.json` 中的占位符：
   - `repository.url`
   - `bugs.url`
   - `homepage`
2. 在 Visual Studio Marketplace 中创建一个发布者（publisher）。
3. 在 Azure DevOps 中创建具有 Marketplace 发布权限的个人访问令牌（PAT）。
4. 在 GitHub 仓库的 Secrets 中添加：`VSCE_PAT`。
5. 推送到 `main` 分支触发自动发布（工作流会自动递增补丁版本号）。

手动发布（可选）：

```bash
npx @vscode/vsce login <publisher>
npx @vscode/vsce publish
```

也可以先打包：

```bash
npx @vscode/vsce package
```

## 注意事项

- 本扩展采用轻量级设计，基于正则表达式实现。
- 当前版本主要专注于默认导入 + PascalCase 组件标签。
- 命名导入和 tsconfig 路径映射等功能可在后续版本中添加。
