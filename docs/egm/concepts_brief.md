# Pele Diagrams for VS Code

* **Author:** Beshoy Sabri
* **Date:** 2026-11-11
* **Stage:** EGM brainstorm (`egm-brainstorm`). Goldfish review done; waiting for the author to align.
* **Input:** [feature-concept.md](feature-concept.md) (the anchored hypothesis the author confirmed)

## Overview

Pele Diagrams for VS Code helps people get Mermaid diagrams right while an AI coding agent writes
them. The renderer is Pele, Obsidian's open-source Mermaid renderer (npm `pele`, MIT). The project is
public and general-purpose. The author works in VS Code, and some users will use it at work.

The review changed the shape of the idea. As first written, the VS Code extension itself would offer
the tools to the agents. That does not work for the three agents the author named. Claude Code,
Gemini CLI and Codex are separate programs. Each one loads outside tools only from its own
configuration, usually as an MCP server (MCP, the Model Context Protocol, is the common way these
agents call outside tools). They do not see tools that a VS Code extension registers with VS Code.

The reviewed shape has three parts that share one core:

1. **A checker the agent starts itself.** It is a small program, run as an MCP server over standard
   input and output (stdio), and probably also as a command-line tool. It runs Pele in plain Node,
   checks a diagram file, and returns the first error, with its location in the real file when Pele
   gives one. It needs no VS Code window, network, account or AI model.
2. **A VS Code extension for the person.** It previews diagrams with Pele in VS Code's colours and
   lists Pele errors in the Problems panel. It follows the files the agent edits; the agent never
   talks to the extension.
3. **One shared core** that both parts use. It holds the only code that calls Pele, fixed render
   settings, the code that finds diagrams in a file, and the position mapping. The agent, the
   Problems panel and the preview therefore get the same verdict from the same Pele version.

The value is a short, local loop. The agent writes a diagram and checks it, which takes about a
millisecond in Pele. It reads the error and its location, fixes it, and checks again. Meanwhile the
person watches the preview in VS Code. The project itself runs no server, calls no AI model and needs
no API key.

## Analysis

### Reviewer status

| Reviewer (lens) | Status |
| --- | --- |
| `egm-zoom-out` (YAGNI and reuse) | completed |
| `egm-design` (cost, quota and architecture) | completed |
| `egm-comprehension` (UX and developer ergonomics) | completed |
| `egm-implementation-readiness` (migration and compatibility) | completed |
| `egm-codebase-details` (observability and debuggability) | completed |
| `egm-structural` (long-term maintenance) | completed |
| `egm-inventive-catalyst` (contradictions) | completed |

The EGM plugin is not installed on the machine that ran this review. The reviewers ran as fresh
general-purpose subagents. Each first read its persona file from the pinned EGM commit
(`e9e1f06`, v0.1.1) and was told to stay read-only. They saw only the concept file and the Pele
documentation the author pointed to. Unlike the plugin's own reviewers, they were not technically
blocked from reading user instruction files, and none had web access.

### Findings, most severe first

Each finding lists the lenses that raised it. Where reviewers disagreed on severity, the highest is
shown.

#### 1. Blocker: as written, the tools cannot reach Claude Code, Gemini CLI or Codex (all 7 lenses)

* VS Code's ways of offering tools (`vscode.lm.registerTool`, `contributes.languageModelTools`,
  and the MCP server provider API) feed VS Code's own chat, which is GitHub Copilot. The three named
  agents read MCP servers from their own config: `.mcp.json` or `~/.claude.json` for Claude Code,
  `mcpServers` in `settings.json` for Gemini CLI, `[mcp_servers]` in `~/.codex/config.toml` for Codex.
* A web server inside the extension, which would keep a live link to the preview, brings its own
  problems:
  * a port to find and a token to keep other local programs out, with checks against web pages
    calling it;
  * one server per VS Code window, so an agent can reach the wrong window;
  * it disappears when VS Code closes or reloads;
  * it breaks when the agent runs on a remote machine (SSH, WSL, containers).
* **Resolution all lenses converged on:**
  * Make the check a stateless function: diagram in, result out.
  * Serve it from a stdio MCP server that each agent starts for itself, and from a command-line tool
    that prints linter-style lines (`file:line:col: code: message`). Any agent with a shell, a
    pre-commit hook or a CI job can use the CLI without setup.
  * Link the preview to the agent only through the files: the agent edits the file, and the extension
    re-renders it.
  * Also publish Pele errors as VS Code diagnostics. Claude Code's VS Code integration is believed to
    pass diagnostics to the model, which gives a second channel with no setup (to verify; unknown for
    Gemini CLI and Codex).
  * VS Code's own chat can be served later at little cost by registering the same server through the
    MCP provider API.

#### 2. Blocker: agent setups break on every update unless the launch command stays the same (5 lenses)

* The obvious stdio command points into the extension's install folder, and that folder's name
  contains the version. Every automatic update would break the agent setups, and the agent reports
  only "server failed to start".
* Insiders, VSCodium, Cursor and remote machines install to different folders.
* A plain `node …` command fails where Node is not installed. The native Claude Code installer and
  the Codex binary are believed not to need Node.
* Absolute paths or tokens written into project files (`.mcp.json`, `.gemini/settings.json`) break
  teammates' setups or leak into public repos.
* Removing the extension leaves stale entries that fail every time an agent starts.
* **Requirements:**
  * A launch command that is the same across versions. Two shapes were proposed: a separately
    published npm package, or a launcher the extension keeps at a fixed path in its global storage.
    The author has to choose (open question 2).
  * Pele bundled into the checker, with no `npx` download at run time, so offline and locked-down work
    networks still work.
  * Setup at user scope, done through each agent's own `mcp add` command or copy-paste snippets. Never
    silently edit another tool's config; Claude Code rewrites `~/.claude.json` itself.
  * "Connect AI agent", "Check agent setup" and "Disconnect agent" commands.

#### 3. Blocker: a pass means "Pele can draw this", not "GitHub can" (all 7 lenses)

Pele has its own layout and documents deliberate differences from Mermaid.js:

* It accepts Unicode Sankey names that Mermaid 12.1.0 rejects.
* It treats a non-numeric Sankey value as an error, where Mermaid draws an empty flow.
* It has no HTML labels, no ZenUML and no external plugins.
* It ignores Mermaid themes.
* It supports recent `-beta` diagram types that older Mermaid versions on GitHub, GitLab or documentation
  sites may not know.

An agent that "fixes until it passes" learns Pele's version of Mermaid. Worse, it may rewrite a
diagram that is valid for where it is published, for example by turning a ZenUML diagram into
something else, or by cutting a large diagram down.

The concept does not say where finished diagrams end up, and that decides whether Pele is the right
judge. **Requirements:**

* Word every verdict as "renders with Pele 1.13.0 (Mermaid 12.1.0 syntax)", never "valid Mermaid".
* Sort errors into three classes:
  * invalid diagram (Pele's `syntax` or `semantic`);
  * not supported by this renderer (`unsupported-diagram`);
  * too large (`limit`).
* Tell agents not to rewrite or shorten a diagram for the last two classes.
* Add a `warnings` list on success for things Pele ignores or drops: themes, click callbacks, math
  without a resolver, icons without a resolver, and `-beta` types.
* Keep Mermaid.js out of v1 as a second validator. It is about 1.6 MB gzipped and needs a browser.
  Optionally, add a small table that maps each diagram keyword to the first Mermaid version that has
  it, so a check can warn "not in GitHub's Mermaid" (inventive-catalyst).

#### 4. Blocker: "exact line-and-column errors" is not true as written (all 7 lenses; checked below)

* Pele's positions count from the start of the diagram text, not the file. A diagram in a Markdown
  fence at line 40 reports "line 3".
* Fences indented in lists or quotes, tabs, CRLF line endings, a byte-order mark and several diagrams
  in one file all shift positions.
* Some errors have no position; Pele then reports line 0 and column 0.
* Pele throws on the first error, so each check reports one error.
* Agents edit by matching text, so a bare line number is not enough to act on.
* **Requirements:**
  * One block-finding and position-mapping module that every surface uses.
  * Results carry both diagram-relative and file-relative positions, the block number and the fence's
    line, Pele's `snippet` and the full offending line.
  * Never output "line 0". Anchor errors without a position to the fence.
  * Say "first error only; check again after fixing".
  * Restate the promise as "the first error, with line and column when Pele gives them".
  * Golden tests for each case above.

#### 5. Major: most of the preview already exists (zoom-out, comprehension, design, structural, migration; registries checked below)

* VS Code's built-in Markdown preview accepts markdown-it plugins, scripts and styles from
  extensions. Pele's docs already show the browser side: load `pele.global.js` and call `mount()` on
  each fence.
* Three small Pele-based preview extensions are already on the Marketplace (see "Checked after the
  review").
* Many users already run a Mermaid.js preview extension, such as Markdown Preview Mermaid Support or
  the official Mermaid Chart extension (about 1.18 million installs). Both would claim the same
  ```` ```mermaid ```` fences, so a diagram could render twice.
* The part nobody offers yet is the agent loop: a checker agents can call, the same verdict in the
  Problems panel, and guidance that makes agents run it. That is where this project adds something.
* **Requirements:**
  * Keep the preview small.
  * Pick one preview surface for v1 (open question 3).
  * Detect known Mermaid extensions and give the user a switch.
  * Reuse the existing `mermaid` language ID and highlighting from other extensions rather than
    writing a grammar.
  * Map Pele's `--pele-*` colour variables to VS Code's `--vscode-*` theme variables, including
    high-contrast themes. A CI check fails if a new Pele variable is left unmapped.

#### 6. Major: Pele renders synchronously with no time limit (6 lenses)

* `render()`, `parse()` and `mount()` block until they finish. Pele's security page says to render in
  a worker the app can stop when a time limit is needed.
* VS Code's extension host is one thread shared by every extension in the window, including the
  agents' own extensions. A hostile or very large diagram from a cloned repo could freeze them all.
* **Requirements:**
  * Render the preview in the webview with `mount()`.
  * Run diagnostics and the checker's renders in a worker thread with a hard timeout (about
    2 seconds, configurable). On timeout, stop the worker, start a fresh one, and return a `timeout`
    result.
  * Keep the queue bounded, and wait for a short pause in typing before re-rendering.

#### 7. Major: the tool contract is a public API from the first release, and every byte costs the user tokens (design, comprehension, migration, structural, codebase-details, inventive)

Tool names end up in users' permission allowlists (for example `mcp__<server>__<tool>` in Claude
Code) and in their instruction files. Agents misread changed results instead of failing loudly.

Size is the other risk. Pele allows up to 4,000,000 characters of SVG, Claude Code is believed to cap
MCP output at about 25,000 tokens, and every check-and-fix round costs a full agent turn.

**Requirements:**

* At most two or three tools: a read-only `check`, and an optional separate `export` that writes a
  file and returns its path.
* Input is a file path (with a block number for Markdown), or text as a fallback. Strip fences from
  pasted text and say so.
* No render options or Pele `config` in tool inputs. Pele's security page says the app, not the
  diagram's author, controls them.
* Compact results: about 1,000 tokens by default and never SVG. Every result includes:
  * the Pele and checker versions;
  * an error class;
  * Pele's `code`;
  * the position with a `hasPosition` flag;
  * a snippet cut to about 200 characters and marked as data;
  * a hint;
  * whether retrying makes sense.
* Plain text in every result, plus structured JSON for clients that read it. Flat input schemas (no
  `oneOf`, `anyOf` or `$ref`) so Gemini's and OpenAI's schema conversion accept them.
* `errors` and `warnings` are arrays from the first release, and every result carries
  `schemaVersion`. Tool names never change.
* The tool description says when to call it ("after writing or editing any Mermaid diagram") and sets
  an attempt budget: stop and ask the user after three failures on the same error.
* Per-type syntax examples on request (an MCP resource, or attached to an error of that type), not in
  every session's tool definitions.
* Mark `check` with `readOnlyHint`, and document how to pre-approve it in each agent so the fix loop
  doesn't stop for a prompt on every call.

#### 8. Major: "local" has to be enforced, or it wears away (design, inventive, comprehension, structural, codebase-details)

* Pele fetches `http` and `https` images when they are displayed. An auto-updating preview of an
  agent-written diagram could therefore send data out without a click; a URL can carry it in its
  query string.
* Pele's docs suggest loading it from a CDN with `@1`, which changes the renderer without a release
  and fails offline.
* **Requirements:** no outbound network from the extension, the webview or the checker.
  * Bundle Pele at one exact version.
  * Set `images: false` by default and show a visible placeholder.
  * Use a strict webview Content Security Policy: local scripts only, images only from the extension
    and `data:`, no `connect-src`. Turn off command links.
  * Open links only through VS Code. Keep Obsidian-style internal links inert.
  * Keep safety settings at user or machine scope, so a cloned repo's workspace settings can't widen
    them.
  * Restricted Mode: preview on, images and links off.
  * No telemetry, or opt-in telemetry with no diagram content.
  * Diagram text appears in logs only at `trace` level.

#### 9. Major: feature folders need one shared core because the code runs in three places (all 7 lenses)

* The code runs in the extension host (which has the `vscode` module), in the webview (a browser) and
  in the checker (plain Node).
* If each feature calls Pele with its own settings, the preview, the Problems panel and the agent can
  disagree about the same diagram. A stray `vscode` import also crashes the checker at start-up.
* **Requirements that keep the author's feature-based layout:**
  * A `core` module with no `vscode`, DOM or Node-only imports. It is the only code that imports
    `pele`, and it owns the render settings, the security policy, block finding and position
    mapping, the result schema and the theme map.
  * Features (for example `preview`, `diagnostics`, `agent-server`, `cli`, `agent-setup`) depend on
    `core`, never on each other.
  * Inside a feature, code is split by runtime (`host/`, `webview/`, `server/`).
  * A dependency linter enforces these rules in CI.
  * One exact Pele version for every bundle; the build fails if two bundles differ.
* The zoom-out lens suggested folders by runtime instead. In this product the runtime and feature
  boundaries mostly coincide, so the layout above satisfies both.

#### 10. Major: nobody can see inside a local tool, so it has to report on itself (codebase-details, structural, migration)

The project's "incidents" are GitHub issues from machines the maintainer can't reach. The
codebase-details lens rated missing tracing a Blocker, but that rating assumed a server inside the
extension, routing calls between windows. With the stateless checker from finding 1, the
requirements shrink to:

* Every result names the extension, checker and Pele versions.
* Every result separates "the diagram is wrong" from "the tool failed" from "the environment needs
  action", so an agent never rewrites a valid diagram because of a tool bug. One example of a tool
  bug: an unregistered diagram type that Pele reports as `unsupported-diagram`.
* One log channel that follows VS Code's log level, with no diagram text below `trace`.
* A start-up self-test that renders one small sample of every supported type. It catches packaging
  faults before an agent meets a false error.
* A "Copy diagnostic report" command with paths and content removed by default.
* An issue template that sends differences in Pele's own rendering upstream to obsidianmd/pele.
* Local session counters: attempts until the first pass, and repeated identical errors.

#### 11. Major: preview behaviour can mislead the person watching (comprehension, codebase-details, inventive, zoom-out, migration, design)

* **Direction flips.** `mount()` fits the pane width, and in panes narrower than 640 px it turns
  `flowchart LR` vertical. Side-by-side previews are often that narrow, so the person may "fix" a
  direction that was right.
* **Two copies of the text.** Agents write to disk while the editor may hold unsaved changes, so the
  checked text and the previewed text can differ.
* **Requirements:**
  * Set `autoDirection` off by default, with a badge whenever Pele changes the layout.
  * The checker reads the saved file and warns when the open editor has unsaved changes.
  * The preview follows the editor buffer and changes on disk, and shows the update time and a short
    content hash.
  * Never take focus or open a panel because an agent changed a file; a status-bar note is enough.
  * Accessibility: the diagram is reachable with Tab, errors are announced and shown as text as well
    as colour, and Pele's accessible title and description are kept.

#### 12. Major: release and compatibility rules for a public extension (migration, structural, design)

* Pin an exact Pele version. Before every upgrade, run a regression set (Pele's examples plus edge
  cases) and compare pass/fail, codes and positions. A Pele major version means an extension major
  version.
* Ship agent-facing changes as pre-releases first, and give the agent tools an on/off setting as a
  kill switch.
* Make no one-way migrations of settings or saved state.
* One git tag publishes everything: the Marketplace and Open VSX listings (Cursor, Windsurf and
  VSCodium install from Open VSX), plus npm if the checker ships separately. Collect licence notices
  automatically.
* Use stable VS Code APIs only. Set `extensionKind: ["workspace"]` so the checker setup runs on the
  same machine as the agent.
* Test matrix tiers: supported, best effort, unsupported. Pull-request CI must not depend on paid
  agents. Live-agent smoke tests run by hand or on a schedule with capped keys, never on pull
  requests.

#### 13. Nit: the name and the permanent identifiers (zoom-out, structural, migration, comprehension)

* "Pele Diagrams for VS Code" combines Obsidian's project name with Microsoft's product name. Either
  could object. Several reviewers also expect people to read it as an official Obsidian product.
* A Marketplace ID can never be renamed, and settings keys, command IDs and tool names end up in
  users' files.
* **Requirements:**
  * Choose a short, neutral internal ID that is independent of the display name.
  * Say "unofficial, not affiliated with Obsidian" in the listing.
  * Put "Mermaid" in the short description and keywords; people search for Mermaid, not Pele.
  * Check Microsoft's naming guidance, and consider asking Obsidian.

#### 14. Nit: likely add-ons that would cost more than they look (zoom-out, structural, design, comprehension)

* `$$…$$` math (KaTeX or MathJax) and icon packs. Pele inserts their markup unfiltered, so each one is
  a security boundary to own.
* A hand-written Mermaid grammar.
* SVG or PNG export.
* PNG images returned to agents. Rendering them in Node needs a native rasteriser, which means a
  separate build per platform.
* A web build for vscode.dev.
* Navigation of Obsidian-style internal links.

The reviewers recommend leaving all of these out of v1. If export is added later, it should write
real colours into the file rather than CSS variables that only work inside the preview.

### Contradictions and the ideal result (inventive-catalyst)

| Tension | Resolution |
| --- | --- |
| Reaching all three agents vs. a live link to the preview | Stateless checker each agent starts itself; the file is the shared medium; the preview knows nothing about agents. |
| A preview that updates on its own vs. safety without a click | A preview that cannot reach the network at all. |
| A fast, light judge vs. fidelity to where the diagram is published | Pele stays the only judge; knowledge about destinations is data (a version table), not a second renderer. |
| More information per round vs. the agent's context budget | Tiered output: tiny passes, short failures that carry an example of valid syntax, and files instead of SVG. |

Ideal final result: the check works wherever an agent runs, with no daemon, port or VS Code
dependency. The preview just shows the document. Adding a fourth agent costs one config entry and no
code. The author's original "Gemini CLI, local-based" request is met even outside VS Code.

### Checked after the review (2026-11-11)

These were tested against `pele` 1.13.0 in plain Node and against the public registries, to settle
assumptions the reviewers flagged.

* **Column unit:** UTF-16 code units, counted from 1. Two emoji before an error add 4 columns, not 2.
  An error at the end of a line points one past the last character.
* **One error per call, sometimes on the wrong line:** an unclosed `[` on line 2 was reported at
  line 3, column 4, where the parser gave up. Results should therefore show the line before the
  reported one as well.
* **Errors without a position:**
  * A Gantt chart with an invalid date gives `semantic` with line 0, column 0 and no snippet.
  * Source over 50,000 characters gives `limit`, also with no position. The message names the limit.
* **ZenUML and fenced input:** both give `unsupported-diagram` with no position and no hint. Fenced
  input means text passed with its ```` ```mermaid ```` lines.
* **CRLF line endings:** line numbers stay correct.
* **Existing VS Code extensions built on Pele**, all a few weeks old: `pdanpdan.mermaid-pele-preview`
  (v0.8.0, about 130 installs), `bumkom.markdown-viewer-lite` (v0.2.0, about 65) and
  `saeris.markdown-mermaid-pele` (v0.1.0, about 42). They preview diagrams; their listings mention no
  agent tools.
* **Existing command-line tools:** two Pele CLIs on npm, `@ahmedelgabri/pele-cli` (validate and render)
  and `@simhozebs/pele-cli` (render to SVG or PNG).
* **Agent tools:** no Pele MCP server on npm. Several Mermaid MCP servers exist, built on Mermaid.js or
  other renderers.
* **Shared skill format:** Claude Code, Codex and Gemini CLI all read `SKILL.md` skill folders, each
  from a different folder, so one skill file could carry the agent guidance for all three.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Any agent that supports MCP can check a Mermaid diagram file locally with Pele and get, in one
    short result, the first error: a file-relative line and column when Pele gives one, a snippet, an
    error class and a hint. This works with VS Code closed.
  * Tested, documented setup for Claude Code, Gemini CLI and Codex at user scope.
  * A VS Code preview of `.mmd` and `.mermaid` files and Markdown ```` ```mermaid ```` fences,
    rendered with Pele in VS Code's theme colours. It updates from editor changes and from files
    changed on disk.
  * Pele errors in the Problems panel (source "Pele"), with the same verdict the agent gets.
  * No network access and no AI model calls. Pele is bundled at one exact version.
  * Every verdict names its engine ("Pele x.y.z, Mermaid 12.1.0 syntax").
  * A feature-based code layout with a shared core that does not depend on VS Code.
* **Out-of-Scope Non-Goals (proposed for v1; the author can move any of them):**
  * Generating diagrams. There is no prompt box and no AI call; the user's agent does the writing.
  * Validating against Mermaid.js, or matching GitHub's layout.
  * SVG or PNG returned to agents; SVG or PNG export.
  * Math, icon packs, a Mermaid grammar or completions, and Obsidian internal-link navigation.
  * Agent tools in VS Code for the Web.
  * Telemetry and any backend.
  * Editing agents' config or instruction files without asking.
  * A localhost web server, routing between windows, and agents opening or focusing the preview.

## Alternatives Weighed

* **A standalone app with its own web UI.** Rejected by author: they want to work inside VS Code.
* **The extension calls Gemini CLI (or another agent CLI) itself to generate diagrams.** Rejected by
  author: any agent should be able to drive it, so the extension calls no AI model.
* **Name "Pele Renderer".** Rejected by author in favour of "Pele Diagrams for VS Code".
* **Offering the tools only through VS Code's tool APIs** (`vscode.lm.registerTool` or the MCP server
  provider API). Rejected on technical grounds in review: these reach only VS Code's own chat
  (Copilot), not Claude Code, Gemini CLI or Codex. The same server can still be registered there later
  as an extra.
* **Loading Pele from a CDN.** Rejected on technical grounds in review: it breaks offline use, needs a
  looser Content Security Policy, and changes the renderer without a release.
* **Rendering on the extension host's main thread.** Rejected on technical grounds in review: Pele has
  no time limit, and one slow diagram would freeze every extension in the window.

## Key Decisions & Staging for Next Steps

### Decided by the author during ideation

1. **Name and home:** "Pele Diagrams for VS Code" is a public repository
   (`beshoysabri/pele-diagrams-vscode`) under the MIT licence. The licence was chosen during setup to
   match Pele, and the author can change it.
2. **Shape:** a VS Code extension, not a standalone app.
3. **AI:** the extension calls no AI model. Claude Code, Gemini CLI and Codex do the writing.
4. **Audience:** general use and public. Some users will use it at work.
5. **Layout:** feature-based code layout.

### Proposed by the review, to confirm at the start of `egm-draft`

1. The check is a stateless function, served by a stdio MCP server each agent starts. The extension
   and the agents meet only through files (finding 1).
2. The agent's errors also go to the Problems panel as diagnostics (findings 1 and 9).
3. There is one shared core, the only code that imports `pele`, at one exact Pele version (finding 9).
4. The tool contract is compact, read-only and versioned, with no render options (finding 7).
5. Renders run in workers with hard timeouts (finding 6).
6. The extension makes no network requests and uses the security defaults in finding 8.
7. Verdicts are worded as "renders with Pele", with error classes and warnings (finding 3).
8. A single position contract applies, with the facts checked above (finding 4).
9. The v1 non-goals are as listed above.

### Open questions for `egm-draft` (the author decides)

1. **Destination.** Where do finished diagrams go: Obsidian, GitHub READMEs, documentation sites,
   slides, or somewhere else? This decides how far Pele's verdict can be trusted and whether to build
   the destination warning table.
2. **Launch.** How do agents start the checker: a published npm package, a stable launcher inside the
   extension's storage, or both?
3. **Preview surface.** Should Markdown diagrams preview in VS Code's built-in Markdown preview, in the
   extension's own panel, or in both, with a switch for conflicts with other Mermaid extensions?
4. **Build or contribute.** Build a new extension, or add the agent loop to an existing Pele preview
   extension and keep only the checker here?
5. **CLI.** Should v1 ship the command-line checker alongside the MCP server?
6. **Agent guidance.** Should it live only in tool descriptions, in one shared `SKILL.md`, or in
   per-agent packages (a Claude Code plugin or a Gemini CLI extension)?
7. **Telemetry.** No telemetry, or opt-in telemetry with no diagram content?
8. **Identifiers.** Which internal ID and prefix should settings, commands and tools use, and should we
   ask Obsidian about the name?

### Assumptions to verify while drafting

* Claude Code's VS Code integration passes VS Code diagnostics to the model, and whether Gemini CLI's
  and Codex's VS Code companions do the same.
* The exact `mcp add` commands and scopes for Gemini CLI and Codex, and how each agent pre-approves a
  read-only tool.
* Each agent's limit on tool output size, and whether it supports structured results and MCP prompts.
* Whether VS Code's own runtime can run the checker (`ELECTRON_RUN_AS_NODE=1`) on machines without
  Node.
* How the built-in Markdown preview behaves when two extensions render the same Mermaid fence.
* Microsoft's naming rules for extensions with "VS Code" in the name.

### Staging

1. The author reviews this brief and either confirms it or asks for changes.
2. `egm-draft` writes `docs/egm/design_draft.md` section by section, with an approval gate after each:
   Overview & Goals, Technical Plan, Alternatives, Detailed Implementation. The author decides each
   open question above as it comes up.
3. `egm-review` runs the five-stage Goldfish review of the draft.
4. Implementation starts on its own branch only after the review.
