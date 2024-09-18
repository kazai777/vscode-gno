/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');
import { getGnoConfig } from '../../config';
import { 
        promptForMissingTool,
        getBinPath
} from '../../util';
import { killProcessTree } from '../../utils/processUtils';
import { toolExecutionEnvironment } from '../../goEnv';

export class GoDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
	public provideDocumentFormattingEdits(
		document: vscode.TextDocument,
		options: vscode.FormattingOptions,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.TextEdit[]> {
		if (vscode.window.visibleTextEditors.every((e) => e.document.fileName !== document.fileName)) {
			return [];
		}

		const filename = document.fileName;
		const goConfig = getGnoConfig(document.uri);
		const formatFlags = goConfig['formatFlags'].slice() || [];

		// Ignore -w because we don't want to write directly to disk.
		if (formatFlags.indexOf('-w') > -1) {
			formatFlags.splice(formatFlags.indexOf('-w'), 1);
		}

		const formatTool = getFormatTool(goConfig);

		return this.runFormatter(formatTool, formatFlags, document, token).then(
			(edits) => edits,
			(err) => {
				if (typeof err === 'string' && err.startsWith('flag provided but not defined: -srcdir')) {
					// XXX:
                                        // promptForUpdatingTool(formatTool);
					return Promise.resolve([]);
				}
				if (err) {
					// TODO(hyangah): investigate why this console.log is not visible at all in dev console.
					// Ideally, this error message should be accessible through one of the output channels.
					console.log(err);
					return Promise.reject(
						`Check the console in dev tools to find errors when formatting with ${formatTool}`
					);
				}
			}
		);
	}

	private runFormatter(
		formatTool: string,
		formatFlags: string[],
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Thenable<vscode.TextEdit[]> {
		const formatCommandBinPath = getBinPath(formatTool);
		if (!path.isAbsolute(formatCommandBinPath)) {
			// executable not found.
			promptForMissingTool(formatTool);
			return Promise.reject('failed to find tool ' + formatTool);
		}
		return new Promise<vscode.TextEdit[]>((resolve, reject) => {
			const env = toolExecutionEnvironment();
			const cwd = path.dirname(document.fileName);
			let stdout = '';
			let stderr = '';

			// Use spawn instead of exec to avoid maxBufferExceeded error
			const p = cp.spawn(formatCommandBinPath, formatFlags, { env, cwd });
			token.onCancellationRequested(() => !p.killed && killProcessTree(p));
			p.stdout.setEncoding('utf8');
			p.stdout.on('data', (data) => (stdout += data));
			p.stderr.on('data', (data) => (stderr += data));
			p.on('error', (err) => {
				if (err && (<any>err).code === 'ENOENT') {
					promptForMissingTool(formatTool);
					return reject(`failed to find format tool: ${formatTool}`);
				}
			});
			p.on('close', (code) => {
				if (code !== 0) {
					return reject(stderr);
				}

				// Return the complete file content in the edit.
				// VS Code will calculate minimal edits to be applied
				const fileStart = new vscode.Position(0, 0);
				const fileEnd = document.lineAt(document.lineCount - 1).range.end;
				const textEdits: vscode.TextEdit[] = [
					new vscode.TextEdit(new vscode.Range(fileStart, fileEnd), stdout)
				];
				return resolve(textEdits);
			});
			if (p.pid) {
				p.stdin.end(document.getText());
			}
		});
	}
}

export function usingCustomFormatTool(gnoConfig: { [key: string]: any }): boolean {
	const formatTool = getFormatTool(gnoConfig);
	switch (formatTool) {
		case 'gofmt':
			return false;
		case 'gofumpt':
			return false;
		default:
			return true;
	}
}

export function getFormatTool(gnoConfig: { [key: string]: any }): string {
	const formatTool = gnoConfig['formatTool'];
	if (formatTool === 'default') {
		return 'gofumpt';
	}
	return formatTool;
}

