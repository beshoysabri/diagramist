// The agents Diagramist sets up (design item 118), with each one's own commands and folders, checked
// against the agents' documentation on 2026-11-14 (sources in docs/agents.md). Plain data and pure
// helpers, with no VS Code imports, so tests can use them directly.
import { join } from "node:path";

export type AgentId = "claude" | "gemini" | "antigravity" | "codex";

export interface Agent {
  id: AgentId;
  name: string;
  /** The agent's own command, for `--version`. */
  cli: string;
  /** Where the agent reads personal skills, relative to the home folder (D8). */
  skillsDir: string;
  /** Other agents' skill folders this agent also reads; a copy there serves it too. */
  alsoReads: AgentId[];
  /** How to let it run `diagramist check` without asking (docs/agents.md). */
  permission: { file: string; rule: string };
  /** MCP registration, used only if D7 lets the MCP server ship. Argument lists, without a shell. */
  mcp: { add: string[] | null; remove: string[] | null; list: string[] | null; config?: string };
  checked: string;
}

export const AGENTS: readonly Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    cli: "claude",
    skillsDir: ".claude/skills",
    alsoReads: [],
    permission: { file: "~/.claude/settings.json", rule: '{ "permissions": { "allow": ["Bash(diagramist check *)"] } }' },
    mcp: {
      add: ["claude", "mcp", "add", "--scope", "user", "--transport", "stdio", "diagramist", "--", "diagramist", "mcp"],
      remove: ["claude", "mcp", "remove", "--scope", "user", "diagramist"],
      list: ["claude", "mcp", "list"],
    },
    checked: "2026-11-14",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    cli: "gemini",
    skillsDir: ".gemini/skills",
    alsoReads: ["codex"],
    permission: { file: "~/.gemini/settings.json", rule: '{ "tools": { "allowed": ["run_shell_command(diagramist check)"] } }' },
    mcp: {
      add: ["gemini", "mcp", "add", "-s", "user", "diagramist", "diagramist", "mcp"],
      remove: ["gemini", "mcp", "remove", "-s", "user", "diagramist"],
      list: ["gemini", "mcp", "list"],
    },
    checked: "2026-11-14",
  },
  {
    id: "antigravity",
    name: "Antigravity CLI",
    cli: "agy",
    skillsDir: ".gemini/config/skills",
    alsoReads: ["gemini"],
    permission: { file: "~/.gemini/antigravity-cli/settings.json", rule: '{ "permissions": { "allow": ["command(diagramist check)"] } }' },
    // `agy mcp add` exists, but its argument order isn't documented; the config file is.
    mcp: { add: null, remove: null, list: null, config: "~/.gemini/config/mcp_config.json" },
    checked: "2026-11-14",
  },
  {
    id: "codex",
    name: "Codex",
    cli: "codex",
    skillsDir: ".agents/skills",
    alsoReads: [],
    permission: { file: "~/.codex/rules/default.rules", rule: 'prefix_rule(pattern = ["diagramist", "check"], decision = "allow")' },
    mcp: {
      add: ["codex", "mcp", "add", "diagramist", "--", "diagramist", "mcp"],
      remove: ["codex", "mcp", "remove", "diagramist"],
      list: ["codex", "mcp", "list"],
    },
    checked: "2026-11-14",
  },
];

export const agentById = (id: string): Agent | undefined => AGENTS.find((agent) => agent.id === id);

/** The folder Diagramist's skill goes in for one agent. */
export const skillFolder = (home: string, agent: Agent): string => join(home, agent.skillsDir, "diagramist");

/**
 * A command line for a visible terminal. On Windows, npm's commands are .cmd files, so it goes
 * through `cmd /c` (design item 118).
 */
export function commandLine(argv: readonly string[], platform: NodeJS.Platform): string {
  const quote = (part: string) => (/^[\w@./:=-]+$/.test(part) ? part : platform === "win32" ? `"${part.replace(/"/g, '""')}"` : `'${part.replace(/'/g, `'\\''`)}'`);
  const line = argv.map(quote).join(" ");
  return platform === "win32" ? `cmd /c ${line}` : line;
}

/** The version in a SKILL.md's `metadata.diagramistVersion`, or null. */
export function skillVersion(text: string): string | null {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  if (!/^name:\s*diagramist\s*$/m.test(frontmatter)) return null;
  return /^\s+diagramistVersion:\s*"?([^"\s]+)"?\s*$/m.exec(frontmatter)?.[1] ?? null;
}

/** Compares dotted versions numerically; a pre-release ("0.1.0-dev") sorts before its release. */
export function compareVersions(a: string, b: string): number {
  const [coreA = "", preA] = a.split("-", 2);
  const [coreB = "", preB] = b.split("-", 2);
  const partsA = coreA.split(".").map(Number);
  const partsB = coreB.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  if (preA && !preB) return -1;
  if (!preA && preB) return 1;
  return 0;
}
