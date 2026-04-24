import * as vscode from 'vscode';
import { MDX_SELECTORS } from './mdx-definition-provider';

const tokenTypes = ['keyword', 'variable', 'class', 'string'];
const legend = new vscode.SemanticTokensLegend(tokenTypes);

export const mdxSemanticTokenLegend = legend;

export const mdxSemanticTokensProvider: vscode.DocumentSemanticTokensProvider = {
  provideDocumentSemanticTokens(document): vscode.SemanticTokens {
    const builder = new vscode.SemanticTokensBuilder(legend);
    const fullText = document.getText();

    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;
      if (!text.trim()) {
        continue;
      }

      addImportTokens(builder, line, text);
      addNamedImportTokens(builder, line, text);
      addNamedTypeImportTokens(builder, line, text);
      addNamespaceImportTokens(builder, line, text);
      addExportConstTokens(builder, line, text);
      addReExportTokens(builder, line, text);
      addTypeReExportTokens(builder, line, text);
      addExportAllTokens(builder, line, text);
    }

    addMultilineBraceImportExportTokens(builder, document, fullText);

    return builder.build();
  },
};

export const mdxSemanticSelectors: vscode.DocumentSelector = MDX_SELECTORS;

function addImportTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m || m.index === undefined) {
    return;
  }

  const importWord = 'import';
  const fromWord = 'from';
  const importIdx = text.indexOf(importWord, m.index);
  const localName = m[1];
  const localIdx = text.indexOf(localName, importIdx + importWord.length);
  const fromIdx = text.indexOf(fromWord, localIdx + localName.length);
  const source = m[2];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, importIdx, importWord.length, 'keyword');
  pushToken(builder, line, localIdx, localName.length, 'class');
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addNamedImportTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(/^\s*import\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m || m.index === undefined) {
    return;
  }

  const importWord = 'import';
  const fromWord = 'from';
  const importIdx = text.indexOf(importWord, m.index);
  const specifiersText = m[1];
  const specifiersStart = text.indexOf('{', importIdx + importWord.length) + 1;
  const fromIdx = text.indexOf(fromWord, specifiersStart + specifiersText.length);
  const source = m[2];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, importIdx, importWord.length, 'keyword');
  highlightSpecifiers(builder, line, specifiersText, specifiersStart);
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addNamedTypeImportTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(/^\s*import\s+type\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m || m.index === undefined) {
    return;
  }

  const importWord = 'import';
  const typeWord = 'type';
  const fromWord = 'from';
  const importIdx = text.indexOf(importWord, m.index);
  const typeIdx = text.indexOf(typeWord, importIdx + importWord.length);
  const specifiersText = m[1];
  const specifiersStart = text.indexOf('{', typeIdx + typeWord.length) + 1;
  const fromIdx = text.indexOf(fromWord, specifiersStart + specifiersText.length);
  const source = m[2];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, importIdx, importWord.length, 'keyword');
  pushToken(builder, line, typeIdx, typeWord.length, 'keyword');
  highlightSpecifiers(builder, line, specifiersText, specifiersStart);
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addNamespaceImportTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(
    /^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/
  );
  if (!m || m.index === undefined) {
    return;
  }

  const importWord = 'import';
  const asWord = 'as';
  const fromWord = 'from';
  const importIdx = text.indexOf(importWord, m.index);
  const asIdx = text.indexOf(asWord, importIdx + importWord.length);
  const localName = m[1];
  const localIdx = text.indexOf(localName, asIdx + asWord.length);
  const fromIdx = text.indexOf(fromWord, localIdx + localName.length);
  const source = m[2];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, importIdx, importWord.length, 'keyword');
  pushToken(builder, line, asIdx, asWord.length, 'keyword');
  pushToken(builder, line, localIdx, localName.length, 'class');
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addExportConstTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(
    /^\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/
  );
  if (!m || m.index === undefined) {
    return;
  }

  const exportWord = 'export';
  const constWord = 'const';
  const exportIdx = text.indexOf(exportWord, m.index);
  const constIdx = text.indexOf(constWord, exportIdx + exportWord.length);
  const lhs = m[1];
  const lhsIdx = text.indexOf(lhs, constIdx + constWord.length);
  const rhs = m[2];
  const rhsIdx = text.indexOf(rhs, lhsIdx + lhs.length);

  pushToken(builder, line, exportIdx, exportWord.length, 'keyword');
  pushToken(builder, line, constIdx, constWord.length, 'keyword');
  pushToken(builder, line, lhsIdx, lhs.length, 'variable');
  pushToken(builder, line, rhsIdx, rhs.length, 'class');
}

function addReExportTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(/^\s*export\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m || m.index === undefined) {
    return;
  }

  const exportWord = 'export';
  const fromWord = 'from';
  const exportIdx = text.indexOf(exportWord, m.index);
  const specifiersText = m[1];
  const specifiersStart = text.indexOf('{', exportIdx + exportWord.length) + 1;
  const fromIdx = text.indexOf(fromWord, specifiersStart + specifiersText.length);
  const source = m[2];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, exportIdx, exportWord.length, 'keyword');
  highlightSpecifiers(builder, line, specifiersText, specifiersStart);
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addTypeReExportTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const m = text.match(/^\s*export\s+type\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!m || m.index === undefined) {
    return;
  }

  const exportWord = 'export';
  const typeWord = 'type';
  const fromWord = 'from';
  const exportIdx = text.indexOf(exportWord, m.index);
  const typeIdx = text.indexOf(typeWord, exportIdx + exportWord.length);
  const specifiersText = m[1];
  const specifiersStart = text.indexOf('{', typeIdx + typeWord.length) + 1;
  const fromIdx = text.indexOf(fromWord, specifiersStart + specifiersText.length);
  const source = m[2];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, exportIdx, exportWord.length, 'keyword');
  pushToken(builder, line, typeIdx, typeWord.length, 'keyword');
  highlightSpecifiers(builder, line, specifiersText, specifiersStart);
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addExportAllTokens(builder: vscode.SemanticTokensBuilder, line: number, text: string): void {
  const namespaceMatch = text.match(
    /^\s*export\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/
  );
  if (namespaceMatch && namespaceMatch.index !== undefined) {
    const exportWord = 'export';
    const asWord = 'as';
    const fromWord = 'from';
    const exportIdx = text.indexOf(exportWord, namespaceMatch.index);
    const asIdx = text.indexOf(asWord, exportIdx + exportWord.length);
    const localName = namespaceMatch[1];
    const localIdx = text.indexOf(localName, asIdx + asWord.length);
    const fromIdx = text.indexOf(fromWord, localIdx + localName.length);
    const source = namespaceMatch[2];
    const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

    pushToken(builder, line, exportIdx, exportWord.length, 'keyword');
    pushToken(builder, line, asIdx, asWord.length, 'keyword');
    pushToken(builder, line, localIdx, localName.length, 'class');
    pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
    pushToken(builder, line, sourceIdx, source.length, 'string');
    return;
  }

  const allMatch = text.match(/^\s*export\s+\*\s+from\s+(['"][^'"]+['"])\s*;?\s*$/);
  if (!allMatch || allMatch.index === undefined) {
    return;
  }

  const exportWord = 'export';
  const fromWord = 'from';
  const exportIdx = text.indexOf(exportWord, allMatch.index);
  const fromIdx = text.indexOf(fromWord, exportIdx + exportWord.length);
  const source = allMatch[1];
  const sourceIdx = text.indexOf(source, fromIdx + fromWord.length);

  pushToken(builder, line, exportIdx, exportWord.length, 'keyword');
  pushToken(builder, line, fromIdx, fromWord.length, 'keyword');
  pushToken(builder, line, sourceIdx, source.length, 'string');
}

function addMultilineBraceImportExportTokens(
  builder: vscode.SemanticTokensBuilder,
  document: vscode.TextDocument,
  text: string
): void {
  const statements = [
    {
      re: /import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+(['"][^'"]+['"])\s*;?/gm,
      firstKeyword: 'import',
      hasTypeGroup: true,
    },
    {
      re: /export\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+(['"][^'"]+['"])\s*;?/gm,
      firstKeyword: 'export',
      hasTypeGroup: true,
    },
  ];

  for (const stmt of statements) {
    for (const match of text.matchAll(stmt.re)) {
      const full = match[0];
      const matchIndex = match.index ?? -1;
      if (matchIndex < 0 || !full.includes('\n')) {
        continue;
      }

      const firstKeywordIdx = text.indexOf(stmt.firstKeyword, matchIndex);
      pushTokenAtOffset(builder, document, firstKeywordIdx, stmt.firstKeyword.length, 'keyword');

      const typeChunk = stmt.hasTypeGroup ? match[1] ?? '' : '';
      if (typeChunk) {
        const typeStart = firstKeywordIdx + stmt.firstKeyword.length + 1;
        pushTokenAtOffset(builder, document, typeStart, 4, 'keyword');
      }

      const specifiersBody = match[2] ?? '';
      const openBraceOffset = text.indexOf('{', firstKeywordIdx);
      if (openBraceOffset >= 0) {
        highlightSpecifiersByOffset(builder, document, specifiersBody, openBraceOffset + 1);
      }

      const fromIdx = text.indexOf('from', openBraceOffset + 1 + specifiersBody.length);
      pushTokenAtOffset(builder, document, fromIdx, 4, 'keyword');

      const source = match[3] ?? '';
      const sourceIdx = text.indexOf(source, fromIdx + 4);
      pushTokenAtOffset(builder, document, sourceIdx, source.length, 'string');
    }
  }
}

function highlightSpecifiers(
  builder: vscode.SemanticTokensBuilder,
  line: number,
  specifiersText: string,
  specifiersStart: number
): void {
  const parts = specifiersText.split(',');
  let searchFrom = 0;

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) {
      searchFrom += rawPart.length + 1;
      continue;
    }

    const partOffsetInSpecifiers = specifiersText.indexOf(part, searchFrom);
    if (partOffsetInSpecifiers < 0) {
      searchFrom += rawPart.length + 1;
      continue;
    }

    const asMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (asMatch) {
      const imported = asMatch[1];
      const local = asMatch[2];
      const importedStart = specifiersStart + partOffsetInSpecifiers;
      const asStart = importedStart + imported.length + 1;
      const localStart = asStart + 3;

      pushToken(builder, line, importedStart, imported.length, 'class');
      pushToken(builder, line, asStart, 2, 'keyword');
      pushToken(builder, line, localStart, local.length, 'variable');
    } else {
      const start = specifiersStart + partOffsetInSpecifiers;
      pushToken(builder, line, start, part.length, 'class');
    }

    searchFrom = partOffsetInSpecifiers + part.length + 1;
  }
}

function highlightSpecifiersByOffset(
  builder: vscode.SemanticTokensBuilder,
  document: vscode.TextDocument,
  specifiersText: string,
  specifiersStartOffset: number
): void {
  const re = /([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/g;
  for (const m of specifiersText.matchAll(re)) {
    const imported = m[1];
    const importedIdxInBody = m.index ?? -1;
    if (importedIdxInBody < 0) {
      continue;
    }

    const importedStart = specifiersStartOffset + importedIdxInBody;
    pushTokenAtOffset(builder, document, importedStart, imported.length, 'class');

    const local = m[2];
    if (local) {
      const asStart = importedStart + imported.length + 1;
      pushTokenAtOffset(builder, document, asStart, 2, 'keyword');
      const localStart = asStart + 3;
      pushTokenAtOffset(builder, document, localStart, local.length, 'variable');
    }
  }
}

function pushToken(
  builder: vscode.SemanticTokensBuilder,
  line: number,
  start: number,
  length: number,
  type: string
): void {
  if (start >= 0 && length > 0) {
    builder.push(line, start, length, legend.tokenTypes.indexOf(type), 0);
  }
}

function pushTokenAtOffset(
  builder: vscode.SemanticTokensBuilder,
  document: vscode.TextDocument,
  offset: number,
  length: number,
  type: string
): void {
  if (offset < 0 || length <= 0) {
    return;
  }
  const pos = document.positionAt(offset);
  builder.push(pos.line, pos.character, length, legend.tokenTypes.indexOf(type), 0);
}
