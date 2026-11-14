# Contributing

Diagramist is one repository with two packages that share a core: the `diagramist` npm package (the
checker) and the VS Code extension. The design is in
[docs/designs/diagramist.md](docs/designs/diagramist.md), and its packaging results are in
[docs/designs/packaging-notes.md](docs/designs/packaging-notes.md).

## Layout

| Path | Contents |
| --- | --- |
| `src/core/` | Finding diagrams, both renderers' checks, positions, hints, the targets comment, the result format and the samples. No VS Code, no Node APIs, no browser page. |
| `src/draw/` | Drawing in the browser: Pele, Mermaid.js and the theme map. Only the preview's webview uses it. |
| `src/platform/node/` | The check worker's pool, the coordinator, safe file reading, the linkedom stand-in and the logger. |
| `src/platform/vscode/` | VS Code's log, settings, Workspace Trust and the in-memory counts. |
| `src/platform/messages.ts` | The messages between the extension host and the preview (types only). |
| `src/features/checker/` | The `diagramist` command and its MCP server. |
| `src/features/diagnostics/` | Problems-panel errors. |
| `src/features/preview/` | The preview panel (`host/`), its webview (`webview/`) and export. |
| `src/features/agent-setup/` | The version check, Connect, Check and Disconnect AI Agent, and the diagnostic report. |
| `src/entries/` | Entry points: `cli`, `check-worker`, `extension` and `webview`. |
| `skills/diagramist/` | The agent skill. |
| `packages/diagramist/`, `packages/vscode/` | The two packages; `scripts/build.mjs` fills their `dist/`. |

**Import rules** (`npm run lint:deps`):

*   The core imports only the core. `mermaid` is used only in the core's Mermaid.js check and in
    `src/draw/`, `pele` only in the core's Pele check and in `src/draw/`, `markdown-it` only in
    `src/core/blocks/`, and `linkedom` only in `src/platform/node/dom-standin.ts`.
*   Features never import each other; the entry files combine them.
*   `vscode` is imported only in extension-host code.

## Tests

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | TypeScript, in seven configurations |
| `npm run lint:deps` | The import rules |
| `npm test` | Unit tests for the core and the Node platform, with coverage |
| `npm run test:checker` | Builds, then tests the built CLI and MCP server |
| `npm run test:webview` | Builds, then tests the preview and export in Chromium (set `DIAGRAMIST_CHROMIUM` to use your own Chromium) |
| `npm run test:extension` | Builds, then tests the extension in stable VS Code (under `xvfb-run -a` on Linux without a display) |
| `npm run verify:corpus` | Checks the test corpus's Mermaid.js expectations in a real browser |
| `npm run package` | Builds both packages, packs them into `out/package/`, and checks they are under 15 MB |

CI runs all of them on Linux; the unit, checker and extension tests also run on macOS and Windows.

## Upgrading Mermaid.js or Pele

1.  Bump the exact version in `package.json`, and run `npm install`.
2.  Run `npm test`, `npm run verify:corpus`, `npm run test:checker` and `npm run test:webview`.
3.  Where a verdict changed, update `test/fixtures/corpus/cases.json` and
    `test/fixtures/agent-eval/diagrams.json`, and list each change under "Validator changes" in
    `CHANGELOG.md`.
4.  A release that changes any verdict is at least a minor release.

## Releasing

The steps are in [docs/release-checklist.md](docs/release-checklist.md). In short:

1.  Set the same version in `packages/diagramist/package.json` and `packages/vscode/package.json`,
    and update `CHANGELOG.md`.
2.  Push, and wait for CI.
3.  Push the tag `v<version>`. The Release workflow tests, packs, and then publishes to:
    *   npm, as a staged release that a maintainer approves;
    *   the VS Code Marketplace;
    *   Open VSX.
