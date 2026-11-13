import { defineConfig } from "vitest/config";

// Three projects. Mermaid.js needs browser objects in Node, so its tests install the same stand-in
// as the check worker (src/platform/node/dom-standin.ts); the rest of the core runs without one.
export default defineConfig({
  test: {
    setupFiles: ["test/helpers/network-guard.ts"],
    // The "node" project has no tests until phase P3.
    passWithNoTests: true,
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
          include: ["test/core/**/*.test.ts"],
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
          include: ["test/node/**/*.test.ts", "test/checker/**/*.test.ts"],
        },
      },
    ],
  },
});
