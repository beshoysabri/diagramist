// The home folder agent setup works in. Tests point it at a temporary folder (design item 123).
import { homedir } from "node:os";

let override: string | undefined;

export const home = (): string => override ?? homedir();

/** For tests: use `dir` as the home folder; call with no argument to go back to the real one. */
export function setHomeForTests(dir?: string): void {
  override = dir;
}

/** A path for messages, with the home folder shown as ~. */
export const displayPath = (path: string): string => (path.startsWith(home()) ? `~${path.slice(home().length)}` : path);
