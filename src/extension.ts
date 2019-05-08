// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
    CancellationToken,
    DocumentFormattingEditProvider,
    DocumentRangeFormattingEditProvider,
    FormattingOptions,
    Range,
    TextDocument,
    TextEdit
} from 'vscode';


const bundledPrettier = require('prettier') as any;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'handlebars' }, new PrettierHandlebarsFormatter());
}

// this method is called when your extension is deactivated
export function deactivate() { }

function fullDocumentRange(document: TextDocument): Range {
    const lastLineId = document.lineCount - 1;
    return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}



type ResolveConfigResult = { config: any | null; error?: Error };

/**
 * Resolves the prettierconfig for the given file.
 *
 * @param filePath file's path
 */
async function resolveConfig(
    filePath: string,
    options?: { editorconfig?: boolean }
): Promise<ResolveConfigResult> {
    try {
        const config = await bundledPrettier.resolveConfig(filePath, options);
        return { config };
    } catch (error) {
        return { config: null, error };
    }
}

class PrettierHandlebarsFormatter implements DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider {
    async provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): Promise<TextEdit[]> {
        const text = document.getText(range);
        const { config: fileOptions, error } = await resolveConfig(document.fileName, {
            editorconfig: true,
        });
        if (error) {
            console.log(
                `Failed to resolve config for ${document.fileName}. Falling back to the default config settings.`
            );
        }
        let prettierOptions = {
            parser: 'glimmer',
        };
        prettierOptions = Object.assign(prettierOptions, fileOptions);
        const formatted = bundledPrettier.format(text, prettierOptions);
        return [TextEdit.replace(range, formatted)];
    }
    async provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
        const { activeTextEditor } = vscode.window;
        if (activeTextEditor && activeTextEditor.document.languageId === 'handlebars') {
            const { config: fileOptions, error } = await resolveConfig(document.fileName, {
                editorconfig: true,
            });
            if (error) {
                console.log(
                    `Failed to resolve config for ${document.fileName}. Falling back to the default config settings.`
                );
            }
            let options = {
                parser: 'glimmer',
            };
            options = Object.assign(options, fileOptions);
            const text = document.getText();
            const formatted = bundledPrettier.format(text, options);
            const range = fullDocumentRange(document);
            return [TextEdit.replace(range, formatted)];
        }
    }
}
