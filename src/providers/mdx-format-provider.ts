import * as prettier from 'prettier';
import * as vscode from 'vscode';
import { MDX_SELECTORS } from './mdx-definition-provider';

export function registerMdxFormatter(context: vscode.ExtensionContext): void {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    MDX_SELECTORS,
    {
      async provideDocumentFormattingEdits(document): Promise<vscode.TextEdit[]> {
        const text = document.getText();

        try {
          const config = await prettier.resolveConfig(document.uri.fsPath);
          const formatted = await prettier.format(text, {
            ...config,
            parser: 'mdx',
            filepath: document.uri.fsPath,
          });

          // 如果内容没有变化，不返回编辑
          if (formatted === text) {
            return [];
          }

          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
          );
          return [new vscode.TextEdit(fullRange, formatted)];
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`MDX 格式化失败: ${message}`);
          return [];
        }
      },
    }
  );

  context.subscriptions.push(formatter);
}
