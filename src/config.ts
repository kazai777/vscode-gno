import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { extensionId } from './const';

/** ExtensionInfo is a collection of static information about the extension. */
export class ExtensionInfo {
	/** Extension version */
	readonly version?: string;
	/** The application name of the editor, like 'VS Code' */
	readonly appName: string;
	/** True if the extension runs in preview mode (e.g. Nightly) */
	readonly isPreview: boolean;
	/** True if the extension runs in well-kwnon cloud IDEs */
	readonly isInCloudIDE: boolean;

	constructor() {
		const packageJSON = vscode.extensions.getExtension(extensionId)?.packageJSON;
		this.version = packageJSON?.version;
		this.appName = vscode.env.appName;
		this.isPreview = !!packageJSON?.preview;
		this.isInCloudIDE =
			process.env.CLOUD_SHELL === 'true' ||
			process.env.CODESPACES === 'true' ||
			!!process.env.GITPOD_WORKSPACE_ID;
	}
}

/** getGnoplsConfig returns the gnopls configuration with the correct binary path. */
export function getGnoplsConfig(uri?: vscode.Uri): vscode.WorkspaceConfiguration {
    return getConfig('gnopls', uri);
}

export const goConfig = (uri?: vscode.Uri) => {
	return getConfig('go', uri);
};

export const getGnoConfig = (uri?: vscode.Uri) => {
	return getConfig('gno', uri);
};

function getConfig(section: string, uri?: vscode.Uri | null) {
	if (!uri) {
		if (vscode.window.activeTextEditor) {
			uri = vscode.window.activeTextEditor.document.uri;
		} else {
			uri = null;
		}
	}
	return vscode.workspace.getConfiguration(section, uri);
}

/** Retrieve the path to the gnopls binary located in the extension root. */
export function getGnoplsBinaryPath(): string | undefined {
    const extension = vscode.extensions.getExtension(extensionId);
    if (!extension) {
        vscode.window.showErrorMessage("Extension not found");
        return undefined;
    }
    const extensionRoot = extension.extensionPath;

    let gnoplsBinaryPath = path.join(extensionRoot, 'gnopls', 'build', 'gnopls');
    gnoplsBinaryPath = correctBinname(gnoplsBinaryPath);

    if (fs.existsSync(gnoplsBinaryPath)) {
        return gnoplsBinaryPath;
    } else {
        vscode.window.showErrorMessage(`gnopls not found at ${gnoplsBinaryPath}`);
        return undefined;
    }
}

function correctBinname(binPath: string): string {
    if (process.platform === 'win32') {
        return binPath + '.exe';
    }
    return binPath;
}

export const extensionInfo = new ExtensionInfo();
