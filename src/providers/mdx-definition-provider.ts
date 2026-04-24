import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseImports } from '../mdx/imports';
import { getOpeningTagContext } from '../mdx/tag-context';
import { findAstroPropDefinition } from '../navigation/astro';
import { resolveImport } from '../navigation/import-resolver';
import { findVuePropDefinition } from '../navigation/vue';

export const MDX_SELECTORS: vscode.DocumentSelector = [
  { language: 'mdx', scheme: 'file' },
  { language: 'markdown', scheme: 'file', pattern: '**/*.mdx' },
  { language: 'markdown.mdx', scheme: 'file' },
];

export const mdxDefinitionProvider: vscode.DefinitionProvider = {
  provideDefinition(document, position): vscode.ProviderResult<vscode.Definition> {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);
    if (!range) {
      return null;
    }

    const text = document.getText();
    const symbol = document.getText(range);
    const imports = parseImports(text);
    const offset = document.offsetAt(position);
    const tagContext = getOpeningTagContext(text, offset);

    if (/^[A-Z]/.test(symbol)) {
      const item = imports.find((it) => it.localName === symbol);
      if (!item) {
        return null;
      }

      const resolved = resolveImport(document.uri.fsPath, item.source);
      if (!resolved) {
        return null;
      }

      return new vscode.Location(vscode.Uri.file(resolved), new vscode.Position(0, 0));
    }

    if (!tagContext || !tagContext.isInAttributes || !tagContext.componentName) {
      return null;
    }

    const item = imports.find((it) => it.localName === tagContext.componentName);
    if (!item) {
      return null;
    }

    const resolved = resolveImport(document.uri.fsPath, item.source);
    if (!resolved) {
      return null;
    }

    const ext = path.extname(resolved);
    if (ext === '.astro') {
      return findAstroPropDefinition(resolved, symbol);
    }

    if (ext === '.vue') {
      return findVuePropDefinition(resolved, symbol);
    }

    return null;
  },
};
