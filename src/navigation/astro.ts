import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { findMatchingBrace, findPropertyInBlock, offsetToPosition } from './common';

export function findAstroPropDefinition(astroFilePath: string, propName: string): vscode.Location | null {
  let text = '';
  try {
    text = fs.readFileSync(astroFilePath, 'utf8');
  } catch {
    return null;
  }

  const propsBlock = findPropsBlock(text);
  if (!propsBlock) {
    return null;
  }

  const property = findPropertyInBlock(text, propsBlock.start, propsBlock.end, propName);
  if (!property) {
    return null;
  }

  const position = offsetToPosition(text, property.offset);
  return new vscode.Location(vscode.Uri.file(astroFilePath), position);
}

function findPropsBlock(text: string): { start: number; end: number } | null {
  const interfaceMatch = /interface\s+Props\s*\{/.exec(text);
  if (interfaceMatch) {
    const openBraceOffset = (interfaceMatch.index ?? 0) + interfaceMatch[0].length - 1;
    const end = findMatchingBrace(text, openBraceOffset);
    if (end >= 0) {
      return { start: openBraceOffset + 1, end };
    }
  }

  const typeMatch = /type\s+Props\s*=\s*\{/.exec(text);
  if (typeMatch) {
    const openBraceOffset = (typeMatch.index ?? 0) + typeMatch[0].length - 1;
    const end = findMatchingBrace(text, openBraceOffset);
    if (end >= 0) {
      return { start: openBraceOffset + 1, end };
    }
  }

  return null;
}
