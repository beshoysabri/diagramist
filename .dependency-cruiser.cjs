/**
 * Import rules from docs/designs/diagramist.md, Technical Plan section 8.
 * Each rule names the section's sentence it enforces.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "core-imports-only-core",
      comment: "core/** imports only core/** (plus its three allowed npm packages, checked below).",
      severity: "error",
      from: { path: "^src/core/" },
      to: { path: "^src/", pathNot: "^src/core/" },
    },
    {
      name: "core-no-node-builtins",
      comment: "The core does not depend on Node.",
      severity: "error",
      from: { path: "^src/core/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "core-only-allowed-packages",
      comment: "The core may import only mermaid, pele and markdown-it.",
      severity: "error",
      from: { path: "^src/core/" },
      to: { dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-no-pkg", "npm-unknown"], pathNot: "^node_modules/(mermaid|pele|markdown-it)/" },
    },
    {
      name: "mermaid-only-in-renderer-or-draw",
      severity: "error",
      from: { pathNot: "^src/(core/renderers/mermaid/|draw/mermaid-draw\\.ts$)" },
      to: { path: "^node_modules/mermaid/" },
    },
    {
      name: "pele-only-in-renderer-or-draw",
      severity: "error",
      from: { pathNot: "^src/(core/renderers/pele/|draw/pele-draw\\.ts$)" },
      to: { path: "^node_modules/pele/" },
    },
    {
      name: "markdown-it-only-in-blocks",
      severity: "error",
      from: { pathNot: "^src/core/blocks/" },
      to: { path: "^node_modules/markdown-it/" },
    },
    {
      name: "linkedom-only-in-dom-standin",
      severity: "error",
      from: { pathNot: "^src/platform/node/dom-standin\\.ts$" },
      to: { path: "^node_modules/linkedom/" },
    },
    {
      name: "draw-only-from-webview",
      comment: "Only features/preview/webview/** and entries/webview.ts import draw/**.",
      severity: "error",
      from: { pathNot: "^src/(features/preview/webview/|entries/webview\\.ts$|draw/)" },
      to: { path: "^src/draw/" },
    },
    {
      name: "features-never-import-each-other",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/", pathNot: "^src/features/$1/" },
    },
    {
      name: "no-vscode-outside-host-code",
      comment: "core, draw, platform/node, platform/messages, the checker and webview code never import vscode.",
      severity: "error",
      from: { path: "^src/(core/|draw/|platform/node/|platform/messages\\.ts$|features/checker/|features/[^/]+/webview/|entries/(cli|webview|check-worker)\\.ts$)" },
      to: { path: "^vscode$" },
    },
    {
      name: "no-platform-vscode-from-node-or-webview",
      severity: "error",
      from: { path: "^src/(core/|draw/|platform/node/|platform/messages\\.ts$|features/checker/|features/[^/]+/webview/)" },
      to: { path: "^src/platform/vscode/" },
    },
    {
      name: "no-platform-node-from-webview",
      severity: "error",
      from: { path: "^src/(draw/|features/[^/]+/webview/|entries/webview\\.ts$)" },
      to: { path: "^src/platform/node/" },
    },
    {
      name: "messages-are-types-only",
      severity: "error",
      from: { path: "^src/platform/messages\\.ts$" },
      to: { dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default", "types"] },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
