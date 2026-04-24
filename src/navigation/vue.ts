import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { findMatchingBrace, findPropertyInBlock, offsetToPosition } from './common';

export function findVuePropDefinition(vueFilePath: string, propName: string): vscode.Location | null {
  let text = '';
  try {
    text = fs.readFileSync(vueFilePath, 'utf8');
  } catch {
    return null;
  }

  const scriptBlock = findScriptBlock(text);
  if (!scriptBlock) {
    return null;
  }

  const scriptText = text.slice(scriptBlock.start, scriptBlock.end);

  const definePropsLocation = findFromDefineProps(
    vueFilePath,
    text,
    scriptText,
    scriptBlock.start,
    propName
  );
  if (definePropsLocation) {
    return definePropsLocation;
  }

  const optionsLocation = findFromOptionsApiProps(
    vueFilePath,
    text,
    scriptText,
    scriptBlock.start,
    propName
  );
  if (optionsLocation) {
    return optionsLocation;
  }

  return null;
}

function findScriptBlock(text: string): { start: number; end: number } | null {
  const scriptRe = /<script\b[^>]*>/i;
  const open = scriptRe.exec(text);
  if (!open) {
    return null;
  }

  const openTagEnd = (open.index ?? 0) + open[0].length;
  const closeIndex = text.indexOf('</script>', openTagEnd);
  if (closeIndex < 0) {
    return null;
  }

  return { start: openTagEnd, end: closeIndex };
}

function findFromDefineProps(
  vueFilePath: string,
  fileText: string,
  scriptText: string,
  scriptStartOffset: number,
  propName: string
): vscode.Location | null {
  const namedTypeMatch = /defineProps\s*<\s*([A-Za-z_$][\w$]*)\s*>/.exec(scriptText);
  if (namedTypeMatch) {
    const typeName = namedTypeMatch[1];
    const typeBlock = findTypeLikeBlock(fileText, scriptText, scriptStartOffset, typeName);
    if (typeBlock) {
      const property = findPropertyInBlock(fileText, typeBlock.start, typeBlock.end, propName);
      if (property) {
        return new vscode.Location(
          vscode.Uri.file(vueFilePath),
          offsetToPosition(fileText, property.offset)
        );
      }
    }
  }

  const genericMatch = /defineProps\s*<\s*\{/.exec(scriptText);
  if (genericMatch) {
    const openBraceOffsetInScript = (genericMatch.index ?? 0) + genericMatch[0].length - 1;
    const openBraceInFile = scriptStartOffset + openBraceOffsetInScript;
    const closeBraceInFile = findMatchingBrace(fileText, openBraceInFile);
    if (closeBraceInFile >= 0) {
      const property = findPropertyInBlock(fileText, openBraceInFile + 1, closeBraceInFile, propName);
      if (property) {
        return new vscode.Location(
          vscode.Uri.file(vueFilePath),
          offsetToPosition(fileText, property.offset)
        );
      }
    }
  }

  const objectMatch = /defineProps\s*\(\s*\{/.exec(scriptText);
  if (objectMatch) {
    const openBraceOffsetInScript = (objectMatch.index ?? 0) + objectMatch[0].length - 1;
    const openBraceInFile = scriptStartOffset + openBraceOffsetInScript;
    const closeBraceInFile = findMatchingBrace(fileText, openBraceInFile);
    if (closeBraceInFile >= 0) {
      const property = findPropertyInBlock(fileText, openBraceInFile + 1, closeBraceInFile, propName);
      if (property) {
        return new vscode.Location(
          vscode.Uri.file(vueFilePath),
          offsetToPosition(fileText, property.offset)
        );
      }
    }
  }

  return null;
}

function findTypeLikeBlock(
  fileText: string,
  scriptText: string,
  scriptStartOffset: number,
  typeName: string
): { start: number; end: number } | null {
  const interfaceRe = new RegExp(`interface\\s+${typeName}\\s*\\{`);
  const interfaceMatch = interfaceRe.exec(scriptText);
  if (interfaceMatch) {
    const openBraceOffsetInScript = (interfaceMatch.index ?? 0) + interfaceMatch[0].length - 1;
    const openBraceInFile = scriptStartOffset + openBraceOffsetInScript;
    const closeBraceInFile = findMatchingBrace(fileText, openBraceInFile);
    if (closeBraceInFile >= 0) {
      return { start: openBraceInFile + 1, end: closeBraceInFile };
    }
  }

  const typeRe = new RegExp(`type\\s+${typeName}\\s*=\\s*\\{`);
  const typeMatch = typeRe.exec(scriptText);
  if (typeMatch) {
    const openBraceOffsetInScript = (typeMatch.index ?? 0) + typeMatch[0].length - 1;
    const openBraceInFile = scriptStartOffset + openBraceOffsetInScript;
    const closeBraceInFile = findMatchingBrace(fileText, openBraceInFile);
    if (closeBraceInFile >= 0) {
      return { start: openBraceInFile + 1, end: closeBraceInFile };
    }
  }

  return null;
}

function findFromOptionsApiProps(
  vueFilePath: string,
  fileText: string,
  scriptText: string,
  scriptStartOffset: number,
  propName: string
): vscode.Location | null {
  const propsMatch = /(?:^|\n)\s*props\s*:\s*\{/.exec(scriptText);
  if (!propsMatch) {
    return null;
  }

  const openBraceOffsetInScript = (propsMatch.index ?? 0) + propsMatch[0].length - 1;
  const openBraceInFile = scriptStartOffset + openBraceOffsetInScript;
  const closeBraceInFile = findMatchingBrace(fileText, openBraceInFile);
  if (closeBraceInFile < 0) {
    return null;
  }

  const property = findPropertyInBlock(fileText, openBraceInFile + 1, closeBraceInFile, propName);
  if (!property) {
    return null;
  }

  return new vscode.Location(vscode.Uri.file(vueFilePath), offsetToPosition(fileText, property.offset));
}
