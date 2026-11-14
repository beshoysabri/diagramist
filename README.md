# Diagramist

Diagramist lets AI coding agents (Claude Code, Gemini CLI, Antigravity CLI, Codex) check the
Mermaid diagrams they write, so broken diagrams get fixed before anyone sees them. It checks each
diagram with both [Mermaid.js](https://mermaid.js.org), which GitHub, Notion and documentation sites
use, and [Pele](https://pele.run), Obsidian's Mermaid renderer. It runs locally and calls no AI
model: your agent writes the diagram, and Diagramist reports each error with its place in the file
and a hint.

**Status:**

*   **Available now:** the command-line checker, as a preview on npm.
*   **In progress:** a VS Code extension with a live preview, Problems-panel errors, SVG and PNG
    export, and one-click agent setup.

## Try it

You need Node.js 22.12 or later.

```sh
npm install -g diagramist
diagramist check README.md docs/
```

*   **The command:** [`packages/diagramist/README.md`](packages/diagramist/README.md) describes it.
*   **Agents:** [`docs/agents.md`](docs/agents.md) shows how to set up each agent: where its skill
    goes, and how to let it run the check without asking every time.

## Repository

| Path | Contents |
| --- | --- |
| `src/core/` | Finding diagrams, both renderers' checks, positions, hints and the result format |
| `src/platform/node/` | The check worker, the worker pool, file reading and the coordinator |
| `src/features/checker/` | The `diagramist` command and its MCP server |
| `skills/diagramist/` | The agent skill |
| `docs/designs/` | The design ([`diagramist.md`](docs/designs/diagramist.md)) and the packaging notes |
| `test/` | Unit tests, the test corpus, CLI tests, and the agent evaluation set |

The design was worked through with Google's
[Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model) before any code was
written. Its review records are in `docs/egm/`.

Unofficial. Not affiliated with Obsidian, the Mermaid project or Microsoft.

## Licence

MIT. See [LICENSE](LICENSE).
