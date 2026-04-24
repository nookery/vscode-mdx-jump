import * as vscode from 'vscode';
import { mdxDefinitionProvider, MDX_SELECTORS } from './providers/mdx-definition-provider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerDefinitionProvider(MDX_SELECTORS, mdxDefinitionProvider);

  context.subscriptions.push(provider);
}

export function deactivate(): void {}

