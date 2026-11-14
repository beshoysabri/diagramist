// Design item 65: the file rules in Technical Plan section 6.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readDiagramFile } from "../../src/platform/node/read-file.js";

// The native realpath, like the checker: on Windows it also expands 8.3 short names such as RUNNER~1.
const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "diagramist-read-")));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const file = (name: string, content: string | Buffer) => {
  writeFileSync(join(dir, name), content);
  return join(dir, name);
};

describe("readDiagramFile", () => {
  it("reads each allowed extension, in either case", async () => {
    const cases: Array<[string, "markdown" | "mermaid"]> = [["a.md", "markdown"], ["b.MARKDOWN", "markdown"], ["c.mmd", "mermaid"], ["d.Mermaid", "mermaid"]];
    for (const [name, kind] of cases) {
      const result = await readDiagramFile(file(name, "flowchart LR\n  A --> B\n"));
      expect(result, name).toMatchObject({ ok: true, kind, text: "flowchart LR\n  A --> B\n" });
    }
  });

  it("refuses other extensions without reading them", async () => {
    expect(await readDiagramFile(file("notes.txt", "flowchart LR"))).toMatchObject({ ok: false, status: "unsupported-file" });
  });

  it("resolves a symlink to its real path, and judges the target's extension", async (context) => {
    const target = file("target.mmd", "flowchart LR\n");
    const secret = file("secret.txt", "not a diagram");
    try {
      symlinkSync(target, join(dir, "link.md"));
      symlinkSync(secret, join(dir, "sneaky.md"));
    } catch {
      context.skip(); // creating symlinks needs extra rights on Windows
    }
    expect(await readDiagramFile(join(dir, "link.md"))).toMatchObject({ ok: true, path: target, kind: "mermaid" });
    expect(await readDiagramFile(join(dir, "sneaky.md"))).toMatchObject({ ok: false, status: "unsupported-file", path: secret });
  });

  it("gives not-a-file for a directory", async () => {
    mkdirSync(join(dir, "folder.md"));
    expect(await readDiagramFile(join(dir, "folder.md"))).toMatchObject({ ok: false, status: "not-a-file" });
  });

  it.skipIf(process.platform === "win32")("gives not-a-file for a FIFO, without blocking", async () => {
    execFileSync("mkfifo", [join(dir, "pipe.md")]);
    expect(await readDiagramFile(join(dir, "pipe.md"))).toMatchObject({ ok: false, status: "not-a-file" });
  });

  it("gives too-large for a file over 1 MB", async () => {
    expect(await readDiagramFile(file("big.md", Buffer.alloc(1024 * 1024 + 1, 0x61)))).toMatchObject({ ok: false, status: "too-large" });
    expect(await readDiagramFile(file("exact.md", Buffer.alloc(1024 * 1024, 0x61)))).toMatchObject({ ok: true });
  });

  it("gives not-text for invalid UTF-8", async () => {
    expect(await readDiagramFile(file("latin1.md", Buffer.from([0x66, 0x6c, 0xe9, 0x0a])))).toMatchObject({ ok: false, status: "not-text" });
  });

  it("removes a byte-order mark and normalizes line endings", async () => {
    const result = await readDiagramFile(file("bom.md", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("a\r\nb\rc\n")])));
    expect(result).toMatchObject({ ok: true, text: "a\nb\nc\n" });
  });

  it("gives not-found for a missing file, resolved against the working directory", async () => {
    expect(await readDiagramFile("missing.md", dir)).toMatchObject({ ok: false, status: "not-found", path: join(dir, "missing.md"), message: "No such file." });
  });
});
