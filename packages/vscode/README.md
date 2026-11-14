# Diagramist: Mermaid diagrams checked with Mermaid.js and Pele

Diagramist shows broken Mermaid diagrams in VS Code's Problems panel, as soon as you save. Each
diagram in your `.md`, `.markdown`, `.mmd` and `.mermaid` files is checked twice:

*   with [Mermaid.js](https://mermaid.js.org) 12.3.0, which GitHub, Notion and most documentation
    sites use;
*   with [Pele](https://pele.run) 1.13.0, Obsidian's Mermaid renderer.

It is built for working with AI coding agents (Claude Code, Gemini CLI, Antigravity CLI and Codex).
The agents check with the [`diagramist`](https://www.npmjs.com/package/diagramist) command, and the
editor shows the same errors at the same places.

**Status:** preview. It shows errors today. The live preview, SVG and PNG export, and one-click agent
setup come in the next previews.

## Errors in the Problems panel

*   **When:** files are checked when they open, when you save, and when they change on disk, for
    example after an agent edits them. Unsaved edits don't count, because agents see the saved file.
*   **What you see:** each problem names its renderer ("Diagramist (Mermaid.js)" or "Diagramist
    (Pele)"), the error code, the place in the file, and a hint.
*   **Which renderer decides:** by default a Mermaid.js failure is an error and a Pele failure is a
    warning. Put `%% diagramist: targets=mermaid,pele` on a diagram's first line to require both.

## Settings

| Setting | Default | |
| --- | --- | --- |
| `diagramist.diagnostics.enabled` | `true` | Show the checker's errors in the Problems panel |
| `diagramist.preview.defaultRenderer` | `mermaid` | The renderer the preview starts with |

## Privacy

*   **No network:** Diagramist makes no network requests, collects no telemetry and calls no AI
    model.
*   **Diagrams:** they are parsed and laid out locally, never run, and images in them are never
    loaded.
*   **Restricted Mode:** in an untrusted folder, agent setup is off.

Requires VS Code 1.101 or later.

Unofficial. Not affiliated with Obsidian, the Mermaid project or Microsoft.
