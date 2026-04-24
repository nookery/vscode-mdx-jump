import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { findMatchingBrace, findPropertyInBlock, offsetToPosition } from './common';

export function findAstroPropDefinition(astroFilePath: string, propName: string): vscode.Location | null {
  const parsed = parseAstroPropsFile(astroFilePath);
  if (!parsed) {
    return null;
  }

  const property = findPropertyInBlock(parsed.text, parsed.block.start, parsed.block.end, propName);
  if (!property) {
    return null;
  }

  const position = offsetToPosition(parsed.text, property.offset);
  return new vscode.Location(vscode.Uri.file(astroFilePath), position);
}

export function getAstroProps(astroFilePath: string): Set<string> {
  const parsed = parseAstroPropsFile(astroFilePath);
  if (!parsed) {
    return new Set<string>();
  }

  return collectProperties(parsed.text, parsed.block.start, parsed.block.end);
}

function parseAstroPropsFile(astroFilePath: string): { text: string; block: { start: number; end: number } } | null {
  let text = '';
  try {
    text = fs.readFileSync(astroFilePath, 'utf8');
  } catch {
    return null;
  }

  const block = findPropsBlock(text);
  if (!block) {
    return null;
  }

  return { text, block };
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

function collectProperties(text: string, blockStart: number, blockEnd: number): Set<string> {
  const names = new Set<string>();
  const body = text.slice(blockStart, blockEnd);
  const propertyRe = /(?:^|\n)\s*([A-Za-z_$][\w$]*)\??\s*:/g;

  for (const match of body.matchAll(propertyRe)) {
    if (match[1]) {
      names.add(match[1]);
    }
  }

  return names;
}
