// Writes THIRD_PARTY_NOTICES.md (design item 45): the licence of every npm package that esbuild put
// into a bundle, found through the build's metafiles. The build fails on a licence that isn't known
// to allow bundling, so a new dependency's licence gets a human look first.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** SPDX identifiers known to allow bundling with attribution. */
const ALLOWED = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "MPL-2.0", "EPL-2.0", "CC0-1.0", "Unlicense", "BlueOak-1.0.0"]);
const LICENCE_FILE = /^(licen[cs]e|copying)([.-].*)?$/i;

/** Returns the number of packages listed. */
export function writeThirdPartyNotices(metafiles, outFile, root) {
  const packages = new Map();
  for (const metafile of metafiles) {
    for (const input of Object.keys(metafile.inputs)) {
      const at = input.lastIndexOf("node_modules/");
      if (at < 0) continue;
      const parts = input.slice(at + "node_modules/".length).split("/");
      const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
      const dir = join(root, input.slice(0, at), "node_modules", name);
      if (!packages.has(dir)) packages.set(dir, describe(dir));
    }
  }
  const list = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const unknown = list.filter((p) => !allowed(p.license));
  if (unknown.length) throw new Error(`Licences to review before bundling: ${unknown.map((p) => `${p.name}@${p.version} (${p.license})`).join(", ")}`);

  const own = JSON.parse(readFileSync(join(outFile, "..", "package.json"), "utf8"));
  const sections = list.map((p) => [
    `## ${p.name} ${p.version}`,
    "",
    `Licence: ${p.license}${p.source ? `. Source: ${p.source}` : ""}`,
    "",
    p.text ? ["```text", p.text.trim(), "```"].join("\n") : `No licence file is included in the package; its licence is ${p.license}.`,
  ].join("\n"));
  const header = [
    "# Third-party notices",
    "",
    `\`${own.name}\` ${own.version} bundles code from the following ${list.length} npm packages. Their licences follow.`,
    "The source code of each package is published on npm under the same name and version.",
  ].join("\n");
  writeFileSync(outFile, `${header}\n\n${sections.join("\n\n")}\n`);
  return list.length;
}

function describe(dir) {
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const file = existsSync(dir) ? readdirSync(dir).find((entry) => LICENCE_FILE.test(entry)) : undefined;
  const text = file ? readFileSync(join(dir, file), "utf8") : null;
  const declared = typeof manifest.license === "string" ? manifest.license : manifest.license?.type ?? manifest.licenses?.map((l) => l.type ?? l).join(" OR ");
  // Some packages (khroma 2.1.0) only state their licence in the licence file.
  const license = declared ?? (text && /^\s*(the )?mit license/i.test(text) ? "MIT" : "UNKNOWN");
  const repository = typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;
  return { name: manifest.name, version: manifest.version, license, source: sourceUrl(repository) ?? manifest.homepage, text };
}

function sourceUrl(repository) {
  if (!repository) return undefined;
  const github = /^(?:github:)?([\w.-]+\/[\w.-]+)$/.exec(repository);
  if (github) return `https://github.com/${github[1]}`;
  return repository.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "");
}

/** True when an SPDX expression allows bundling: any branch of an OR, every part of an AND. */
function allowed(expression) {
  const clean = expression.replace(/[()]/g, " ").trim();
  if (/\sOR\s/i.test(clean)) return clean.split(/\sOR\s/i).some((part) => allowed(part));
  return clean.split(/\sAND\s/i).every((part) => ALLOWED.has(part.trim()));
}
