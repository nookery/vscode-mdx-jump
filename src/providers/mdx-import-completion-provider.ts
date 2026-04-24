import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseImports } from '../mdx/imports';
import { getOpeningTagContext } from '../mdx/tag-context';
import { getAstroPropInfos } from '../navigation/astro';
import { resolveImport } from '../navigation/import-resolver';
import { getVuePropInfos } from '../navigation/vue';

const COMPONENT_FILE_GLOB = '**/*.{astro,vue,tsx,jsx,ts,js}';
const COMPONENT_EXCLUDE_GLOB = '**/{node_modules,dist,.git}/**';

export const mdxImportCompletionProvider: vscode.CompletionItemProvider = {
  async provideCompletionItems(document, position): Promise<vscode.CompletionItem[]> {
    const propItems = getPropCompletionItems(document, position);
    if (propItems.length > 0) {
      return propItems;
    }

    const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
    const text = document.getText();
    const offset = document.offsetAt(position);
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);
    const typedWord = wordRange ? document.getText(wordRange) : '';
    const isInTag = getOpeningTagContext(text, offset)?.componentName;
    const isInImport = isImportContext(linePrefix);

    // 支持两种场景：
    // 1. import 语句补全（原有逻辑）
    // 2. 组件标签/任意位置补全（新增自动导入）
    if (!isInImport && !isInTag && !/^[A-Z]/.test(typedWord)) {
      return [];
    }

    const files = await vscode.workspace.findFiles(COMPONENT_FILE_GLOB, COMPONENT_EXCLUDE_GLOB, 2000);
    const itemsByName = new Map<string, { item: vscode.CompletionItem; priority: number }>();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const existingImports = parseImports(text);

    for (const uri of files) {
      if (uri.fsPath === document.uri.fsPath) {
        continue;
      }

      const componentName = toComponentName(path.basename(uri.fsPath, path.extname(uri.fsPath)));
      if (!componentName) {
        continue;
      }

      // 过滤已导入的组件
      if (existingImports.some((imp) => imp.localName === componentName)) {
        continue;
      }

      const importPath = toImportPath(document.uri.fsPath, uri.fsPath, workspaceFolder);
      const priority = getComponentPriority(uri.fsPath);

      // 根据场景决定触发字符和插入文本
      const isAutoImport = !isInImport;
      const insertText = isAutoImport
        ? componentName // 只插入组件名，import 语句用 additionalTextEdits 添加
        : `${componentName} from '${importPath}';`;

      const item = new vscode.CompletionItem(componentName, vscode.CompletionItemKind.Class);
      item.detail = importPath;
      item.insertText = insertText;
      item.filterText = `${componentName} ${importPath}`;
      item.sortText = `${priority.toString().padStart(2, '0')}_${componentName}`;

      // 自动导入场景：添加 import 语句到文件顶部
      if (isAutoImport) {
        const importEdit = calculateImportEdit(document, componentName, importPath);
        item.additionalTextEdits = [importEdit];
      }

      const existing = itemsByName.get(componentName);
      if (!existing || priority < existing.priority) {
        itemsByName.set(componentName, { item, priority });
      }
    }

    return Array.from(itemsByName.values()).map((entry) => entry.item);
  },
};

/**
 * 计算 import 语句的编辑位置，插入到现有 import 块的末尾
 */
function calculateImportEdit(
  document: vscode.TextDocument,
  componentName: string,
  importPath: string
): vscode.TextEdit {
  const text = document.getText();
  const importLine = `import ${componentName} from '${importPath}';\n`;

  // 查找最后一个 import 语句的位置
  const importRe = /^\s*import\s+/gm;
  let lastImportEnd = 0;
  for (const match of text.matchAll(importRe)) {
    lastImportEnd = document.positionAt(match.index ?? 0).line;
  }

  if (lastImportEnd > 0) {
    // 插入到最后一个 import 之后
    const insertLine = lastImportEnd + 1;
    return vscode.TextEdit.insert(new vscode.Position(insertLine, 0), importLine);
  }

  // 没有 import 语句，插入到 frontmatter 之后或文件开头
  const frontmatterMatch = text.match(/^---\n[\s\S]*?\n---\n?/);
  if (frontmatterMatch) {
    const frontmatterEnd = frontmatterMatch[0].split('\n').length - 1;
    return vscode.TextEdit.insert(new vscode.Position(frontmatterEnd, 0), importLine);
  }

  // 插入到文件开头
  return vscode.TextEdit.insert(new vscode.Position(0, 0), importLine);
}

function getPropCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.CompletionItem[] {
  const fullText = document.getText();
  const offset = document.offsetAt(position);
  const context = getTagAttrCompletionContext(fullText, offset);
  if (!context || context.attrPrefix.length === 0) {
    return [];
  }

  const imports = parseImports(fullText);
  const imported = imports.find((it) => it.localName === context.componentName);
  if (!imported) {
    return [];
  }

  const resolved = resolveImport(document.uri.fsPath, imported.source);
  if (!resolved) {
    return [];
  }

  const ext = path.extname(resolved);
  const propInfo =
    ext === '.astro' ? getAstroPropInfos(resolved) : ext === '.vue' ? getVuePropInfos(resolved) : null;
  if (!propInfo || propInfo.size === 0) {
    return [];
  }

  const prefixLower = context.attrPrefix.toLowerCase();
  const replaceRange = new vscode.Range(
    document.positionAt(context.attrStartOffset),
    document.positionAt(offset)
  );

  const items: vscode.CompletionItem[] = [];
  const seen = new Set<string>();
  for (const [prop, propType] of propInfo.entries()) {
    const variants = [prop, toKebabCase(prop)];
    for (const variant of variants) {
      if (!variant || seen.has(variant)) {
        continue;
      }
      if (context.usedAttrs.has(variant) || context.usedAttrs.has(prop)) {
        continue;
      }
      if (!variant.toLowerCase().startsWith(prefixLower)) {
        continue;
      }
      seen.add(variant);

      const item = new vscode.CompletionItem(variant, vscode.CompletionItemKind.Property);
      item.range = replaceRange;
      item.insertText = variant;
      item.detail = propType
        ? `${context.componentName} prop: ${propType}`
        : `${context.componentName} prop`;
      item.sortText = `0_${variant}`;
      items.push(item);
    }
  }

  return items;
}

function getTagAttrCompletionContext(
  text: string,
  cursorOffset: number
): { componentName: string; attrPrefix: string; attrStartOffset: number; usedAttrs: Set<string> } | null {
  const tagStart = text.lastIndexOf('<', cursorOffset);
  if (tagStart < 0) {
    return null;
  }
  if (text[tagStart + 1] === '/') {
    return null;
  }

  const tagEnd = text.indexOf('>', tagStart);
  if (tagEnd >= 0 && cursorOffset > tagEnd) {
    return null;
  }

  const insideToCursor = text.slice(tagStart + 1, cursorOffset);
  const componentMatch = insideToCursor.match(/^\s*([A-Z][\w$]*)\b/);
  if (!componentMatch) {
    return null;
  }
  const componentName = componentMatch[1];
  const componentEndInInside = (componentMatch.index ?? 0) + componentMatch[0].length;
  const afterComponent = insideToCursor.slice(componentEndInInside);
  if (!afterComponent) {
    return null;
  }

  let braceDepth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < afterComponent.length; i++) {
    const ch = afterComponent[i];
    if (quote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      braceDepth++;
      continue;
    }
    if (ch === '}' && braceDepth > 0) {
      braceDepth--;
    }
  }
  if (braceDepth > 0 || quote) {
    return null;
  }

  if (/[=:]\s*[^\s]*$/.test(afterComponent)) {
    return null;
  }

  const prefixMatch = afterComponent.match(/(?:^|\s)([:@]?[\w-]*)$/);
  if (!prefixMatch) {
    return null;
  }
  const attrPrefix = prefixMatch[1] ?? '';
  if (!attrPrefix) {
    return null;
  }

  const attrStartOffset = cursorOffset - attrPrefix.length;
  const insideTag = text.slice(tagStart + 1, tagEnd >= 0 ? tagEnd : cursorOffset);
  const attrsStart = insideTag.indexOf(componentName) + componentName.length;
  const attrsChunk = attrsStart >= 0 ? insideTag.slice(attrsStart) : '';
  const currentAttrStartInTag = attrStartOffset - tagStart - 1;
  const usedAttrs = new Set<string>();
  for (const attr of extractAttributes(attrsChunk)) {
    const absoluteStartInTag = attrsStart + attr.start;
    if (absoluteStartInTag === currentAttrStartInTag) {
      continue;
    }
    usedAttrs.add(attr.name);
    usedAttrs.add(normalizePropName(attr.name));
  }

  return { componentName, attrPrefix, attrStartOffset, usedAttrs };
}

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

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (m, idx) => (idx === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));
}

function normalizePropName(rawName: string): string {
  const withoutPrefix = rawName.startsWith(':') || rawName.startsWith('@') ? rawName.slice(1) : rawName;
  return withoutPrefix.replace(/-([a-zA-Z])/g, (_, c: string) => c.toUpperCase());
}

type AttributeEntry = {
  name: string;
  start: number;
};

function extractAttributes(attrsChunk: string): AttributeEntry[] {
  const attrs: AttributeEntry[] = [];
  let i = 0;
  while (i < attrsChunk.length) {
    i = skipSpaces(attrsChunk, i);
    if (i >= attrsChunk.length) {
      break;
    }
    const ch = attrsChunk[i];
    if (ch === '{') {
      i = skipBraceExpression(attrsChunk, i);
      continue;
    }
    if (ch === '/' || ch === '>') {
      break;
    }
    const nameStart = i;
    while (i < attrsChunk.length && /[A-Za-z0-9_$:@-]/.test(attrsChunk[i])) {
      i++;
    }
    if (i === nameStart) {
      i++;
      continue;
    }
    const name = attrsChunk.slice(nameStart, i);
    attrs.push({ name, start: nameStart });
    i = skipSpaces(attrsChunk, i);
    if (attrsChunk[i] !== '=') {
      continue;
    }
    i++;
    i = skipSpaces(attrsChunk, i);
    i = skipAttributeValue(attrsChunk, i);
  }
  return attrs;
}

function skipAttributeValue(text: string, start: number): number {
  if (start >= text.length) {
    return start;
  }
  const ch = text[start];
  if (ch === '"' || ch === "'") {
    return skipQuoted(text, start, ch);
  }
  if (ch === '{') {
    return skipBraceExpression(text, start);
  }
  let i = start;
  while (i < text.length && !/\s/.test(text[i]) && text[i] !== '>') {
    i++;
  }
  return i;
}

function skipQuoted(text: string, start: number, quote: '"' | "'"): number {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === quote) {
      return i + 1;
    }
    i++;
  }
  return i;
}

function skipBraceExpression(text: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipQuoted(text, i, ch) - 1;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth <= 0) {
        return i + 1;
      }
    }
    i++;
  }
  return i;
}

function skipSpaces(text: string, start: number): number {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  return i;
}
