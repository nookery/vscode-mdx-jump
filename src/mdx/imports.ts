import { ImportItem } from '../types';

const IMPORT_LINE_RE = /^\s*import\s+([\w$]+)\s+from\s+['\"]([^'\"]+)['\"];?/gm;

export function parseImports(text: string): ImportItem[] {
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
