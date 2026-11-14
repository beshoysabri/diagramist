// Runs `<command> --version` with a time limit. npm's commands on Windows are .cmd files, which need a
// shell; a missing command is ENOENT, or "is not recognized" through cmd.exe.
import { execFile } from "node:child_process";

export type CommandOutcome = { ok: true; stdout: string } | { ok: false; missing: boolean };

export function runVersion(command: string, timeoutMs: number): Promise<CommandOutcome> {
  return new Promise((done) => {
    execFile(command, ["--version"], { timeout: timeoutMs, shell: process.platform === "win32", windowsHide: true }, (error, stdout, stderr) => {
      if (!error) return done({ ok: true, stdout: String(stdout) });
      done({ ok: false, missing: (error as NodeJS.ErrnoException).code === "ENOENT" || /not recognized|not found/i.test(String(stderr)) });
    });
  });
}

/** The first version-like word of a `--version` output. */
export const versionIn = (output: string): string | null => /(\d+\.\d+\.\d+[\w.-]*)/.exec(output)?.[1] ?? null;
