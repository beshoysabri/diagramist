// The preview page and its Content Security Policy (design item 101; Technical Plan section 6): no
// network, scripts only with this page's nonce, styles from the extension or inline (both renderers
// put styles inside their SVG), images only from the extension or data URLs.
import { randomBytes } from "node:crypto";

export function contentSecurityPolicy(cspSource: string, nonce: string): string {
  return [`default-src 'none'`, `script-src 'nonce-${nonce}'`, `style-src ${cspSource} 'unsafe-inline'`, `img-src ${cspSource} data:`].join("; ");
}

export function previewHtml(options: { cspSource: string; scriptUri: string; styleUri: string; nonce?: string }): string {
  const nonce = options.nonce ?? randomBytes(16).toString("base64");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(options.cspSource, nonce)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${options.styleUri}">
<title>Diagramist preview</title>
</head>
<body>
<script nonce="${nonce}" src="${options.scriptUri}"></script>
</body>
</html>`;
}
