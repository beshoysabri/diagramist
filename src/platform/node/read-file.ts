// Reads one diagram file under the rules in Technical Plan section 6: only regular files ending in
// .md, .markdown, .mmd or .mermaid (any case) after resolving the real path, at most 1 MB, and valid
// UTF-8. The content of anything else is never read.
import { constants } from "node:fs";
import { open, realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileKind, normalizeText } from "../../core/blocks/find-blocks.js";
import type { FileKind } from "../../core/blocks/find-blocks.js";
import { LIMITS } from "../../core/policy/policy.js";
import type { FileStatus } from "../../core/result/schema.js";

export type ReadFailure = Exclude<FileStatus, "checked" | "no-diagrams" | "bad-input">;

export type ReadResult =
  | { ok: true; path: string; kind: FileKind; text: string }
  | { ok: false; path: string; status: ReadFailure; message: string };

const ALLOWED = ".md, .markdown, .mmd and .mermaid";

export async function readDiagramFile(path: string, cwd: string = process.cwd()): Promise<ReadResult> {
  const absolute = resolve(cwd, path);
  let real: string;
  try {
    real = await realpath(absolute);
  } catch (error) {
    return { ok: false, path: absolute, status: "not-found", message: reason(error) };
  }
  const kind = fileKind(real);
  if (!kind) {
    return { ok: false, path: real, status: "unsupported-file", message: `Only ${ALLOWED} files are checked.` };
  }
  try {
    if (!(await stat(real)).isFile()) return notAFile(real);
    // O_NONBLOCK keeps a FIFO swapped in after stat() from blocking the open; fstat then re-checks.
    const handle = await open(real, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    try {
      const info = await handle.stat();
      if (!info.isFile()) return notAFile(real);
      if (info.size > LIMITS.fileBytes) return tooLarge(real);
      // One byte more than the limit, in case the file grew after fstat().
      const buffer = Buffer.alloc(Math.min(info.size, LIMITS.fileBytes) + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > LIMITS.fileBytes) return tooLarge(real);
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length));
      } catch {
        return { ok: false, path: real, status: "not-text", message: "The file is not valid UTF-8 text." };
      }
      return { ok: true, path: real, kind, text: normalizeText(text) };
    } finally {
      await handle.close();
    }
  } catch (error) {
    return { ok: false, path: real, status: "not-found", message: reason(error) };
  }
}

function notAFile(path: string): ReadResult {
  return { ok: false, path, status: "not-a-file", message: "Not a regular file." };
}

function tooLarge(path: string): ReadResult {
  return { ok: false, path, status: "too-large", message: `The file is larger than ${LIMITS.fileBytes / 1024 / 1024} MB.` };
}

function reason(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT" || code === "ENOTDIR") return "No such file.";
  if (code === "EACCES" || code === "EPERM") return "Permission denied.";
  return `Cannot read the file (${code ?? "unknown error"}).`;
}
