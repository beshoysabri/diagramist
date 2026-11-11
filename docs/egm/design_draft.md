# Diagramist

*   **Author:** Beshoy Sabri
*   **Status:** Draft
*   **Date:** 2026-11-11
*   **Input:** [concepts_brief.md](concepts_brief.md), including its "Decisions after the review"

--------------------------------------------------------------------------------

## Overview

Diagramist helps AI coding agents write Mermaid diagrams that render where they will be used, and
lets the person see and export those diagrams in VS Code. It has three parts that share one core:

1. **Checker.** A small local program that agents start themselves as an MCP server over standard
   input and output (stdio). It may also ship as a command-line tool (open question 7). Given a file,
   it finds every Mermaid diagram in it and checks each one with Mermaid.js (syntax) and Pele (full
   render). For each diagram and each renderer it returns either "OK" or the first error, with the
   error's line and column in the file when the renderer gives one. It needs no VS Code, network,
   account or AI model.
2. **VS Code extension.** It previews diagrams with Pele or Mermaid.js in VS Code's colours and shows
   the same errors in the Problems panel. It exports SVG and PNG for slides and documents, and helps
   connect Claude Code, Gemini CLI and Codex to the checker.
3. **Core.** Shared code with no dependency on VS Code. It holds:
   * finding diagrams in files and mapping positions;
   * one adapter per renderer, which is the only code that imports `mermaid` or `pele`;
   * the result format;
   * the render and security settings;
   * the theme map.

   Both the checker and the extension use the core, so they give the same verdict.

Diagramist calls no AI model. The person's agent writes the diagrams; Diagramist checks, shows and
exports them.

## The Problem

People ask AI coding agents (Claude Code, Gemini CLI, Codex) to draw diagrams as Mermaid text:
architecture sketches in READMEs, flows in documentation, figures for slides. Three things go wrong.

1. **Agents can't see whether a diagram renders.** They write Mermaid from memory, and small slips
   are common: an unclosed bracket, a reserved word, or a newer diagram type the destination doesn't
   support. The agent reports the work as done, and the person finds the problem later:
   * GitHub shows a render error after a push;
   * Notion shows raw code;
   * an exported slide image comes out broken.
2. **The fix loop is manual.** Today the person copies errors from a preview, or from an online
   editor, back into the agent's chat, often several times. Online checkers send the diagram to a
   website, which some workplaces don't allow. Agent-side tools that exist today mostly need a
   headless browser, one specific renderer, or an online service.
3. **Renderers disagree.** GitHub, Notion and documentation sites draw Mermaid with Mermaid.js, each
   with its own version. Pele, Obsidian's renderer, is fast, small and themeable, which suits exported
   images. But its layout differs, and it accepts or rejects some input differently. A test on
   2026-11-11 showed a Sankey value of `abc` passing Mermaid.js and failing Pele. A single "valid"
   verdict hides this.

What exists today (checked 2026-11-11):

* **Preview extensions.** VS Code has Mermaid preview extensions, from the official Mermaid Chart
  extension (Mermaid.js, about 1.18 million installs) to three small Pele-based previews. They show
  diagrams to people, but none offers agents a check they can call.
* **Agent and command-line tools.** npm has two Pele command-line tools and several Mermaid MCP servers
  built on Mermaid.js or other renderers. None of them does all three of:
  * check against both renderers;
  * map errors to positions in the real file;
  * tie into the editor's Problems panel and preview.

## Goals

1. **Agents can check a file without VS Code.** One tool call, given only a path, checks every
   Mermaid diagram in a file, with VS Code closed. For each diagram and renderer the result gives OK,
   or the first error with:
   * the renderer and its version;
   * the error class: invalid diagram, not supported by this renderer, too large, or tool problem;
   * the renderer's error code;
   * the file line and column, when the renderer provides them;
   * a short snippet;
   * a hint.

   *Measure:* a passing file costs under 100 tokens of tool output, and a failing diagram under 1,000
   tokens by default.
2. **Two renderers, one result format.** Every diagram is checked by Mermaid.js (syntax) and by Pele
   (full render). Both versions are pinned and named in every result. The user decides which
   renderers must pass (the "targets"): for example, Mermaid.js for a README that GitHub draws, and
   Pele for a slide image Diagramist exports. A failure in a renderer that isn't a target is a
   warning, not an error.
3. **Tested with three agents.** Setup and the check-and-fix loop are tested and documented for Claude
   Code, Gemini CLI and Codex run from a terminal, including VS Code's integrated terminal. Their own
   VS Code panels are covered where they share the terminal's settings (to verify).

   *Measures:*
   * Connecting one agent takes one command and under two minutes.
   * Before each release, a hand-run test uses a fixed set of at least 30 diagrams with planted
     errors. Each agent must reach a passing diagram within three checks in at least 90% of cases.
4. **Live preview in VS Code.** `.mmd` and `.mermaid` files, and ```` ```mermaid ```` fences in
   Markdown, preview with either renderer in VS Code's theme colours. The preview:
   * updates as you type and when files change on disk;
   * keeps the diagram's written direction;
   * never takes focus when an agent changes a file.

   *Measure:* a Pele preview updates within 300 ms after typing stops, and a Mermaid.js preview
   within 1 second.
5. **Same errors in the editor.** The Problems panel shows the same errors the agent gets, labelled by
   renderer, at the same file positions.
6. **Export for slides and documents.** The user can export a diagram as SVG or PNG and choose:
   * the renderer;
   * the theme: light, dark, or VS Code's current theme;
   * for PNG, the scale.

   Exported files stand on their own: they carry real colours and a fixed font, not VS Code's theme
   colours.
7. **Local and private.** No part of Diagramist makes network requests or calls an AI model.
   Mermaid.js and Pele ship inside Diagramist at pinned versions. Remote images in diagrams are blocked
   by default.

   *Measure:* the test suite passes with networking blocked.
8. **Feature-based code on a shared core.** Code is organized by feature on top of a shared core that
   does not depend on VS Code. Import rules are checked in CI.

## Non-Goals

These are for v1.

*   **Writing diagrams.** There is no prompt box and no AI call. The user's agent writes the diagrams;
    Diagramist checks, shows and exports them.
*   **Matching GitHub's or Notion's exact Mermaid.js version.** Diagramist pins one Mermaid.js version
    and names it in every result.
*   **Drawing with Mermaid.js outside VS Code.** Mermaid.js needs a browser to lay out a diagram. The
    agent's checker checks Mermaid.js syntax but draws only with Pele; Mermaid.js drawings come from
    VS Code's preview pane.
*   **Images for agents to look at.** Results are text. Showing agents rendered images is a possible
    later feature.
*   **Math, icon packs, a Mermaid grammar, auto-completion, Obsidian internal links.**
*   **VS Code for the Web** (vscode.dev, github.dev).
*   **Other diagram languages**, such as PlantUML, D2 and Graphviz.
*   **A local web server, routing between VS Code windows, or agents controlling the preview.**
*   **Changing agents' settings or instruction files without asking.**
*   **Any backend.** Telemetry is open question 6.

## Open Questions

*   **Question 1 (launch):** how do agents start the checker? Options are a published npm package, a
    stable launcher kept in the extension's storage, or both.
*   **Question 2 (preview surface):** Diagramist's own preview panel, VS Code's built-in Markdown
    preview, or both?
*   **Question 3 (targets):** how does a file say which renderers must pass? Options are a workspace
    setting, a comment in the diagram, a guess from context (for example, a GitHub repository), or a
    mix.
*   **Question 4 (Mermaid.js version):** pin the newest 12.x, or match GitHub's current version?
*   **Question 5 (PNG export location):** only from VS Code's preview pane, or also from the agent's
    checker? The checker could export Pele drawings only, and would need a WebAssembly image converter
    and a bundled font.
*   **Question 6 (telemetry):** none, or opt-in with no diagram content?
*   **Question 7 (CLI):** should v1 ship the command-line checker with linter-style output? It would
    serve any agent with a shell, pre-commit hooks and CI.
*   **Question 8 (agent guidance):** where do the instructions for agents live? Options are tool
    descriptions only, one shared `SKILL.md` (Claude Code, Codex and Gemini CLI all read the format),
    or per-agent packages.

Unknowns to verify while drafting:

*   **Diagnostics:** does Claude Code's VS Code integration pass VS Code diagnostics to the model? Do
    Gemini CLI's and Codex's?
*   **Agent setup:** the exact `mcp add` commands, scopes and tool pre-approval settings for Gemini CLI
    and Codex.
*   **Agent limits:** each agent's size limit on tool output, and its support for structured results.
*   **Runtime:** can VS Code's own runtime run the checker on machines without Node
    (`ELECTRON_RUN_AS_NODE=1`)?
*   **Browser stand-in:** Mermaid.js in Node works with jsdom. Lighter stand-ins and their sizes are
    untested.
*   **Preview conflicts:** what happens in VS Code's built-in Markdown preview when two extensions
    render the same Mermaid fence?

## Critical User Journeys (CUJs)

### CUJ 1: Claude Code fixes a README diagram before the user sees it

*   **Given**: Diagramist is installed in VS Code and connected to Claude Code. The README targets
    Mermaid.js.
*   **When**: The user asks Claude Code to add an architecture diagram to `README.md`.
*   **Then**:
    *   Claude Code writes the fence and calls the check.
    *   The result reports "Mermaid.js: syntax error at README.md line 42, column 15", with a snippet
        and a hint.
    *   Claude Code fixes the line, checks again, and gets OK from both renderers.
    *   The preview beside the README updates, and the Problems panel shows no Diagramist entries.

### CUJ 2: Gemini CLI checks a diagram with VS Code closed

*   **Given**: Gemini CLI runs in a terminal, VS Code is not running, and the checker is connected at
    user scope.
*   **When**: The user asks Gemini to draw a sequence diagram in `docs/login.mmd`.
*   **Then**: Gemini calls the check by path, fixes the diagram until it passes, and reports the result.
    No network request is made.

### CUJ 3: Codex or CI runs the command-line check (if question 7 is yes)

*   **Given**: A repository has diagrams in `docs/`.
*   **When**: Codex runs `diagramist check docs/`, or a pre-commit hook runs it.
*   **Then**: The output lists `file:line:col: renderer: code: message` lines and exits with a non-zero
    code when a target renderer fails.

### CUJ 4: Exporting a diagram for a slide

*   **Given**: A diagram previews correctly.
*   **When**: The user runs "Diagramist: Export" and picks Pele, a light theme, and PNG at 3×.
*   **Then**: A PNG file is written to the chosen folder. It shows the diagram with real colours and
    the bundled font, and looks the same as the preview when pasted into Google Slides.

### CUJ 5: The renderers disagree

*   **Given**: A Sankey diagram has a value written as `abc`, and the file targets Mermaid.js only.
*   **When**: The diagram is checked.
*   **Then**:
    *   The result shows Mermaid.js OK, plus a Pele syntax error marked as a warning, because Pele is
        not a target.
    *   The Problems panel shows a warning, not an error.
    *   The agent is told not to change the diagram for Pele.

### CUJ 6: A diagram from a cloned repository points at a remote image

*   **Given**: A cloned repository has a diagram with an `https` image.
*   **When**: The user opens the preview.
*   **Then**: The preview shows a "remote image blocked" placeholder, and no network request is made.

### CUJ 7: Connecting an agent

*   **Given**: Diagramist and Codex are installed.
*   **When**: The user runs "Diagramist: Connect AI agent" and picks Codex.
*   **Then**:
    *   Diagramist shows the exact command for Codex at user scope, and runs it if the user agrees.
    *   "Diagramist: Check agent setup" then reports Codex as connected and the checker as reachable.

## Technical Plan (Architecture)

This section starts with the parts that don't depend on an open question. Decisions D1–D8 (section
9) are added one at a time as the author makes them.

### 1. Parts and where they run

```mermaid
flowchart LR
  subgraph AG["AI agent: Claude Code, Gemini CLI or Codex"]
    A["agent loop"]
  end
  subgraph CK["Diagramist checker (Node, stdio MCP server)"]
    T["check tool"] --> W1["worker thread: core + Mermaid.js parser + Pele"]
  end
  subgraph VS["VS Code"]
    subgraph EH["extension host"]
      DG["diagnostics"] --> W2["worker thread: core"]
      EX["export commands"]
      AS["agent setup"]
    end
    subgraph WV["preview webview (browser)"]
      PV["preview: Pele or Mermaid.js"]
    end
  end
  F[("diagram files")]
  A -- "check(path)" --> T
  A -- "edits" --> F
  F -- "file changes" --> DG
  F -- "text" --> PV
  EX -- "asks for SVG / PNG" --> PV
```

*Checked on 2026-11-11 with Pele 1.13.0 and Mermaid.js 12.3.0: both accept this diagram.*

Code runs in four places:

*   **Checker.** A Node program that the agent starts and talks to over stdio using MCP. It never
    contacts VS Code.
*   **Extension host.** VS Code's Node process for extensions. It runs diagnostics, export commands and
    agent setup.
*   **Preview webview.** A browser page inside VS Code. It draws diagrams with Pele or Mermaid.js and
    produces the export images.
*   **Worker threads.** In both the checker and the extension host, the core runs in a worker thread
    with a time limit. A slow diagram therefore can't freeze the agent's tool or VS Code.

The agent and VS Code never talk to each other. They meet only through the files: the agent edits a
file, and the extension sees the change and updates its diagnostics and the preview.

### 2. The core

The core is shared code that runs in all four places. It imports nothing from VS Code, nothing that
needs a browser page, and nothing that works only in Node.

| Module | Job |
| --- | --- |
| `blocks` | Finds diagrams. A `.mmd` or `.mermaid` file is one diagram. In Markdown it finds ```` ```mermaid ```` and `~~~mermaid` fences, including fences indented in lists or quotes. It records each block's start line, indentation and quote prefix, handles CRLF line endings, byte-order marks and tabs, and numbers blocks from 1. |
| `positions` | Turns a renderer's position, which counts from the start of the diagram, into a file position: 1-based line and column, with columns in UTF-16 code units. Errors without a position are attached to the block's first line and marked that way. |
| `renderers/mermaid` | The only code that imports `mermaid`. It checks syntax with `mermaid.parse()` and maps `hash.loc` to positions. In the browser it can also draw. |
| `renderers/pele` | The only code that imports `pele`. It checks with `render()` using fixed options, maps `PeleError` to positions, and draws anywhere. |
| `result` | The result format (version 1). It builds results and prints them as short text and as JSON. |
| `policy` | Fixed render and security settings: Pele `images: false` and `autoDirection: false`, a fixed `now` for checks, Mermaid.js `securityLevel: "strict"`, and size limits that can only be lowered. |
| `hints` | One-line hints for each error code. It recognises types neither renderer supports, such as ZenUML, and fence lines pasted in as diagram text. |
| `targets` | Decides which renderers must pass for a block: both by default, or what the block's `%% diagramist: targets=…` comment says (decision D3). |
| `compat` | The table of diagram types with the Mermaid version that introduced each, and the warnings for types newer than the oldest destination (decision D4). |
| `theme` | Maps VS Code theme colours to Pele's `--pele-*` variables and to a Mermaid.js theme, and holds the fixed light and dark export themes. |

Mermaid.js needs a stand-in for the browser when it runs in Node. The Node entry points (the checker
and the extension-host worker) load jsdom before the core's Mermaid.js adapter, so the core itself
has no Node-only imports.

### 3. What a check returns (result format, version 1)

A check takes a file path, or diagram text as a fallback. It reads the saved file, finds its blocks,
and runs both renderers on each block inside the worker.

```text
CheckResult
  schemaVersion: 1
  checker:   { name: "diagramist", version }
  renderers: { mermaid: "12.3.0", pele: "1.13.0" }
  file:      absolute path, as read from disk
  blocks:    list of BlockResult
  summary:   { blocks, errors, warnings }

BlockResult
  index, startLine, endLine     -- 1-based; file lines of the diagram text
  type                          -- e.g. "flowchart", or null
  targets                       -- renderers that must pass (decision D3)
  verdicts: { mermaid: Verdict, pele: Verdict }
  warnings: list of { code, message }   -- e.g. "theme is ignored by Pele"

Verdict
  ok: true
  or ok: false with
    class:    "invalid" | "unsupported" | "too-large" | "tool"
    severity: "error" for a target renderer, "warning" otherwise
    code:     the renderer's own code, e.g. "syntax"
    message:  first line only
    position: { line, column, unit: "utf16" } or null
    snippet:  up to 200 characters: the line before and the reported line
    hint:     one line
    retry:    whether editing the diagram can fix it
```

Agents read the text form first. A passing file takes one line, and each failing block a few lines.
For example:

```text
README.md: 2 diagrams, 1 error (Mermaid.js 12.3.0, Pele 1.13.0)
README.md:42:15 error [Mermaid.js syntax] Expecting 'SQE', got 'NEWLINE'
   41 |   A[Client] --> B[API
   42 |   B --> C[(DB)]
  hint: the "[" opened on line 41 is not closed; errors are often reported one line late.
README.md:88 ok (sequence)
```

Rules:

*   Only renderers that are targets produce errors; the others produce warnings.
*   Each renderer reports its first error per block, because both stop at the first.
*   A check result never contains SVG. Render options and Mermaid `config` are never inputs.
*   `errors` and `warnings` are lists from version 1. Within version 1, fields are only ever added.
*   The classes "unsupported" and "too-large" set `retry: false`, and their hint tells the agent not to
    rewrite the diagram because of them.

The MCP server offers one read-only tool, `check`, marked `readOnlyHint: true`, `idempotentHint: true`
and `openWorldHint: false`. Its description says when to use it: after writing or editing any Mermaid
diagram, call `check` on the file and fix errors until it passes; after three failures on the same
error, stop and ask the user. There is no `export` tool in v1 (decision D5).

### 4. Time limits and load

*   Each check runs in a worker thread with a 2-second limit, which can be configured. On timeout the
    worker is stopped and a fresh one started. The block gets class "tool" and code "timeout".
*   The extension's diagnostics wait for a 400 ms pause in typing. They cover open documents and files
    changed on disk only, and skip files over 1 MB.
*   The preview draws inside the webview. When a diagram breaks, it keeps the last good drawing, dimmed,
    under the error.

### 5. Security and privacy

*   **No network from any part.** The webview's Content Security Policy allows only Diagramist's own
    scripts and styles, and images only from the extension and `data:`. It allows no connections.
    Command links are off.
*   **Images and scripts in diagrams.** Pele images are off by default. Mermaid.js uses
    `securityLevel: "strict"`, which drops click callbacks and cleans labels. Blocked images show a
    placeholder.
*   **Links** open only through VS Code, after the user confirms. Obsidian-style internal links do
    nothing.
*   **Safety settings** (images, link schemes, limits) can be set only at user or machine scope, so a
    cloned repository's workspace settings can't loosen them.
*   **Restricted Mode** (an untrusted folder): preview and diagnostics stay on; images, links and agent
    setup are off.
*   **Logs** include diagram text only at trace level.

### 6. Observability

*   Every result, log line and diagnostic report names the Diagramist, Mermaid.js and Pele versions.
*   The extension uses one VS Code log channel, "Diagramist", which follows VS Code's log level. The
    checker logs to stderr, because MCP uses stdout for protocol messages.
*   A self-test draws one small sample of every supported diagram type with each renderer. It runs on
    first activation and with `--self-test`, so packaging faults show up before an agent meets a false
    error.
*   "Diagramist: Copy diagnostic report" collects versions, settings, agent setup status and recent
    counts. It leaves out diagram text and paths unless the user opts in.

### 7. Code layout (feature-based)

```text
skills/diagramist/SKILL.md   agent guidance (decision D8)
src/
  core/                      shared, runtime-neutral (section 2)
  features/
    checker/     server/     stdio MCP server
    cli/         server/     diagramist check (decision D7)
    diagnostics/ host/       Problems panel
    preview/     host/ webview/
    export/      host/ webview/
    agent-setup/ host/       connect, check and disconnect agents
  platform/
    node/                    worker threads, jsdom loader, file access
    vscode/                  log channel, settings, workspace trust
    browser/                 webview messaging
```

Import rules, checked in CI with dependency-cruiser:

*   `core` imports only itself, plus the two renderers inside `core/renderers/*`.
*   Features import `core` and `platform`, never each other.
*   Code in `webview/` and `server/` never imports code from `host/`.
*   Only `core/renderers/mermaid` imports `mermaid`, and only `core/renderers/pele` imports `pele`.

Each feature exports one `register` function, and the extension's activation calls them in order.

### 8. Choices with one defensible answer (made without a gate)

*   **Build:** TypeScript in strict mode. esbuild builds four bundles: extension host, webview,
    checker and worker.
*   **Runtime:** Node 20 or later, because Pele requires it.
*   **Renderer versions:** `mermaid` and `pele` are pinned to exact versions. Upgrades go only through a
    pull request that runs the regression set (Pele's and Mermaid's examples plus our edge cases) and
    compares verdicts, codes and positions.
*   **IDs:** internal ID and prefix `diagramist` for settings, commands, the MCP server name and the log
    channel.
*   **Tests:**
    *   Vitest for the core and features;
    *   `@vscode/test-electron` for the extension;
    *   MCP contract tests with the official SDK client;
    *   Playwright with a local Chromium for drawing and export in the webview.

### 9. Decisions

| # | Decision | Status |
| --- | --- | --- |
| D1 | How agents start the checker (open question 1) | **decided: A, npm package, installed globally** |
| D2 | Preview surface (open question 2) | **decided: A, Diagramist's own preview panel** |
| D3 | How targets are declared (open question 3) | **decided: A, both by default, comment to opt out** |
| D4 | Mermaid.js version policy (open question 4) | **decided: C, newest version plus warnings for newer types** |
| D5 | Where PNG export runs (open question 5) | **decided: A, from the preview panel only** |
| D6 | Telemetry (open question 6) | **decided: A, none** |
| D7 | CLI in v1 (open question 7) | **decided: A, yes** |
| D8 | Where agent guidance lives (open question 8) | **decided: B, short tool descriptions plus one shared `SKILL.md`** |

#### D1: agents start the checker from an npm package installed globally

*Decided 2026-11-11. The author was shown three options: A, an npm package; B, a launcher inside the
extension; C, both. After asking which one the Elephant would pick, the author took A.*

*   **The package.** The checker is published to npm as `diagramist`. Its command `diagramist` has the
    subcommands `mcp` (the stdio MCP server), `--version` and `--self-test`. Decision D7 decides
    whether it also offers `check` for shells and CI.
*   **How agents run it.** Agent settings run `diagramist mcp` from a global install
    (`npm install -g diagramist`), not `npx`. A test on 2026-11-11 showed that `npx` keeps npm's own
    process running next to the checker, adding about 96 MB for every agent session.
*   **Connecting an agent.** "Diagramist: Connect AI agent" checks for `diagramist` on the PATH. If it
    is missing, it offers to run `npm install -g diagramist@<the extension's version>`, then runs the
    agent's own `mcp add` command at user scope, or shows it for the user to copy.
*   **Versions.** The extension and the npm package are built from the same repository and the same
    version tag. "Check agent setup" warns when the installed checker's version differs from the
    extension's.
*   **When it fails:** without Node, or without access to the npm registry for the one-time install.
    The launcher from option B can be added later without breaking anything, if locked-down networks
    need it.

Resource use, measured on 2026-11-11 (Node 22, resident memory of one process):

| Checker state | Memory |
| --- | --- |
| Started, nothing loaded | about 56 MB |
| Pele loaded, one diagram drawn | about 63 MB |
| Mermaid.js and jsdom loaded, two checks | about 155–159 MB |

So the checker loads Mermaid.js only on the first check that needs it, and not at all when Mermaid.js
is not a target for the file. Each agent session starts its own checker.

In Node, the two renderers must not share browser stand-ins. With jsdom's `window` and `document`
present, Pele assumes it is in a browser and tries jsdom's canvas, which is not implemented (seen in a
test on 2026-11-11). The checker therefore gives Pele an explicit text measurer that uses Pele's
built-in width table, and keeps jsdom's globals limited to the Mermaid.js adapter.

#### D2: one Diagramist preview panel

*Decided 2026-11-11 (options: A, own panel; B, VS Code's built-in Markdown preview; C, both). The
author took A.*

*   **Opening it.** "Diagramist: Open Preview to the Side" appears as a button in the editor title bar
    for `.mmd`, `.mermaid` and Markdown files. Its keybinding is limited to those files, so it never
    replaces Markdown's own preview shortcut.
*   **One panel.** It follows the active editor, with a lock toggle. It shows every diagram in the
    file in order, each labelled with its block number and line, and scrolls to the diagram at the
    cursor.
*   **Renderer switch.** Pele or Mermaid.js, per panel. Both draw in the webview.
*   **Updates.** It redraws from the editor's text after a pause in typing (300 ms for Pele, up to
    1 second for Mermaid.js) and when files change on disk. It never takes focus. When an agent changes
    a file that isn't shown, the status bar says so.
*   **Status line.** It shows the file, block, renderer and its version, the update time, a short
    content hash and the number of warnings.
*   **Theme.** It follows VS Code's light, dark and high-contrast themes. Pele gets them through the
    `--pele-*` to `--vscode-*` map; Mermaid.js gets them as its "base" theme with `themeVariables` built
    from the same colours.
*   **Security.** The strict policy in section 5. Export buttons live in this panel (decision D5).
*   **Accessibility.**
    *   Diagrams can be reached with Tab.
    *   Errors are announced to screen readers and shown as text as well as colour.
    *   Diagram titles and descriptions (`accTitle` and `accDescr`) are kept.
*   **Restoring.** After a reload the panel reopens on the same file and block. It stores only those
    two values, with a version number.
*   **Not in v1:** drawing diagrams inline in VS Code's built-in Markdown preview. It can be added later
    as an opt-in without breaking anything.

#### D3: both renderers must pass unless the diagram opts out

*Decided 2026-11-11. The options were: A, both by default with a comment to opt out; B, A plus a
project file with folder rules; C, defaults by file type plus both overrides. The author took A.*

*   **Default targets:** Mermaid.js and Pele, so a passing diagram works on GitHub and Notion and also
    exports with Pele.
*   **Opting out:** a comment line inside the diagram: `%% diagramist: targets=mermaid`,
    `targets=pele` or `targets=mermaid,pele`. It can be the first line or anywhere in the diagram. A
    test on 2026-11-11 showed both renderers accept the line at the top and after the type line.
*   **Showing the source.** Each block's result shows its targets and where they came from: "default",
    or "comment on line N".
*   **Bad comments.** A comment with unknown values leaves the default in place and adds a warning.
*   **Later, without breaking anything:** a project file with folder rules (option B).

#### D4: the newest Mermaid.js, with warnings for newer diagram types

*Decided 2026-11-11. The options were: A, the newest version only; B, GitHub's version; C, the newest
version plus warnings. The author took C. GitHub does not publish the Mermaid version it runs; its own
docs say to render an `info` diagram to see it.*

*   **The pin.** Diagramist pins the newest Mermaid.js at release time (12.3.0 on 2026-11-11) to an
    exact version. Upgrades go through the regression pull request.
*   **The table.** A small table, `core/compat/mermaid-types.json`, maps each diagram keyword to the
    Mermaid version that introduced it and says whether Pele supports it. It is built once from
    Mermaid's changelog and docs. A CI check fails when the pinned Mermaid.js recognises a keyword the
    table doesn't list, so the table can't fall behind an upgrade.
*   **The oldest destination.** Users can set the oldest Mermaid version they publish to (for example,
    GitHub's). Because D3 means no project file, the setting lives in two places, and "Connect AI agent"
    copies the VS Code setting into the agent's command:
    *   the checker option `--oldest-mermaid <version>`, in the agent's MCP command;
    *   the VS Code setting `diagramist.oldestMermaidVersion`.
*   **Warnings.**
    *   A diagram whose type is newer than the oldest destination gets a warning, for example "venn-beta
        was added in Mermaid 12.0; your oldest destination is 11.4".
    *   Until a version is set, only beta types (keywords ending in `-beta`) are flagged, with the
        warning "beta diagram type; may not render on sites with older Mermaid".
    *   These are always warnings, never errors.

#### D5: export from the preview panel only

*Decided 2026-11-11. The options were: A, the preview panel only; B, the panel plus SVG and PNG from
the checker; C, the panel plus SVG only from the checker. The author took A.*

*   **The command.** "Diagramist: Export Diagram…" runs from a panel button or the command palette. It
    asks for:
    *   the diagram, when the file has several;
    *   the renderer: Pele or Mermaid.js;
    *   the format: SVG or PNG;
    *   the theme: light, dark, or VS Code's current theme;
    *   for PNG, the scale: 1× to 4×, default 2×.

    VS Code's save dialog suggests a name such as `README-2.pele.png`, next to the source file.
*   **SVG.** Colours and fonts are written into the file as plain values, read from the drawn diagram.
    The file therefore doesn't depend on CSS variables, which some slide tools don't support. The font
    is a common stack, such as Helvetica, Arial or sans-serif, that matches the preview.
*   **PNG.** The panel's browser draws the SVG onto a canvas at the chosen scale. Pele's SVG contains
    no `foreignObject` (checked on 2026-11-11), and Mermaid.js exports are drawn with
    `htmlLabels: false`, so the canvas stays readable.
*   **Saving.** The panel sends the bytes to the extension host, which writes the file. The panel itself
    never touches the disk.
*   **Not in v1:** export by agents or scripts. A checker `export` tool (option B, or SVG-only option C)
    can be added later without breaking anything.

#### D6: no telemetry

*Decided 2026-11-11. The options were: A, none; B, opt-in telemetry with no diagram content. The
author took A.*

*   No part of Diagramist sends data anywhere, which keeps Goal 7 without exceptions. The README says
    so.
*   For debugging, the extension and the checker keep local counts:
    *   checks run;
    *   errors by renderer and code;
    *   attempts until the first pass;
    *   repeated identical errors.

    "Diagramist: Copy diagnostic report" includes these counts, and the user decides whether to share
    them in an issue.

#### D7: the command-line checker ships in v1

*Decided 2026-11-11. The options were: A, yes; B, the MCP server only. The author took A.*

*   **Command.** `diagramist check <paths…>` takes files or folders. In folders it checks `.mmd`,
    `.mermaid` and `.md` files and skips `node_modules` and hidden folders.
*   **Output.**
    *   Each problem is one line, `path:line:col: severity [renderer code] message`, followed by the
        indented snippet and hint lines, the same as the text form in section 3.
    *   Passing files are listed only with `--verbose`.
    *   A summary line comes last.
*   **Exit codes:**
    *   0: every target renderer passes;
    *   1: at least one error;
    *   2: a tool or usage problem, such as a missing file or a timeout.
*   **Options:**
    *   `--json` prints one result per file in the section 3 format, one JSON object per line;
    *   `--oldest-mermaid <version>` (D4);
    *   `--verbose`.
*   **Same engine.** The core and worker are shared with the MCP server, so the CLI and the agent tool
    always agree.
*   **Docs** include a pre-commit hook and a CI example.
*   **Stability.** The text output is for people and agents. Scripts should use `--json`, whose fields
    follow the result format's versioning rules.

#### D8: short tool descriptions plus one shared `SKILL.md`

*Decided 2026-11-11. The options were: A, tool descriptions only; B, descriptions plus a shared skill
file; C, a package per agent. The author took B.*

*   **The tool description** for `check` stays under about 80 words, because agents receive it on every
    turn. It says when to call `check`, and when to stop and ask the user.
*   **The skill file.** One file, `skills/diagramist/SKILL.md`, ships in the npm package and the
    extension. Its frontmatter description reads: "Use when writing or editing Mermaid diagrams: check
    them with Diagramist and fix errors before finishing." The body, about 150 lines at most, covers:
    *   when to check: after every change to a diagram;
    *   how to check: the MCP tool `check` with a path, or `diagramist check <path>` in a shell;
    *   how to read results: renderers, error classes, `retry`, warnings, and errors reported one line
        late;
    *   the `%% diagramist: targets=…` comment;
    *   the rule to stop after three failures on the same error;
    *   short tips per diagram type;
    *   what not to do: don't rewrite a diagram for "unsupported" or "too-large" errors, don't add
        `%%{init}%%` theme blocks, and don't use HTML labels.
*   **Installing it.** "Connect AI agent" copies the skill into the chosen agent's user-level skills
    folder, after the user agrees: `~/.claude/skills/diagramist/` for Claude Code, and the documented
    skills folders for Codex and Gemini CLI (to be confirmed in the Detailed Implementation). The
    README shows how to copy it by hand.
*   **Versions.** The skill names the Diagramist version it was written for. "Check agent setup" flags a
    copy that is out of date.
*   **Later, without breaking anything:** per-agent packages (option C).

--------------------------------------------------------------------------------

*Sections still to draft: Alternatives Considered, Non-Functional Requirements, Detailed
Implementation Plan.*

*Drafted with EGM*
