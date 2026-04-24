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
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$:@.-]*/);
      if (!wordRange) return null;

      const rawWord = document.getText(wordRange);
      // 清理 Vue/Astro 指令前缀或赋值符号，提取纯属性名
      const propName = rawWord.replace(/^[@:]/, '').split('=')[0].split(' ')[0];
      const tagContext = getOpeningTagContext(text, offset);

      // 1. 处理组件名 Hover (import 语句或 <Component />)
      if (/^[A-Z]/.test(rawWord)) {
        const imp = parseImports(text).find((it) => it.localName === rawWord);
        if (imp) {
          const resolved = resolveImport(document.uri.fsPath, imp.source);
          if (resolved) {
            return new vscode.Hover(
              buildComponentHover(resolved, imp.source, rawWord, tagContext?.componentName === rawWord)
            );
          }
        }
      }

      // 2. 处理组件属性 Hover
      if (tagContext?.isInAttributes && tagContext.componentName) {
        const imp = parseImports(text).find((it) => it.localName === tagContext.componentName);
        if (imp) {
          const resolved = resolveImport(document.uri.fsPath, imp.source);
          if (resolved) {
            const ext = path.extname(resolved);
            const props =
              ext === '.astro'
                ? getAstroPropInfos(resolved)
                : ext === '.vue'
                ? getVuePropInfos(resolved)
                : new Map<string, string | undefined>();

            const propType = props.get(propName);
            if (propType !== undefined) {
              return new vscode.Hover(buildPropHover(propName, propType, tagContext.componentName));
            }
          }
        }
      }

      return null;
    },
  });

  context.subscriptions.push(provider);
}

function buildComponentHover(
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

function buildPropHover(propName: string, propType: string | undefined, componentName: string): vscode.MarkdownString {
  const content = new vscode.MarkdownString();
  content.isTrusted = true;

  content.appendMarkdown(`**\`${propName}\`**`);
  if (propType) {
    content.appendMarkdown(`: \`${propType}\``);
  }
  content.appendMarkdown(`\n\n_来自组件 \`${componentName}\`_`);
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
