import * as vscode from 'vscode';
import { mdxDefinitionProvider, MDX_SELECTORS } from './providers/mdx-definition-provider';
import { mdxImportCompletionProvider } from './providers/mdx-import-completion-provider';
import {
  mdxSemanticSelectors,
  mdxSemanticTokenLegend,
  mdxSemanticTokensProvider,
} from './providers/mdx-semantic-tokens-provider';
import { registerMdxPropDiagnostics } from './providers/mdx-prop-diagnostics';
import { registerMdxFormatter } from './providers/mdx-format-provider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerDefinitionProvider(MDX_SELECTORS, mdxDefinitionProvider);
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    MDX_SELECTORS,
    mdxImportCompletionProvider
  );
  const semanticProvider = vscode.languages.registerDocumentSemanticTokensProvider(
    mdxSemanticSelectors,
    mdxSemanticTokensProvider,
    mdxSemanticTokenLegend
  );

  context.subscriptions.push(provider);
  context.subscriptions.push(completionProvider);
  context.subscriptions.push(semanticProvider);
  registerMdxPropDiagnostics(context);
  registerMdxFormatter(context);
}

export function deactivate(): void {}

