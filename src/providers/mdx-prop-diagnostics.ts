import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseImports } from '../mdx/imports';
import { getAstroProps } from '../navigation/astro';
import { resolveImport } from '../navigation/import-resolver';
import { getVueProps } from '../navigation/vue';

const DIAGNOSTIC_SOURCE = 'mdx-jump';

export function registerMdxPropDiagnostics(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  context.subscriptions.push(diagnostics);

  const refresh = (document: vscode.TextDocument): void => {
    if (!isMdxDocument(document)) {
      return;
    }
    diagnostics.set(document.uri, getPropDiagnostics(document));
  };

  const clear = (document: vscode.TextDocument): void => {
    diagnostics.delete(document.uri);
  };

  vscode.workspace.textDocuments.forEach(refresh);

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(refresh));
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => refresh(event.document))
  );
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(clear));
}

function getPropDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
  const text = document.getText();
  const imports = parseImports(text);
  const diagnostics: vscode.Diagnostic[] = [];
  const tagRe = /<([A-Z][\w$]*)\b([^<>]*?)\/?>/g;

  for (const match of text.matchAll(tagRe)) {
    const fullTag = match[0];
    const componentName = match[1];
    const attrsChunk = match[2] ?? '';
    const tagStart = match.index ?? -1;
    if (tagStart < 0 || !componentName) {
      continue;
    }

    const importItem = imports.find((it) => it.localName === componentName);
    if (!importItem) {
      continue;
    }

    const resolved = resolveImport(document.uri.fsPath, importItem.source);
    if (!resolved) {
      continue;
    }

    const ext = path.extname(resolved);
    const allowedProps = ext === '.astro' ? getAstroProps(resolved) : ext === '.vue' ? getVueProps(resolved) : null;
    if (!allowedProps || allowedProps.size === 0) {
      continue;
    }

    const attrsStartInTag = fullTag.indexOf(attrsChunk);
    const attrsStartOffset = tagStart + Math.max(attrsStartInTag, 0);
    const attrs = extractAttributes(attrsChunk);
    for (const attr of attrs) {
      const rawName = attr.name;
      const attrIndex = attr.start;

      if (shouldSkipAttr(rawName)) {
        continue;
      }

      const normalized = normalizePropName(rawName);
      if (allowedProps.has(normalized) || allowedProps.has(rawName)) {
        continue;
      }

      const startOffset = attrsStartOffset + attrIndex;
      const range = new vscode.Range(document.positionAt(startOffset), document.positionAt(startOffset + rawName.length));
      diagnostics.push(
        new vscode.Diagnostic(
          range,
          `Property "${rawName}" does not exist on component "${componentName}".`,
          vscode.DiagnosticSeverity.Error
        )
      );
    }
  }

  return diagnostics;
}

function isMdxDocument(document: vscode.TextDocument): boolean {
  if (document.uri.scheme !== 'file') {
    return false;
  }
  return (
    document.languageId === 'mdx' ||
    document.languageId === 'markdown.mdx' ||
    document.uri.fsPath.endsWith('.mdx')
  );
}

function shouldSkipAttr(rawName: string): boolean {
  const builtInPrefixes = ['on:', 'client:', 'set:', 'class:', 'is:', 'transition:'];
  if (builtInPrefixes.some((prefix) => rawName.startsWith(prefix))) {
    return true;
  }

  return (
    rawName === '' ||
    rawName.startsWith('...') ||
    rawName === 'slot' ||
    rawName === 'class' ||
    rawName === 'style'
  );
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
    while (i < attrsChunk.length && isAttrNameChar(attrsChunk[i])) {
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

function isAttrNameChar(ch: string): boolean {
  return /[A-Za-z0-9_$:@-]/.test(ch);
}
