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

      // 获取光标处的单词
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);
      if (!wordRange) return null;

      const word = document.getText(wordRange);
      // 仅处理首字母大写的组件名
      if (!/^[A-Z]/.test(word)) return null;

      // 匹配导入的组件
      const imports = parseImports(text);
      const imp = imports.find((it) => it.localName === word);
      if (!imp) return null;

      // 解析文件路径
      const resolved = resolveImport(document.uri.fsPath, imp.source);
      if (!resolved) return null;

      // 判断是否在组件标签内，以便决定是否显示 Props
      const tagContext = getOpeningTagContext(text, offset);
      const isInTag = tagContext?.componentName === word;

      const markdown = buildHoverContent(resolved, imp.source, word, isInTag);
      return new vscode.Hover(markdown);
    },
  });

  context.subscriptions.push(provider);
}

function buildHoverContent(
  resolvedPath: string,
  importSource: string,
  componentName: string,
  showProps: boolean
): vscode.MarkdownString {
  const ext = path.extname(resolvedPath);
  const relative = tryRelativePath(resolvedPath);
  const content = new vscode.MarkdownString();
  content.isTrusted = true;

  content.appendMarkdown(`**\`${componentName}\`**\n\n`);
  content.appendMarkdown(`\`import ${componentName} from '${importSource}'\`\n\n`);
  content.appendMarkdown(`📁 \`${relative}\``);

  if (showProps) {
    const props = getComponentProps(resolvedPath, ext);
    if (props.size > 0) {
      content.appendMarkdown('\n\n---\n\n');
      content.appendMarkdown('**Props:**\n\n');
      for (const [name, type] of props) {
        content.appendMarkdown(type ? `- \`${name}\`: \`${type}\`\n` : `- \`${name}\`\n`);
      }
    }
  }

  return content;
}

function getComponentProps(filePath: string, ext: string): Map<string, string | undefined> {
  if (ext === '.astro') return getAstroPropInfos(filePath);
  if (ext === '.vue') return getVuePropInfos(filePath);
  return new Map<string, string | undefined>();
}

function tryRelativePath(absolutePath: string): string {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspace && absolutePath.startsWith(workspace)) {
    return path.posix.join('.', path.relative(workspace, absolutePath));
  }
  return absolutePath;
}
