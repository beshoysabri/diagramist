// Workspace Trust, wrapped so that tests can replace it (design item 80): Restricted Mode can't be
// forced inside the test host.
import * as vscode from "vscode";

export interface Trust {
  isTrusted(): boolean;
  onDidGrant(listener: () => void): vscode.Disposable;
}

const real: Trust = {
  isTrusted: () => vscode.workspace.isTrusted,
  onDidGrant: (listener) => vscode.workspace.onDidGrantWorkspaceTrust(listener),
};

let current: Trust = real;

export const trust: Trust = {
  isTrusted: () => current.isTrusted(),
  onDidGrant: (listener) => current.onDidGrant(listener),
};

/** For tests: replace the trust state; call with no argument to restore the real one. */
export function replaceTrustForTests(replacement?: Trust): void {
  current = replacement ?? real;
}
