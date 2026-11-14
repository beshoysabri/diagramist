#!/usr/bin/env node
// Builds both packages and packs them into out/package (design item 131): the VSIX with
// `vsce package --no-dependencies`, and the npm tarball with `npm pack`. Then checks their sizes.
//
//   node scripts/package.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "out/package");
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
run(process.execPath, [join(root, "scripts/build.mjs")]);
const version = JSON.parse(readFileSync(join(root, "packages/diagramist/package.json"), "utf8")).version;
const vsix = join(out, `diagramist-${version}.vsix`);
run("npx", ["vsce", "package", "--no-dependencies", "--out", vsix], join(root, "packages/vscode"));
run("npm", ["pack", "--pack-destination", out], join(root, "packages/diagramist"));
run(process.execPath, [join(root, "scripts/check-size.mjs"), vsix, join(out, `diagramist-${version}.tgz`)]);
