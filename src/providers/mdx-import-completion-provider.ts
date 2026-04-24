import * as path from 'node:path';
import * as vscode from 'vscode';

const COMPONENT_FILE_GLOB = '**/*.{astro,vue,tsx,jsx,ts,js}';
const COMPONENT_EXCLUDE_GLOB = '**/{node_modules,dist,.git}/**';

export const mdxImportCompletionProvider: vscode.CompletionItemProvider = {
  async provideCompletionItems(document, position): Promise<vscode.CompletionItem[]> {
    const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
    if (!isImportContext(linePrefix)) {
      return [];
    }

    const files = await vscode.workspace.findFiles(COMPONENT_FILE_GLOB, COMPONENT_EXCLUDE_GLOB, 2000);
    const itemsByName = new Map<string, { item: vscode.CompletionItem; priority: number }>();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    for (const uri of files) {
      if (uri.fsPath === document.uri.fsPath) {
        continue;
      }

      const componentName = toComponentName(path.basename(uri.fsPath, path.extname(uri.fsPath)));
      if (!componentName) {
        continue;
      }

      const importPath = toImportPath(document.uri.fsPath, uri.fsPath, workspaceFolder);
      const priority = getComponentPriority(uri.fsPath);
      const item = new vscode.CompletionItem(componentName, vscode.CompletionItemKind.Class);
      item.detail = importPath;
      item.insertText = `${componentName} from '${importPath}';`;
      item.filterText = `${componentName} ${importPath}`;
      item.sortText = `${priority.toString().padStart(2, '0')}_${componentName}`;

      const existing = itemsByName.get(componentName);
      if (!existing || priority < existing.priority) {
        itemsByName.set(componentName, { item, priority });
      }
    }

    return Array.from(itemsByName.values()).map((entry) => entry.item);
  },
};

function isImportContext(linePrefix: string): boolean {
  return /^\s*import\s+[\w$-]*$/i.test(linePrefix);
}

function toComponentName(name: string): string {
  const normalized = name
    .replace(/[-_\s]+(.)?/g, (_, ch: string | undefined) => (ch ? ch.toUpperCase() : ''))
    .replace(/^[a-z]/, (m) => m.toUpperCase());

  if (!/^[A-Za-z_$][\w$]*$/.test(normalized)) {
    return '';
  }

  return normalized;
}

function toImportPath(
  fromFile: string,
  targetFile: string,
  workspaceFolder: vscode.WorkspaceFolder | undefined
): string {
  const aliasPath = toAliasImportPath(targetFile, workspaceFolder);
  if (aliasPath) {
    return aliasPath;
  }

  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, targetFile).split(path.sep).join('/');
  rel = rel.replace(/\.(astro|vue|tsx|jsx|ts|js)$/i, '');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
}

function toAliasImportPath(
  targetFile: string,
  workspaceFolder: vscode.WorkspaceFolder | undefined
): string | null {
  if (!workspaceFolder) {
    return null;
  }

  const srcDir = path.join(workspaceFolder.uri.fsPath, 'src');
  const relFromSrc = path.relative(srcDir, targetFile);
  if (relFromSrc.startsWith('..') || path.isAbsolute(relFromSrc)) {
    return null;
  }

  return `@/${relFromSrc.split(path.sep).join('/').replace(/\.(astro|vue|tsx|jsx|ts|js)$/i, '')}`;
}

function getComponentPriority(filePath: string): number {
  const normalized = filePath.split(path.sep).join('/').toLowerCase();
  if (normalized.includes('/src/components/')) {
    return 0;
  }
  if (normalized.includes('/components/')) {
    return 1;
  }
  if (normalized.includes('/src/')) {
    return 2;
  }
  return 3;
}
