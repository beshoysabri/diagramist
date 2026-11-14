#!/usr/bin/env node
// Builds packages/diagramist (design items 44 and 45): the CLI and the check worker, bundled with
// esbuild, plus LICENSE and THIRD_PARTY_NOTICES.md. Both bundles get their version strings from the
// same build, so they always agree on the renderer versions.
//
//   node scripts/build.mjs
import { copyFileSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { writeThirdPartyNotices } from "./third-party-notices.mjs";

const root = resolve(import.meta.dirname, "..");
const packageDir = join(root, "packages/diagramist");
const versionOf = (dir) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version;

// Bundled CommonJS code still calls require() and reads __dirname (found in P2).
const banner = [
  'import { createRequire as __diagramistRequire } from "node:module";',
  'import { fileURLToPath as __diagramistPath } from "node:url";',
  "const require = __diagramistRequire(import.meta.url);",
  "const __filename = __diagramistPath(import.meta.url);",
  'const __dirname = __filename.slice(0, Math.max(__filename.lastIndexOf("/"), __filename.lastIndexOf("\\\\")));',
].join("\n");

/** Builds cli.mjs and check-worker.mjs into `outDir`, and returns esbuild's metafiles. */
export async function bundleChecker({ outDir, minify = true }) {
  const common = {
    absWorkingDir: root,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22.12",
    minify,
    legalComments: "none",
    // linkedom's optional dependency; it falls back to its own stub when the package is missing.
    external: ["canvas"],
    define: {
      __DIAGRAMIST_VERSION__: JSON.stringify(versionOf(packageDir)),
      __MERMAID_VERSION__: JSON.stringify(versionOf(join(root, "node_modules/mermaid"))),
      __PELE_VERSION__: JSON.stringify(versionOf(join(root, "node_modules/pele"))),
    },
    metafile: true,
    logLevel: "warning",
  };
  const cli = await build({
    ...common,
    entryPoints: [join(root, "src/entries/cli.ts")],
    outfile: join(outDir, "cli.mjs"),
    banner: { js: `#!/usr/bin/env node\n${banner}` },
  });
  const worker = await build({
    ...common,
    entryPoints: [join(root, "src/entries/check-worker.ts")],
    outfile: join(outDir, "check-worker.mjs"),
    banner: { js: banner },
  });
  return [cli.metafile, worker.metafile];
}

async function main() {
  const dist = join(packageDir, "dist");
  rmSync(dist, { recursive: true, force: true });
  const metafiles = await bundleChecker({ outDir: dist });
  copyFileSync(join(root, "LICENSE"), join(packageDir, "LICENSE"));
  const notices = writeThirdPartyNotices(metafiles, join(packageDir, "THIRD_PARTY_NOTICES.md"), root);
  const size = (file) => `${(statSync(join(dist, file)).size / 1e6).toFixed(2)} MB`;
  console.log(`Built diagramist ${versionOf(packageDir)}: dist/cli.mjs ${size("cli.mjs")}, dist/check-worker.mjs ${size("check-worker.mjs")}; ${notices} bundled packages in THIRD_PARTY_NOTICES.md.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
