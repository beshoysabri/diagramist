#!/usr/bin/env node
// Prints the packed sizes of the VSIX and the npm tarball, and fails if either is over 15 MB
// (design item 132, Risks & Limits).
//
//   node scripts/check-size.mjs out/package/diagramist-0.1.1.vsix out/package/diagramist-0.1.1.tgz
import { statSync } from "node:fs";
import { basename } from "node:path";

const LIMIT = 15 * 1024 * 1024;
let failed = false;
for (const file of process.argv.slice(2)) {
  const bytes = statSync(file).size;
  const over = bytes > LIMIT;
  failed ||= over;
  console.log(`${basename(file)}: ${(bytes / 1024 / 1024).toFixed(2)} MB${over ? " — over the 15 MB limit" : ""}`);
}
if (process.argv.length <= 2) {
  console.error("check-size: name the files to check");
  failed = true;
}
process.exitCode = failed ? 1 : 0;
