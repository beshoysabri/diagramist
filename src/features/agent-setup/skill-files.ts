// Reading, copying and removing the skill in an agent's folder.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Agent } from "./agents.js";
import { skillFolder, skillVersion } from "./agents.js";
import { home } from "./home.js";

/** The skill installed for an agent: its folder and version, or null if there is none. */
export async function installedSkill(agent: Agent): Promise<{ folder: string; version: string | null } | null> {
  const folder = skillFolder(home(), agent);
  try {
    return { folder, version: skillVersion(await readFile(join(folder, "SKILL.md"), "utf8")) };
  } catch {
    return null;
  }
}

export async function writeSkill(agent: Agent, text: string): Promise<string> {
  const folder = skillFolder(home(), agent);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "SKILL.md"), text);
  return folder;
}

/** Deletes the agent's Diagramist skill folder, and nothing else. */
export async function removeSkill(agent: Agent): Promise<string> {
  const folder = skillFolder(home(), agent);
  await rm(folder, { recursive: true, force: true });
  return folder;
}
