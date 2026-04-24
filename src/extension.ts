import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

type ImportItem = {
  localName: string;
  source: string;
  importLine: number;
};

const IMPORT_LINE_RE = /^\s*import\s+([\w$]+)\s+from\s+['\"]([^'\"]+)['\"];?/gm;

const MDX_SELECTORS: vscode.DocumentSelector = [
  { language: 'mdx', scheme: 'file' },
  { language: 'markdown', scheme: 'file', pattern: '**/*.mdx' },
  { language: 'markdown.mdx', scheme: 'file' },
];

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerDefinitionProvider(MDX_SELECTORS, {
    provideDefinition(document, position): vscode.ProviderResult<vscode.Definition> {
      const range = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);
      if (!range) {
        return null;
      }

      const symbol = document.getText(range);
      if (!/^[A-Z]/.test(symbol)) {
        return null;
      }

      const imports = parseImports(document.getText());
      const item = imports.find((it) => it.localName === symbol);
      if (!item) {
        return null;
      }

      const resolved = resolveImport(document.uri.fsPath, item.source);
      if (!resolved) {
        return null;
      }

      return new vscode.Location(vscode.Uri.file(resolved), new vscode.Position(0, 0));
    },
  });

  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    MDX_SELECTORS,
    new MdxImportCodeLensProvider()
  );

  context.subscriptions.push(provider, codeLensProvider);
}

export function deactivate(): void {}

function parseImports(text: string): ImportItem[] {
  const items: ImportItem[] = [];
  for (const match of text.matchAll(IMPORT_LINE_RE)) {
    const localName = match[1];
    const source = match[2];
    const importLine = text.slice(0, match.index).split('\n').length - 1;

    if (!localName || !source) {
      continue;
    }

    items.push({ localName, source, importLine });
  }
  return items;
}

function resolveImport(mdxFilePath: string, importPath: string): string | null {
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

class MdxImportCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    const text = document.getText();
    const imports = parseImports(text);
    if (imports.length === 0) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];
    for (const item of imports) {
      if (!/^[A-Z]/.test(item.localName)) {
        continue;
      }

      const target = resolveImport(document.uri.fsPath, item.source);
      if (!target) {
        continue;
      }

      const range = new vscode.Range(item.importLine, 0, item.importLine, 0);
      lenses.push(
        new vscode.CodeLens(range, {
          title: `Open ${item.localName}`,
          command: 'vscode.open',
          arguments: [vscode.Uri.file(target)],
        })
      );
    }

    return lenses;
  }
}
