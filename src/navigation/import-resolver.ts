import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export function resolveImport(mdxFilePath: string, importPath: string): string | null {
  const mdxDir = path.dirname(mdxFilePath);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(mdxFilePath));

  if (importPath.startsWith('.')) {
    return resolveCandidate(path.resolve(mdxDir, importPath));
  }

  if (importPath.startsWith('@/') && workspaceFolder) {
    const fromSrc = path.resolve(workspaceFolder.uri.fsPath, 'src', importPath.slice(2));
    const resolvedFromSrc = resolveCandidate(fromSrc);
    if (resolvedFromSrc) {
      return resolvedFromSrc;
    }

    const fromRoot = path.resolve(workspaceFolder.uri.fsPath, importPath.slice(2));
    const resolvedFromRoot = resolveCandidate(fromRoot);
    if (resolvedFromRoot) {
      return resolvedFromRoot;
    }
  }

  return null;
}

function resolveCandidate(basePathNoExt: string): string | null {
  const candidates = [
    basePathNoExt,
    `${basePathNoExt}.astro`,
    `${basePathNoExt}.vue`,
    `${basePathNoExt}.tsx`,
    `${basePathNoExt}.ts`,
    `${basePathNoExt}.jsx`,
    `${basePathNoExt}.js`,
    path.join(basePathNoExt, 'index.astro'),
    path.join(basePathNoExt, 'index.vue'),
    path.join(basePathNoExt, 'index.tsx'),
    path.join(basePathNoExt, 'index.ts'),
    path.join(basePathNoExt, 'index.jsx'),
    path.join(basePathNoExt, 'index.js'),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}
