# Diagramist: Mermaid diagrams checked with Mermaid.js and Pele

Diagramist finds broken Mermaid diagrams in your Markdown and `.mmd` files, shows a live preview, and
exports diagrams for slides and documents. Each diagram is checked twice:

*   with [Mermaid.js](https://mermaid.js.org) 12.3.0, which GitHub, Notion and most documentation
    sites use;
*   with [Pele](https://pele.run) 1.13.0, Obsidian's Mermaid renderer.

It is built for working with AI coding agents (Claude Code, Gemini CLI, Antigravity CLI and Codex).
They check their diagrams with the same checker, the
[`diagramist`](https://www.npmjs.com/package/diagramist) command, so the editor and the agents see the
same errors at the same places.

**Status:** preview (0.1).

## Errors in the Problems panel

*   **When:** files are checked when they open, when you save, and when they change on disk, for
    example after an agent edits them. Unsaved edits don't count, because agents see the saved file.
*   **What you see:** each problem names its renderer ("Diagramist (Mermaid.js)" or "Diagramist
    (Pele)"), the error code, the place in the file, and a hint.
*   **Which renderer decides:** by default a Mermaid.js failure is an error and a Pele failure is a
    warning. Put `%% diagramist: targets=mermaid,pele` on a diagram's first line to require both, or
    `targets=pele` or `targets=none`.

## Preview

*   **Opening:** the preview button in the editor title bar, or **Diagramist: Open Preview to the
    Side**. It shows every diagram in the file, follows the active editor (**Toggle Preview Lock**
    keeps it on one file), redraws as you type, and never takes focus.
*   **Renderer:** switch between Mermaid.js, which looks like GitHub, and Pele, which follows your
    theme's colours.
*   **Errors:** a diagram with an error keeps its last good drawing, dimmed, under the message.
*   **Safety:** links open only after you confirm, and images are never loaded.

## Export

**Diagramist: Export Diagram…** saves one diagram as SVG or PNG:

*   **Renderer:** Mermaid.js or Pele.
*   **Colours:** light, dark, or your current theme.
*   **PNG scale:** 1× to 4×.

Exported files carry literal colours and a common font list, so they look the same in slides and
documents. If Pele can't draw a diagram, the export offers Mermaid.js instead.

## AI agents

**Diagramist: Connect AI Agent** sets up Claude Code, Gemini CLI, Antigravity CLI or Codex:

1.  **The command:** if the `diagramist` command is missing, it offers to install it in a terminal
    you can watch.
2.  **The skill:** it copies Diagramist's skill into that agent's skill folder. The skill tells the
    agent to check after every diagram edit, and to stop and ask you after three failures on the
    same error.
3.  **Permission:** it tells you how to let the agent run the check without asking.

**Diagramist: Check Agent Setup** shows what is installed. **Diagramist: Disconnect AI Agent**
removes the skill again. The [agent guide](https://github.com/beshoysabri/diagramist/blob/main/docs/agents.md)
has the details for each agent.

## Settings

| Setting | Default | |
| --- | --- | --- |
| `diagramist.diagnostics.enabled` | `true` | Show the checker's errors in the Problems panel |
| `diagramist.preview.defaultRenderer` | `mermaid` | The renderer the preview starts with |

## Privacy

*   **No network:** Diagramist makes no network requests, collects no telemetry and calls no AI
    model. **Diagramist: Copy Diagnostic Report** puts details for a bug report on your clipboard,
    and only when you ask.
*   **Restricted Mode:** in an untrusted folder, agent setup is off.

Requires VS Code 1.101 or later.

Unofficial. Not affiliated with Obsidian, the Mermaid project or Microsoft.
