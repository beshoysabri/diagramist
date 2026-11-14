// Design item 107: serves packages/vscode/dist and a page made by the preview's own previewHtml(),
// with the exact Content-Security-Policy and a fixed test nonce, plus the VS Code API stub. Every
// request is recorded, so tests can prove that drawing fetches nothing remote.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join, normalize } from "node:path";
import { build } from "esbuild";
import { previewHtml } from "../../src/features/preview/host/html.js";

export const TEST_NONCE = "diagramist-test-nonce";
const dist = join(process.cwd(), "packages/vscode/dist");

// Some of VS Code's theme variables, so the light preview looks as it would in the editor.
const VSCODE_LIGHT = `body { --vscode-editor-background: #ffffff; --vscode-editor-foreground: #1f1f1f; --vscode-descriptionForeground: #6e6e6e; --vscode-focusBorder: #0090f1; --vscode-errorForeground: #e51400; --vscode-editorWidget-background: #f3f3f3; --vscode-sideBar-background: #f3f3f3; --vscode-editorWidget-border: #c8c8c8; --vscode-font-family: sans-serif; --vscode-font-size: 13px; }`;

export interface Harness {
  url: string;
  origin: string;
  requests: string[];
  close(): Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const stub = (await build({ entryPoints: [join(process.cwd(), "test/webview/vscode-api-stub.ts")], bundle: true, write: false, format: "iife", target: "chrome120" })).outputFiles[0]!.text;
  const requests: string[] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    requests.push(url.pathname);
    if (url.pathname === "/") {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const html = previewHtml({ cspSource: origin, scriptUri: `${origin}/dist/webview.js`, styleUri: `${origin}/dist/webview.css`, nonce: TEST_NONCE })
        .replace("<body>", `<body class="vscode-light"><style>${VSCODE_LIGHT}</style><script nonce="${TEST_NONCE}" src="/stub.js"></script>`);
      response.writeHead(200, { "content-type": "text/html" }).end(html);
      return;
    }
    if (url.pathname === "/stub.js") {
      response.writeHead(200, { "content-type": "text/javascript" }).end(stub);
      return;
    }
    if (url.pathname.startsWith("/dist/")) {
      const file = normalize(join(dist, url.pathname.slice("/dist/".length)));
      if (!file.startsWith(dist)) return void response.writeHead(403).end();
      try {
        const type = file.endsWith(".css") ? "text/css" : "text/javascript";
        response.writeHead(200, { "content-type": type }).end(await readFile(file));
      } catch {
        response.writeHead(404).end();
      }
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url: `${origin}/`, origin, requests, close: () => new Promise((done) => server.close(() => done())) };
}
