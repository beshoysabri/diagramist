import { defineConfig } from "vitest/config";

// Three projects, because Mermaid.js needs a browser-like environment and Pele must not see one
// (docs/designs/diagramist.md, Technical Plan section 1).
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
          environment: "jsdom",
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
