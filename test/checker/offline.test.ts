// Design item 69: on Linux, the built CLI checks the corpus inside a network namespace with no
// network at all, and must print exactly what a normal run prints. Where unprivileged namespaces
// are blocked (Ubuntu's AppArmor default), the test is skipped and says why.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { builtCli } from "../helpers/checker-paths.js";
import { caseInput, corpus } from "../helpers/corpus.js";

function unavailable(): string | null {
  if (process.platform !== "linux") return "it needs Linux network namespaces";
  const probe = spawnSync("unshare", ["-rn", "true"], { encoding: "utf8" });
  if (probe.status === 0) return null;
  return `unshare -rn is not allowed here (${(probe.stderr || probe.error?.message || "").trim()})`;
}
const skip = unavailable();

describe.skipIf(skip !== null)(`the CLI with no network${skip ? `, skipped: ${skip}` : ""}`, () => {
  const dir = mkdtempSync(join(tmpdir(), "diagramist-offline-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("prints the same results as a normal run", () => {
    const files = corpus.cases
      .filter((c) => c.kind !== "text")
      .map((c) => {
        const name = `${c.id}.${c.kind === "markdown" ? "md" : "mmd"}`;
        writeFileSync(join(dir, name), caseInput(c));
        return name;
      });
    const normal = spawnSync(process.execPath, [builtCli, "check", ...files], { cwd: dir, encoding: "utf8" });
    const offline = spawnSync("unshare", ["-rn", process.execPath, builtCli, "check", ...files], { cwd: dir, encoding: "utf8" });
    expect(offline.stderr).toBe("");
    expect(offline.status).toBe(normal.status);
    expect(offline.stdout).toBe(normal.stdout);
  });
});
