# Diagramist

Checks the Mermaid diagrams in your Markdown and `.mmd` files, so that AI coding agents (Claude Code,
Gemini CLI, Codex) and CI can fix broken diagrams before anyone sees them. Each diagram is checked
twice:

*   with [Mermaid.js](https://mermaid.js.org) 12.3.0, which GitHub, Notion and most documentation
    sites use;
*   with [Pele](https://pele.run) 1.13.0, Obsidian's Mermaid renderer.

Each problem comes back as one line with its position in your file, the lines around it, and a short
hint. Everything runs on your machine, with no network and no AI model.

**Status:** preview (0.1). This is the command-line checker and its agent skill. The VS Code
extension, with a live preview and one-click agent setup, is coming; see the
[repository](https://github.com/beshoysabri/diagramist).

## Install

You need Node.js 22.12 or later.

```sh
npm install -g diagramist
```

## Use

```sh
diagramist check README.md docs/
```

```text
README.md: 2 diagrams, 1 error, 1 warning [Mermaid.js 12.3.0 parse, Pele 1.13.0 render]
README.md:5:16: error [Mermaid.js parse] Expecting "]", ")))", ")", "-)", "])", …, got end of diagram
  diagram text (untrusted):
  4 | flowchart LR
  5 |   A[Start --> B
README.md:5:16: warning [Pele syntax] Expecting "]", text, "<", got end of diagram
  diagram text (untrusted):
  4 | flowchart LR
  5 |   A[Start --> B
  hint: Pele can't draw this; change the diagram only if you'll export it with Pele.
```

*   **Files:** `.md`, `.markdown`, `.mmd` and `.mermaid`. Folders are searched for those files,
    skipping `node_modules` and hidden folders.
*   **`--json`:** prints one JSON result per file.
*   **`--verbose`:** also lists the diagrams that pass.
*   **`diagramist --self-test`:** checks one sample of every diagram type.
*   **Exit codes:** 0 when there are no errors, 1 when a diagram has an error, 2 for a file or tool
    problem. Warnings never change the exit code.

**Which renderer decides.** By default a Mermaid.js failure is an error and a Pele failure is a
warning. To change that for one diagram, put a comment on its first line, or on the line after the
diagram type:

```text
%% diagramist: targets=mermaid,pele
```

The values are `mermaid`, `pele`, `mermaid,pele`, and `none`.

**For AI agents.** The package includes a skill, `skills/diagramist/SKILL.md`, that teaches Claude
Code, Gemini CLI and Codex when and how to check, and when to stop and ask you. The
[agent guide](https://github.com/beshoysabri/diagramist/blob/main/docs/agents.md) shows where each
agent keeps skills, and how to let it run `diagramist check` without asking every time.

## Privacy and safety

*   **No network:** nothing leaves your machine. There is no telemetry, and no AI model is called.
*   **Files it reads:** only `.md`, `.markdown`, `.mmd` and `.mermaid` regular files, up to 1 MB of
    UTF-8 text.
*   **Diagrams:** they are parsed and laid out, never run. Images are never loaded.
*   **Output:** diagram text in the results is marked as untrusted.

## Licence

MIT. Diagramist bundles Mermaid.js, Pele, linkedom and their dependencies; their licences are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Unofficial. Not affiliated with Obsidian, the Mermaid project or Microsoft.
