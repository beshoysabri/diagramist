# Comprehension Report: Stage 6 (Comprehension Test)

**What this proposes**

Diagramist is an offline toolset that calls no AI model. It lets coding agents (Claude Code, Gemini CLI, Codex) check the Mermaid diagrams they write, and lets the person preview and export those diagrams in VS Code. It has three parts on one core that does not depend on VS Code: a checker, published to npm as `diagramist` and installed globally, which agents launch as a stdio MCP server offering one read-only `check` tool, and which also runs as a `diagramist check` CLI; a VS Code extension with its own preview panel, Problems-panel diagnostics, SVG/PNG export from that panel, and commands that register the checker with each agent and copy a shared `SKILL.md`; and the core itself. The core finds diagrams in `.mmd`/`.mermaid` files and in Markdown fences, and checks each one in time-limited worker threads with Mermaid.js (`parse()` only, running under jsdom in Node) and with Pele (full render); for each renderer it returns a versioned result: OK, or the first error with file line/column, class, code, snippet, hint and `retry`. By default both renderers must pass; a `%% diagramist: targets=...` comment inside a diagram narrows that, failures in a renderer that is not a target become warnings, and an optional "oldest Mermaid version" setting adds warnings for newer diagram types.

**How the existing system works, per this document**

No Diagramist code exists yet: nearly every planned file is marked "Create", and the README still holds design-phase text. So the "existing system" is the person's current workflow and the tools around it. Agents write Mermaid from memory and cannot see whether it renders; the person finds failures later (render errors on GitHub, raw code in Notion, broken slide images) and pastes errors back into the agent's chat by hand, sometimes through online checkers that send the diagram to a website. GitHub, Notion and documentation sites draw with Mermaid.js, each at its own version (GitHub does not publish its version). Pele, "Obsidian's renderer", is fast and themeable but lays diagrams out differently and accepts or rejects some input differently: a Sankey value `abc` passes Mermaid.js and fails Pele. I read Pele as an independent implementation of the Mermaid language, but the document never says so outright. Existing VS Code previews show diagrams only to people, and existing Pele CLIs and Mermaid MCP servers each cover one renderer without mapping errors into the real file or tying into the editor.

**Findings**

There are no Blockers: I could paraphrase every section. Lines 1-849 are the FeatureRange and lines 850-1245 the DetailedRange. Most severe first.

1. **Severity: Major. The worker architecture is described two incompatible ways.**
   - **Affected Scope:** §1 diagram and text (232, 262-263), §2 (286-288), §3 (292-293), §4 (357) and §8 (421-422), against D1 (480-484) and items 7 (892), 37 (1022-1024) and 40 (1031-1032).
   - **Discrepancy:** The diagram and §1-§4 show one worker per process, running "core + Mermaid.js parser + Pele". §2 loads jsdom in "the extension-host worker" before the Mermaid.js adapter, and §8 builds "four bundles ... and worker". D1 then says jsdom breaks Pele, so the renderers get two separate workers, and the plan builds `pele-worker.js` and `mermaid-worker.js`. The earlier sections, which readers meet first, were never revised.
   - Even taking D1 as final, the pipeline does not connect. `checkText` is "pure", returns `CheckResult` synchronously and has the renderers "injected", yet the renderers live in two other threads. The document never says which thread reads the file, finds the blocks, calls the workers and merges their verdicts.
   - §2 also says the core imports "nothing that needs a browser page" (270-271), which contradicts its own Mermaid.js adapter.

2. **Severity: Major. It is unclear whether a renderer that is not a target runs at all, and what the result says if it does not.**
   - **Affected Scope:** Goal 2 (82-86), §3 (292-293, 308, 343) and CUJ 5 (197-203), against D1 (477-478) and items 37 (1023-1024) and 40 (1031-1032). Also CUJ 1 (163-164) and D3 (527-531).
   - **Discrepancy:** Goal 2, §3 and CUJ 5 say both renderers always run, and a renderer that is not a target produces warnings. D1 and items 37 and 40 skip Mermaid.js when it is not a target, while Pele always runs; nothing reconciles the two. `verdicts` requires both `mermaid` and `pele`, and `Verdict` is only ok true or false, so a `targets=pele` block has no way to say "not checked". This should be settled now, because v1 promises that "fields are only ever added".
   - The CUJs talk about a file's targets ("The README targets Mermaid.js"), but D3 allows only a comment inside each diagram. Is the agent supposed to add that comment to the diagram it writes?
   - D3 says each result shows where its targets came from, but `BlockResult` has no field for that.
   - CUJ 5 says "the agent is told not to change the diagram for Pele", with no mechanism. A Pele syntax warning carries `retry: true`, hints are keyed by error code, and the skill content (635-643) does not mention it.

3. **Severity: Major. The `check` tool's inputs and the checker's options are undefined.**
   - **Affected Scope:** 70-71, 292, D4 (547-551), D7 (615-618), and items 43 (1040-1041), 49 (1057-1058), 51 (1065), 61 (1120-1121) and 69 (1161).
   - **Discrepancy:** Only `path` is explained.
   - For `text` ("as a fallback"): is it one diagram or a Markdown file? There is no `fileKind` input. What does `file` ("absolute path, as read from disk") hold then, and where do positions count from?
   - `block` is never described.
   - `oldestMermaid` is a third place for a setting that D4 says "lives in two places", and no precedence is given.
   - D4 and item 61 put `--oldest-mermaid` in the agent's `diagramist mcp` command, but item 51 lists that option only under `check`.
   - It is not stated what relative paths resolve against.
   - §4 says the timeout "can be configured", but neither the CLI nor the MCP server has an option for it, yet the contract test sets "a 50 ms limit".

4. **Severity: Major. "Same verdict" does not hold, and the safety settings are undefined.**
   - **Affected Scope:** 31, 103-104, 112-116, 256-257, 280, 366-367, 374-375, 459-461, 589, and items 17 (940-946), 30 (1002-1003) and 66 (1148).
   - **Discrepancy:** The Overview says the checker and the extension "give the same verdict". But `limits.*`, `checkTimeoutMs` and an `oldestMermaidVersion` changed after connecting are VS Code settings, and the checker "never contacts VS Code". So lowering a limit makes the Problems panel and the agent disagree, and the document does not say so.
   - What does `allowImages: true` enable? The CSP allows images only from the extension and `data:`, and Goal 7 bans network access, yet Goal 7's "blocked by default" implies images can be allowed.
   - `linkSchemes` has no stated default.
   - The limits are never listed; a 50,000-character limit can only be inferred from the corpus.
   - §5 says these settings take "user or machine scope", while item 17 says "machine scope only".
   - D6 says Goal 7 holds "without exceptions", yet "Connect AI agent" offers to run `npm install -g`, which needs the npm registry.

5. **Severity: Major. Cold start, timeouts and the queue do not fit together.**
   - **Affected Scope:** 357-358, 800-801, and items 17 (944) and 40 (1033-1035).
   - **Discrepancy:** The first Mermaid.js check "may take up to 2 seconds" while the worker loads. The limit is also 2 seconds, and a timeout restarts the worker, which then has to load again. The document does not say whether loading counts toward the limit, so a reader cannot tell whether the first check in each agent session can succeed or will keep timing out.
   - It is unclear whether the limit is per block or per file: §4 says "the block", item 40 says "each request".
   - It is not stated what an MCP caller receives when its request is dropped for "a newer request for the same file".
   - It is not stated what happens to a ninth queued request.

6. **Severity: Major. The "unsupported" class can tell agents not to fix errors they could fix, or errors that block the check.**
   - **Affected Scope:** 347-348, 525, 543-544, 642, and items 26 (989) and 31 (1009).
   - **Discrepancy:** Mermaid.js's "No diagram type detected" becomes "unsupported", which sets `retry: false` and a hint not to rewrite the diagram. A misspelled or missing type keyword lands there too, even though editing would fix it. Only types neither renderer supports, such as ZenUML, get special handling.
   - With the default targets, a type that Mermaid.js supports and Pele does not becomes a target error that can never pass. The agent is told not to rewrite it, and nothing tells the agent or the person to add `targets=mermaid`.
   - Neither case is traced through the check-and-fix loop that Goal 3 measures.

7. **Severity: Major. The import rules contradict the file plan.**
   - **Affected Scope:** §7 (393-417), and items 4 (882-883), 7 and 15 (893, 920), 51 (1064-1066), 56 (1087), 64 (1132) and 65 (1137-1139).
   - **Discrepancy:** The rules say features "never [import] each other". But `features/cli/server/cli.ts` dispatches the `mcp` subcommand, and `dist/cli.js` is the only entry point (the contract test runs `dist/cli.js mcp`, line 1156), so the CLI must import `features/checker`. That breaks the rule `lint:deps` enforces.
   - Line 417 says every feature has a `register` function that activation calls, but `checker` and `cli` are never registered.
   - `diagnostic-report` is missing from the §7 layout.
   - The roles of the `host/`, `webview/` and `server/` folders are never defined, and `server/` holds the CLI.
   - The core is type-checked without the DOM library, and only `core/renderers/pele` may import `pele`. Yet the webview draws with Pele `mount`, and the Mermaid.js adapter draws "in the browser". The document does not say where that DOM-bound code lives.

8. **Severity: Major. The checker's local counts cannot be reported.**
   - **Affected Scope:** 256-257, 265, 388-389, D6 (591-598) and item 64 (1133-1136).
   - **Discrepancy:** D6 says "the extension and the checker keep local counts" and that "Copy diagnostic report includes these counts". But the checker is a separate process per agent session that never talks to VS Code, its counts "live in memory only", and the CLI has no way to print them.
   - The counts that matter for the agent's check-and-fix loop ("attempts until the first pass", "repeated identical errors") exist only in the checker, so nobody can read them.

9. **Severity: Major. Export: the font, the theme, and whether the panel must be open are unclear.**
   - **Affected Scope:** 110-111, 191-193, 443, 564, 569-578, and items 19 (952-953), 58 (1099-1101) and 59 (1103-1106).
   - **Discrepancy:** The export font is described as "a fixed font" (Goal 6), "the bundled font" (CUJ 4) and "a common stack, such as Helvetica, Arial or sans-serif" (D5). These are three different things, and the plan never bundles a font.
   - Colours are "read from the drawn diagram", but the theme is chosen at export time. That implies a re-draw in the chosen theme, which is not described.
   - Mermaid.js exports use `htmlLabels: false`, but the preview's setting is not stated, so CUJ 4's "looks the same as the preview" cannot be checked.
   - Export is "from the preview panel only", yet it also runs from the command palette and needs the webview to produce the bytes. Behaviour when the panel is closed, or locked to another file, is not stated.

10. **Severity: Major. Text written before the decisions is still there, and open items are not tracked.**
    - **Affected Scope:** 4, 16, 138, 145-157, 221-222, 454-455 and 701-702.
    - **Discrepancy:** Four passages contradict the decisions already made: the Overview says the CLI "may also ship (open question 7)"; Non-Goals says "Telemetry is open question 6"; §9's intro says decisions "are added one at a time"; and D1 says "D7 decides whether..." the CLI ships.
    - "Unknowns to verify while drafting" has no status. Some are answered later (item 60, step 0). Some no longer matter after D1 and D2 (`ELECTRON_RUN_AS_NODE`, conflicts with the built-in preview). Some are still open and affect the design: each agent's output size limits and support for structured results, and the pre-approval settings that `docs/agents.md` must document.
    - Alternative 5 leaves contributing upstream to "this section's approval gate", while Open Questions (142-143) says everything is resolved.

11. **Severity: Major. Project-process terms are never defined.**
    - **Affected Scope:** 4, 6, 419, 451, 656, 677, 702, 722, 732, 740, 748, 770, 832-833, 852 and 1245.
    - **Discrepancy:** "EGM" is expanded only at line 832, and the pinned commit `e9e1f06` names no repository. "The Elephant", "Goldfish review", "gate" and `egm-review` are never explained.
    - Yet these terms are the stated reason for rejecting four alternatives, an input to D1, and the gate before implementation starts.
    - "The shape after the Goldfish review" (677) implies a design history (Pele only, then reversed) that a reader cannot reconstruct.

12. **Severity: Major. It is unclear what a Mermaid.js "OK" guarantees.**
    - **Affected Scope:** 12, 51-52, 126-130, 525-526 and item 26 (986).
    - **Discrepancy:** The Mermaid.js check is only `mermaid.parse()` at a pinned version, and the Non-Goals disclaim matching GitHub's or Notion's Mermaid.js version. Yet D3 says "a passing diagram works on GitHub and Notion", and the Overview promises diagrams "that render where they will be used".
    - The document never says what a parse-only check misses, such as failures that happen only at render time. A reader comes away with two incompatible versions of the product's core promise.

13. **Severity: Major. "Disconnect agent" has an unstated side effect.**
    - **Affected Scope:** 644-647, items 60 (1116-1117) and 63 (1130-1131), and 796-797.
    - **Discrepancy:** Codex and Gemini CLI share `~/.agents/skills/diagramist/`. Disconnecting either one "deletes the copied skill folder", which silently removes the skill from the other, still-connected agent. "Check agent setup" then reports it as missing.

14. **Severity: Nit. Some terms are used before they are defined, or never defined.**
    - **Affected Scope:** 15, 17 and 21 (against 51-52 and 820-821), 98, 133, 216 (against 1112), 280, 372-373, 482, 505-506, 878, 1202 and 1205.
    - **Discrepancy:**
      - Pele is used before it is defined, and the document never says it renders the Mermaid language.
      - MCP is never expanded.
      - `autoDirection` can only be inferred from the layout badge example.
      - The `metricsMeasurer` sentence is missing its conclusion ("so Pele cannot be handed its width table under jsdom").
      - "A Mermaid grammar" could mean a TextMate grammar or a parser.
      - "Obsidian-style internal links" are not explained.
      - Codex is connected "at user scope", but its command has no scope flag.
      - "The forks" does not say which forks, or whether they are supported.
      - "Validator" appears as a new name for the checker.

15. **Severity: Nit. The text output format is written three ways.**
    - **Affected Scope:** 185, 332-339, 607 and 611-614.
    - **Discrepancy:** The three versions are `file:line:col: renderer: code: message`, `README.md:42:15 error [Mermaid.js syntax] ...` and `path:line:col: severity [renderer code] message`.
    - The main example shows only Mermaid.js's error for an unclosed bracket that Pele would presumably also reject, either as a second error or as a warning. So the reader never sees how two renderers' results for one block are printed.
    - A timeout counts both as "an error" (exit code 1) and as "a tool problem" (exit code 2).

16. **Severity: Nit. Details of the result format disagree.**
    - **Affected Scope:** 276, 321, and items 23 (973) and 24 (977-978).
    - **Discrepancy:** The result format says `position` is null when the renderer gives none. The `positions` module instead anchors the error to the block's first line with `hasPosition: false`, a field the result format does not have.
    - `spanStart` and `classHint` are produced but never mapped into the result.

17. **Severity: Nit. The scope of diagnostics is inconsistent.**
    - **Affected Scope:** 359-360 (against item 53, 1074), 499-500 and 1081-1082.
    - **Discrepancy:** §4 says diagnostics cover "files changed on disk", while item 53 says "Open documents only". So it is unclear whether an agent's edit to a file that is not open reaches the Problems panel (Goal 5).
    - "When an agent changes a file" really means any change on disk, and the document does not say which files are watched.

18. **Severity: Nit. The token budgets have no stated way to be measured.**
    - **Affected Scope:** 80-81, 805, and items 29 (999) and 49 (1059).
    - **Discrepancy:** The budgets are per failing diagram and per passing file. But the text cap is about 4,000 characters for the whole output, and the tool returns both structured content and text.
    - It is not stated which output the budget counts, how tokens are counted, or what setting "by default" refers to.

19. **Severity: Nit. Step 0 depends on things that do not exist yet.**
    - **Affected Scope:** 858-864, and items 19 (952-953), 66 (1143-1150) and 81 (1209).
    - **Discrepancy:**
      - Step 0 runs "before anything else" against the regression corpus, which item 66 creates later.
      - Its fallback puts jsdom in the VSIX's `node_modules`, which `.vscodeignore` excludes.
      - It records the result under "Packaging notes", a section that does not exist.
      - Item 81 "creates" the very file under review.

20. **Severity: Nit. Some specifics are too vague for a newcomer to act on.**
    - **Affected Scope:** As cited below.
    - **Discrepancy:**
      - The preview keybinding is never given (492-493).
      - The status line's "short content hash" has no stated purpose, and results carry no hash to compare it with (502).
      - `release:check` is never described (872).
      - The fixed `now` (280, 1005) and the flat input schemas (993-994) have no stated reason.
      - "So the canvas stays readable" does not give the reason (576-578).
      - The message types between host and webview do not include link clicks (1050-1051, against 1092-1093).
      - D4's CI check that compares Mermaid's keywords with the table has no file or test in the plan (545-546).
      - The 15 MB limit does not say whether it applies to each artifact or to both together (1222-1223).
      - Nothing says where CI gets the Chromium that Playwright drives (876, 1173).
      - Goal 3 says the agents' own VS Code panels are "covered", while the support table says "best effort" (88-89, 1198).
      - It is not stated whether Connect waits for `npm install` to finish before registering the agent (1119-1122).
      - Item 56 draws Pele with `autoDirection` and `images` off, although both are user settings (1087, against 1094, 942 and 945).

---

**Target:** `docs/designs/diagramist.md` (FeatureRange lines 1-849, DetailedRange lines 850-1245). No standard and no GoldfishContext, by design.

| Reviewer | Status |
| --- | --- |
| `egm-comprehension` | completed |

The reviewer's complete result is reproduced above, unedited, as `egm-review` requires.
