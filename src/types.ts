export type ImportItem = {
  localName: string;
  source: string;
  importLine: number;
};

export type OpeningTagContext = {
  componentName: string | null;
  isInAttributes: boolean;
};
