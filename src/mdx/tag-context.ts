import { OpeningTagContext } from '../types';

export function getOpeningTagContext(text: string, cursorOffset: number): OpeningTagContext | null {
  const start = text.lastIndexOf('<', cursorOffset);
  if (start < 0) {
    return null;
  }

  if (text[start + 1] === '/') {
    return null;
  }

  const end = text.indexOf('>', start);
  if (end < 0 || cursorOffset > end) {
    return null;
  }

  const inside = text.slice(start + 1, end);
  const nameMatch = inside.match(/^\s*([A-Z][\w$]*)\b/);
  if (!nameMatch) {
    return null;
  }

  const componentName = nameMatch[1];
  const nameIndexInInside = inside.indexOf(componentName);
  const nameStart = start + 1 + nameIndexInInside;
  const nameEnd = nameStart + componentName.length;

  return {
    componentName,
    isInAttributes: cursorOffset > nameEnd,
  };
}
