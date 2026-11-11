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

--------------------------------------------------------------------------------

*Sections still to draft: Technical Plan (Architecture), Alternatives Considered, Non-Functional
Requirements, Detailed Implementation Plan.*

*Drafted with EGM*
