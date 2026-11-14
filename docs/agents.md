# Using Diagramist with AI coding agents

How to set up Claude Code, Gemini CLI and Codex to check the Mermaid diagrams they write. Each
step uses the agent's own commands and files, checked against its official documentation on
2026-11-14; the sources are linked per agent. Agents change often, so this page is re-checked
before each release.

**What an agent needs:**

1.  **The `diagramist` command**, installed once.
2.  **The skill:** the file that tells the agent when and how to check, and when to stop and ask
    you. It ships in the npm package, in `skills/diagramist/SKILL.md`, from the first release after
    0.1.1. Until then, take it from [this repository](../skills/diagramist/SKILL.md).
3.  **Permission** for the agent to run `diagramist check` without asking you each time.

An MCP server, `diagramist mcp`, is being evaluated against the plain command. It is described at
the end, for that evaluation only.

## Install Diagramist

You need Node.js 22.12 or later.

```sh
npm install -g diagramist
diagramist --version
diagramist --self-test
```

To copy the skill into an agent's skills folder, find it inside the installed package:

```sh
SKILL_DIR="$(npm root -g)/diagramist/skills/diagramist"
```

## Claude Code

*   **Skill:** copy it to your personal skills folder. Claude Code loads skills there by itself.

    ```sh
    mkdir -p ~/.claude/skills && cp -R "$SKILL_DIR" ~/.claude/skills/
    ```

    A project can carry it in `.claude/skills/diagramist/` instead.
*   **Permission:** add the command to `permissions.allow` in `~/.claude/settings.json` (all
    projects) or `.claude/settings.local.json` (one project):

    ```json
    { "permissions": { "allow": ["Bash(diagramist check *)"] } }
    ```

    On native Windows, where Claude Code may run commands in PowerShell, also add
    `"PowerShell(diagramist check *)"`. A command joined with `&&` or `|` runs without asking only
    if every part of it is allowed.
*   **Sources:** [setup](https://code.claude.com/docs/en/setup),
    [skills](https://code.claude.com/docs/en/skills),
    [permissions](https://code.claude.com/docs/en/permissions),
    [settings](https://code.claude.com/docs/en/settings),
    [MCP](https://code.claude.com/docs/en/mcp).

## Gemini CLI

Since 2026-06-18, Gemini CLI is for Gemini Code Assist Standard and Enterprise. Free and Google AI
Pro or Ultra accounts moved to Antigravity CLI, which Diagramist hasn't been tested with yet
([Gemini CLI README](https://github.com/google-gemini/gemini-cli)).

*   **Install:** `npm install -g @google/gemini-cli`, which needs Node.js 20 or later.
*   **Skill:** copy it to `~/.gemini/skills/`. Skills are on by default, and Gemini CLI asks you
    before it activates one.

    ```sh
    mkdir -p ~/.gemini/skills && cp -R "$SKILL_DIR" ~/.gemini/skills/
    ```

    Gemini CLI also reads `~/.agents/skills/`, the folder Codex uses, and prefers it. If you use
    both agents, one copy there serves both.
*   **Permission:** add the command to `tools.allowed` in `~/.gemini/settings.json`. It matches
    commands that start with `diagramist check`:

    ```json
    { "tools": { "allowed": ["run_shell_command(diagramist check)"] } }
    ```

    The same rule can live in a policy file, such as `~/.gemini/policies/diagramist.toml`:

    ```toml
    [[rule]]
    toolName = "run_shell_command"
    commandPrefix = "diagramist check"
    decision = "allow"
    priority = 100
    ```

    In a folder you haven't trusted, Gemini CLI ignores the project's `.gemini/settings.json`, so
    keep this in your user settings.
*   **Sources:** [installation](https://geminicli.com/docs/get-started/installation),
    [skills](https://geminicli.com/docs/cli/skills),
    [shell tool](https://geminicli.com/docs/tools/shell),
    [policy engine](https://geminicli.com/docs/reference/policy-engine),
    [trusted folders](https://geminicli.com/docs/cli/trusted-folders),
    [MCP](https://geminicli.com/docs/tools/mcp-server).

## Codex

*   **Install:** `curl -fsSL https://chatgpt.com/codex/install.sh | sh` on Linux and macOS, or
    `npm install -g @openai/codex`.
*   **Skill:** copy it to `~/.agents/skills/`. Codex still reads `~/.codex/skills/`, but that folder
    is deprecated.

    ```sh
    mkdir -p ~/.agents/skills && cp -R "$SKILL_DIR" ~/.agents/skills/
    ```

*   **Permission:** in Codex's recommended Auto mode (a `workspace-write` sandbox with `on-request`
    approvals), commands that the sandbox permits run without a prompt. `diagramist check` only
    reads files, so it usually needs nothing more.

    If Codex still asks, add a rule to `~/.codex/rules/default.rules`. Rules are experimental, and
    `allow` runs the command outside the sandbox:

    ```text
    prefix_rule(pattern = ["diagramist", "check"], decision = "allow")
    ```

    Test the rule with
    `codex execpolicy check --rules ~/.codex/rules/default.rules -- diagramist check a.mmd`.
*   **Sources:** [repository](https://github.com/openai/codex),
    [skills](https://learn.chatgpt.com/docs/build-skills),
    [rules](https://learn.chatgpt.com/docs/agent-configuration/rules),
    [approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security),
    [config reference](https://learn.chatgpt.com/docs/config-file/config-reference),
    [MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Troubleshooting

*   **`diagramist: command not found`:** npm's global folder isn't on your `PATH`. Run
    `npm prefix -g` and add its `bin` folder, or `npm prefix -g` itself on Windows, to `PATH`.
*   **Node version managers** (nvm, fnm, Volta): each Node version has its own global packages.
    Install Diagramist under the Node version your agent uses. An agent started outside your shell
    may not see the manager's `PATH`; give it the full path from `command -v diagramist`.
*   **`EACCES` from `npm install -g`:** don't use `sudo`. Use a Node version manager, or give npm a
    global folder you own, as npm's guide
    [Resolving EACCES permissions errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)
    explains.
*   **Windows:** `diagramist` is a `.cmd` file that npm creates, and terminals find it. If an agent
    can't start it as an MCP server, start it through `cmd /c diagramist mcp` instead.
*   **"Node.js 22.12 or later":** check with `node --version`.

## Support

| Tier | Setups |
| --- | --- |
| Supported | Claude Code, Gemini CLI and Codex in a terminal on Linux |
| Best effort | macOS; Windows; the agents' own VS Code panels; Remote-SSH; WSL |
| Unsupported | VS Code for the Web |

## The MCP server (evaluation only)

`diagramist mcp` serves one read-only tool, `check`, over stdio. Its answers are the same text as
`diagramist check`. Whether it ships in v1 depends on the agent evaluation (design decision D7),
so treat these steps as provisional.

| Agent | Register | Pre-approve the tool |
| --- | --- | --- |
| Claude Code | `claude mcp add --scope user --transport stdio diagramist -- diagramist mcp` | Add `"mcp__diagramist__check"` to `permissions.allow` |
| Gemini CLI | `gemini mcp add -s user diagramist diagramist mcp` | A policy rule with `mcpName = "diagramist"`, `toolName = "check"`, `decision = "allow"` |
| Codex | `codex mcp add diagramist -- diagramist mcp` | In `~/.codex/config.toml`, `[mcp_servers.diagramist.tools.check]` with `approval_mode = "approve"` |

Gemini CLI writes project settings unless you pass `-s user`. Gemini CLI doesn't connect MCP servers
in folders you haven't trusted.
