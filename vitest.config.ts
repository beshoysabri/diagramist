import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const versionOf = (dir: string): string => JSON.parse(readFileSync(`${dir}/package.json`, "utf8")).version;

// Four projects. Mermaid.js needs browser objects in Node, so its tests install the same stand-in
// as the check worker (src/platform/node/dom-standin.ts); the rest of the core runs without one.
// "node" tests the platform code against freshly bundled workers; "checker" runs the built CLI
// (`npm run test:checker`).
export default defineConfig({
  // The version strings scripts/build.mjs injects.
  define: {
    __DIAGRAMIST_VERSION__: JSON.stringify(versionOf("packages/diagramist")),
    __MERMAID_VERSION__: JSON.stringify(versionOf("node_modules/mermaid")),
    __PELE_VERSION__: JSON.stringify(versionOf("node_modules/pele")),
  },
  test: {
    setupFiles: ["test/helpers/network-guard.ts"],
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts"],
      thresholds: { lines: 90 },
      reporter: ["text-summary", "json-summary"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "core",
          environment: "node",
          include: ["test/core/**/*.test.ts", "test/draw/**/*.test.ts"],
          exclude: ["test/core/mermaid-check.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "mermaid",
          environment: "node",
          setupFiles: ["test/helpers/install-dom-standin.ts"],
          include: ["test/core/mermaid-check.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["test/node/**/*.test.ts"],
          globalSetup: ["test/helpers/build-checker.ts"],
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: "checker",
          environment: "node",
          include: ["test/checker/**/*.test.ts"],
          testTimeout: 60_000,
        },
      },
    ],
  },
});
