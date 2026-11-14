#!/usr/bin/env node
// Builds packages/diagramist (design items 44 and 45) and packages/vscode (item 87): the CLI, the
// extension and the check worker, bundled with esbuild, plus LICENSE, the agent skill and
// THIRD_PARTY_NOTICES.md in each package. Every bundle gets its version strings from the same build,
// so they always agree on the renderer versions, and the two packages must share one version.
//
//   node scripts/build.mjs
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { writeThirdPartyNotices } from "./third-party-notices.mjs";

const root = resolve(import.meta.dirname, "..");
const packageDir = join(root, "packages/diagramist");
const extensionDir = join(root, "packages/vscode");
const versionOf = (dir) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version;

// Bundled CommonJS code still calls require() and reads __dirname (found in P2).
const banner = [
  'import { createRequire as __diagramistRequire } from "node:module";',
  'import { fileURLToPath as __diagramistPath } from "node:url";',
  "const require = __diagramistRequire(import.meta.url);",
  "const __filename = __diagramistPath(import.meta.url);",
  'const __dirname = __filename.slice(0, Math.max(__filename.lastIndexOf("/"), __filename.lastIndexOf("\\\\")));',
].join("\n");

function commonOptions(minify) {
  return {
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
}

/** Builds cli.mjs and check-worker.mjs into `outDir`, and returns esbuild's metafiles. */
export async function bundleChecker({ outDir, minify = true }) {
  const common = commonOptions(minify);
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

/** Builds extension.cjs (CommonJS, for VS Code's extension host) and check-worker.mjs into `outDir`. */
export async function bundleExtension({ outDir, minify = true }) {
  const common = commonOptions(minify);
  const extension = await build({
    ...common,
    format: "cjs",
    // VS Code 1.101's extension host runs Node 22.15 (docs/designs/packaging-notes.md).
    target: "node22.15",
    entryPoints: [join(root, "src/entries/extension.ts")],
    outfile: join(outDir, "extension.cjs"),
    external: [...common.external, "vscode"],
  });
  const worker = await build({ ...common, entryPoints: [join(root, "src/entries/check-worker.ts")], outfile: join(outDir, "check-worker.mjs"), banner: { js: banner } });
  return [extension.metafile, worker.metafile];
}

async function main() {
  const version = versionOf(packageDir);
  if (versionOf(extensionDir) !== version) throw new Error(`packages/vscode is ${versionOf(extensionDir)} but packages/diagramist is ${version}; they share one version`);
  const size = (dir, file) => `${(statSync(join(dir, "dist", file)).size / 1e6).toFixed(2)} MB`;
  for (const [dir, bundle, files] of [[packageDir, bundleChecker, ["cli.mjs", "check-worker.mjs"]], [extensionDir, bundleExtension, ["extension.cjs", "check-worker.mjs"]]]) {
    rmSync(join(dir, "dist"), { recursive: true, force: true });
    const metafiles = await bundle({ outDir: join(dir, "dist") });
    copyFileSync(join(root, "LICENSE"), join(dir, "LICENSE"));
    copySkill(dir, version);
    const notices = writeThirdPartyNotices(metafiles, join(dir, "THIRD_PARTY_NOTICES.md"), root);
    console.log(`Built ${relative(root, dir)} ${version}: ${files.map((file) => `dist/${file} ${size(dir, file)}`).join(", ")}; ${notices} bundled packages in THIRD_PARTY_NOTICES.md.`);
  }
}

/** Copies skills/diagramist/SKILL.md into the package, with the version in metadata.diagramistVersion (D8). */
function copySkill(dir, version) {
  const source = readFileSync(join(root, "skills/diagramist/SKILL.md"), "utf8");
  const versioned = source.replace(/^(\s+diagramistVersion:).*$/m, `$1 "${version}"`);
  if (!versioned.includes(`diagramistVersion: "${version}"`)) throw new Error("SKILL.md has no metadata.diagramistVersion line");
  const target = join(dir, "skills/diagramist/SKILL.md");
  rmSync(join(dir, "skills"), { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, versioned);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
