import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseImports } from '../mdx/imports';
import { getOpeningTagContext } from '../mdx/tag-context';
import { getAstroPropInfos } from '../navigation/astro';
import { resolveImport } from '../navigation/import-resolver';
import { getVuePropInfos } from '../navigation/vue';
import { MDX_SELECTORS } from './mdx-definition-provider';

export function registerMdxHover(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerHoverProvider(MDX_SELECTORS, {
    provideHover(document, position): vscode.ProviderResult<vscode.Hover> {
      const text = document.getText();
      const offset = document.offsetAt(position);
      const tagContext = getOpeningTagContext(text, offset);

      if (!tagContext) {
        return null;
      }

      const imports = parseImports(text);
      const imp = imports.find((it) => it.localName === tagContext.componentName);

      if (!imp) {
        return null;
      }

      const resolved = resolveImport(document.uri.fsPath, imp.source);
      if (!resolved) {
        return null;
      }

      const markdown = buildHoverContent(resolved, imp.source, tagContext.componentName!);
      return new vscode.Hover(markdown);
    },
  });

  context.subscriptions.push(provider);
}

function buildHoverContent(
  resolvedPath: string,
  importSource: string,
  componentName: string
): vscode.MarkdownString {
  const ext = path.extname(resolvedPath);
  const relative = tryRelativePath(resolvedPath);
  const content = new vscode.MarkdownString();
  content.isTrusted = true;

  // 组件标题
  content.appendMarkdown(`**\`${componentName}\`**\n\n`);
  content.appendMarkdown(`\`import ${componentName} from '${importSource}'\`\n\n`);
  content.appendMarkdown(`📁 \`${relative}\``);

  // Props 信息
  const props = getComponentProps(resolvedPath, ext);
  if (props.size > 0) {
    content.appendMarkdown('\n\n---\n\n');
    content.appendMarkdown('**Props:**\n\n');

    for (const [name, type] of props) {
      if (type) {
        content.appendMarkdown(`- \`${name}\`: \`${type}\`\n`);
      } else {
        content.appendMarkdown(`- \`${name}\`\n`);
      }
    }
  }

  return content;
}

function getComponentProps(filePath: string, ext: string): Map<string, string | undefined> {
  if (ext === '.astro') {
    return getAstroPropInfos(filePath);
  }

  if (ext === '.vue') {
    return getVuePropInfos(filePath);
  }

  return new Map<string, string | undefined>();
}

function tryRelativePath(absolutePath: string): string {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspace && absolutePath.startsWith(workspace)) {
    return path.posix.join('.', path.relative(workspace, absolutePath));
  }
  return absolutePath;
}
