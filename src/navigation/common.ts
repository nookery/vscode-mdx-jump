import * as vscode from 'vscode';

export function findMatchingBrace(text: string, openBraceOffset: number): number {
  let depth = 0;
  for (let i = openBraceOffset; i < text.length; i++) {
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function findPropertyInBlock(
  text: string,
  blockStart: number,
  blockEnd: number,
  propName: string
): { offset: number } | null {
  const body = text.slice(blockStart, blockEnd);
  const propertyRe = /(?:^|\n)\s*([A-Za-z_$][\w$]*)\??\s*:/g;

  for (const match of body.matchAll(propertyRe)) {
    const name = match[1];
    const nameIndexInMatch = match[0].lastIndexOf(name);
    const matchIndex = match.index ?? 0;
    if (name === propName) {
      return { offset: blockStart + matchIndex + nameIndexInMatch };
    }
  }

  return null;
}

export function offsetToPosition(text: string, offset: number): vscode.Position {
  const prefix = text.slice(0, offset);
  const lines = prefix.split('\n');
  const line = lines.length - 1;
  const character = lines[line]?.length ?? 0;
  return new vscode.Position(line, character);
}
