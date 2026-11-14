# Diagramist

Diagramist checks Mermaid diagrams, so that broken ones get fixed before anyone sees them. AI coding
agents (Claude Code, Gemini CLI, Antigravity CLI and Codex) run it after they write a diagram; VS
Code shows the same errors, a live preview, and exports for slides and documents.

Each diagram is checked twice:

*   with [Mermaid.js](https://mermaid.js.org), which GitHub, Notion and most documentation sites use;
*   with [Pele](https://pele.run), Obsidian's Mermaid renderer.

Everything runs on your machine. Diagramist makes no network requests and calls no AI model.

**Status:** preview (0.1). The command-line checker is on npm; the VS Code extension is ready to
publish.

## What a pass means

*   **Mermaid.js:** a pass means Mermaid.js parsed the diagram: the syntax is right, at the version
    Diagramist bundles (12.3.0). A site running an older Mermaid.js may not know newer diagram types,
    and Mermaid.js can still fail while drawing: a Gantt task dated `2026-13-45` parses, but doesn't
    draw.
*   **Pele:** a pass means Pele drew the diagram.
*   **Which one decides:** by default a Mermaid.js failure is an **error** and a Pele failure is a
    **warning**. To change that for one diagram, put a comment on its first line, or on the line
    after the diagram type:

    ```text
    %% diagramist: targets=mermaid,pele
    ```

    The values are `mermaid` (the default), `pele`, `mermaid,pele` (both must pass) and `none`
    (report only).

## Install

*   **For agents and CI:** Node.js 22.12 or later, then:

    ```sh
    npm install -g diagramist
    ```

*   **In VS Code (1.101 or later):** install "Diagramist" from the Marketplace (or Open VSX), then
    run **Diagramist: Connect AI Agent** to set up an agent. It installs the command too if needed.

## Use it with an AI agent

The agent needs the `diagramist` command, the Diagramist skill, and permission to run the check
without asking each time.

*   **In VS Code:** **Diagramist: Connect AI Agent** does the first two, and offers to copy the
    permission rule for the third.
*   **Without VS Code:** [docs/agents.md](docs/agents.md) gives each agent's skill folder and
    permission rule.

The skill tells the agent to check after every diagram edit, to fix errors until the check passes,
and to stop and ask you after three failures on the same error.

## The command line

```sh
diagramist check README.md docs/      # files and folders
diagramist check docs/ --json         # one JSON result per file
diagramist --self-test                # one sample of every diagram type
```

*   **Files:** `.md`, `.markdown`, `.mmd` and `.mermaid`. Folders skip `node_modules` and hidden
    folders.
*   **Output:** each problem is one line, with its position in the file, the renderer and an error
    code, followed by the diagram lines around it and often a hint.
*   **Exit codes:** 0 when there are no errors, 1 when a diagram has an error, 2 for a file or tool
    problem.
*   **In CI:** [docs/ci.md](docs/ci.md) has a pre-commit hook and a GitHub Actions job.

## In VS Code

*   **Problems panel:** errors for saved diagram files, labelled "Diagramist (Mermaid.js)" or
    "Diagramist (Pele)", at the same positions the agents get.
*   **Preview:** the button in the editor title bar, or **Diagramist: Open Preview to the Side**. It
    follows the active editor (**Toggle Preview Lock** keeps it on one file) and switches between
    Mermaid.js and Pele. Pele drawings use your theme's colours.
*   **Export:** **Diagramist: Export Diagram…** saves one diagram as SVG or PNG:
    *   **Renderer:** Mermaid.js or Pele.
    *   **Colours:** light, dark, or your current theme.
    *   **PNG scale:** 1× to 4×.

    Exported files carry literal colours and a common font list, so they look the same in slides and
    documents. If Pele can't draw a diagram, the export offers Mermaid.js instead.
*   **Diagnostics:** **Diagramist: Check Agent Setup** shows each agent's version and skill copy.
    **Diagramist: Copy Diagnostic Report** copies the details for a bug report, without file paths
    unless you include them.

The settings are `diagramist.diagnostics.enabled` (default `true`) and
`diagramist.preview.defaultRenderer` (`mermaid` or `pele`).

## Privacy

*   **No network:** nothing leaves your machine. There is no telemetry, and no AI model is called.
*   **Diagrams:** they are parsed and drawn locally and never run. Images in them are never loaded.
*   **Links:** links in diagrams open only after you confirm.
*   **Files read:** only `.md`, `.markdown`, `.mmd` and `.mermaid` files, up to 1 MB of UTF-8 text.
*   **Untrusted folders:** in Restricted Mode, agent setup is off.

## Troubleshooting

*   **`diagramist: command not found`:** npm's global folder isn't on your `PATH`; see
    [docs/agents.md](docs/agents.md#troubleshooting).
*   **The editor and the agent disagree:** they need the same version. Check with
    `diagramist --version` and **Diagramist: Check Agent Setup**.
*   **Mermaid.js passes but GitHub shows an error:** GitHub may run an older Mermaid.js, or the
    diagram fails while drawing. The preview draws it with Mermaid.js, so look there.
*   **A renderer gets a valid diagram wrong:** report it to that renderer,
    [Mermaid.js](https://github.com/mermaid-js/mermaid/issues) or
    [Pele](https://github.com/obsidianmd/pele/issues). Problems with Diagramist itself go to
    [this repository](https://github.com/beshoysabri/diagramist/issues).

## More

*   [CHANGELOG.md](CHANGELOG.md)
*   [CONTRIBUTING.md](CONTRIBUTING.md): how the code is laid out, and how to test and release it
*   [SECURITY.md](SECURITY.md)
*   [docs/designs/diagramist.md](docs/designs/diagramist.md): the design

Unofficial. Not affiliated with Obsidian, the Mermaid project or Microsoft.

## Licence

MIT. See [LICENSE](LICENSE).
