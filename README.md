# Diagramist

Diagramist, in design, lets AI coding agents (Claude Code, Gemini CLI, Codex) check, preview and
export the Mermaid diagrams they write. It checks each diagram with both
[Mermaid.js](https://mermaid.js.org), which GitHub, Notion and documentation sites use, and
[Pele](https://pele.run), Obsidian's fast Mermaid renderer. It runs locally and calls no AI model:
your agent writes the diagram, and Diagramist reports the first error with its location in the file.
VS Code shows the same errors and a live preview.

**Status:** design phase. The design is being worked through with Google's
[Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model) (brainstorm, draft,
review) before any code is written. Design documents live under `docs/egm/` on the `egm-design`
branch until they are merged.

Unofficial. Not affiliated with Obsidian, the Mermaid project or Microsoft.

## Licence

MIT. See [LICENSE](LICENSE).
