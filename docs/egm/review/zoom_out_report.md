# Goldfish Review Report: Stage 5 (Initial Zoom Out)

**Target:** `docs/designs/diagramist.md` (`full file, lines 1-1245`)
**Standard:** `zoom-out-standard.md` (zoom-out reviewer). The inventive-catalyst reviewer used none.
**Context given to reviewers:** `docs/egm/concepts_brief.md`, plus saved copies of the Pele README and
the pele.run index, API, compatibility, theming and security pages.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |
| `egm-inventive-catalyst` | completed |

Both ran as fresh general-purpose subagents that first read their persona file (pinned EGM
`e9e1f06`). Severity summary after merging duplicates: 0 Blocker, 11 Major, 6 Nit.

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Pele is a must-pass target by default, though no stated destination needs it - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 1), `egm-inventive-catalyst` (finding 2)
* **Affected Scope:** D3 (lines 520-533), Goal 2 (82-86), CUJ 1 (163-164), CUJ 5 (195-203), section 3
  (292-293, 343), D1 (477-478), steps 37 and 40, D8 (639), Alternatives (677-684)
* **Discrepancy Description**: The destinations (GitHub, Notion, documentation sites) all draw with
  Mermaid.js, and export also offers Mermaid.js. Yet D3 makes Pele a must-pass target for every
  diagram, so a diagram GitHub draws but Pele rejects comes back as an "invalid" error with
  `retry: true`. This brings back the brief's finding 3: agents learn Pele's version of Mermaid.
  * **No way out at the right level.** The only opt-out is a comment inside each diagram, while the
    CUJs speak of file-level targets ("the README targets Mermaid.js") that D3 can't express.
  * **The design contradicts itself.** D1 and steps 37 and 40 skip Mermaid.js when it isn't a target,
    while section 3 and CUJ 5 need every renderer to run so that non-targets can produce warnings.
* **Rationale & Recommendation**: Default to Mermaid.js as the must-pass renderer at check time and
  report Pele failures as warnings. Pele's verdict becomes binding when the user exports with Pele;
  the export command shows the Pele error and offers Mermaid.js. Then state that both renderers
  always run, and fix the CUJ wording. Otherwise, record this shape under Alternatives with the reason
  it lost.

### 2. The plan's wiring breaks its own import rules; drawing has no legal home - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 2), `egm-inventive-catalyst` (finding 10)
* **Affected Scope:** section 7 (lines 393-417), section 2 (270-271, 284), Goal 8, steps 4, 24-26, 35,
  49-51, 56, 58, 64; line 853
* **Discrepancy Description**:
  * **Features import each other**, which line 413 forbids:
    * the `mcp` subcommand (CLI, step 51) and the MCP server (checker, step 49);
    * export (step 58), which needs the preview panel;
    * the diagnostic report (step 64), which reads agent-setup status. That feature is also missing
      from the section 7 layout.
  * **Drawing breaks a rule wherever it goes.** It needs the DOM (Pele `mount`, Mermaid.js `render`),
    yet only `core/renderers/*` may import the renderers, and the core is type-checked without the DOM.
  * **`theme` sits in the wrong layer.** It maps `--vscode-*` variables, yet it sits in the
    VS Code-free core.
* **Rationale & Recommendation**:
  * Merge `checker` and `cli` into one feature.
  * Fold `export` into `preview`, and the diagnostic report into `agent-setup`.
  * Keep the core to checking.
  * Split each renderer folder into a runtime-neutral check module and a browser-only draw module that
    only `*/webview/**` may import.
  * Move the theme map to the webview layer.

### 3. One branch, no milestones; the riskiest assumption is tested last - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 3)
* **Affected Scope:** Detailed Implementation Plan (lines 850-1210), Verification Plan (1211-1229),
  Goal 3 (87-94)
* **Discrepancy Description**: All 81 steps land on one `v0.1` branch. The new part is the agent loop,
  yet its key assumption (Goal 3: agents call `check` and converge within three checks) is tested by
  hand only before release, after the preview, export and setup automation are built.
* **Rationale & Recommendation**: Stage the work inside v1:
  * **M1:** core, the `diagramist` npm package (MCP server and CLI), SKILL.md and docs; run the agent
    evaluation here.
  * **M2:** diagnostics and preview.
  * **M3:** export.
  * **Later:** setup automation.

### 4. Agent-setup automation solves a problem D1 already removed - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 4)
* **Affected Scope:** D1 (459-464), D8 (644-649), steps 60-63, NFR (815-816), CUJ 7 (211-217)
* **Discrepancy Description**: With D1, `diagramist mcp` is a stable command on the PATH. The
  connect/check/disconnect wizard adds a second setup path. It has to:
  * parse three config files the agents own; TOML needs a parser that is not in the dependency list;
  * run `npm install -g`;
  * copy, version and delete skills;
  * keep pace with three fast-moving CLIs whose commands are partly unverified.
* **Rationale & Recommendation**: Show the agent's one-line add command and run it in a visible
  terminal. Read status from the agents' own `mcp list` or `mcp get`, and use `mcp remove` as the off
  switch. Spend the effort on a passive version comparison instead (see finding 5).

### 5. Two separately updated checkers sit behind one "same verdict" promise - Severity: Major

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 1); also `egm-zoom-out` (finding 4, last point)
* **Affected Scope:** D1, Goal 5 (103-104), D8 skill install, `diagnostics` and `agent-setup` features
  (L31, 456-467, 478, 644-649, 892, 1124-1129)
* **Discrepancy Description**: The extension auto-updates and bundles its own core, while agents run
  the global npm `diagramist`, and the copied SKILL.md updates on its own schedule. Nothing keeps the
  three in step, so Goal 5 breaks silently after the first release that changes a verdict. Drift shows
  only if the user runs "Check agent setup". A global install can also drop off the PATH when a Node
  version manager switches versions.
* **Rationale & Recommendation**:
  * Have the extension's diagnostics call the installed `diagramist`, one long-lived child per window
    using the same contract. Fall back to the bundled core only when it is missing, and label which
    checker version produced each diagnostic.
  * On activation and after each update, compare the extension, `diagramist --version` and the skill
    copies, and offer one action that brings them back in line.

### 6. The "oldest destination" machinery depends on a value users can't easily find - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 5)
* **Affected Scope:** D4 (535-557), steps 33-34, 49, 51, 61; setting at line 940
* **Discrepancy Description**: GitHub doesn't publish its Mermaid version, yet v1 builds five things
  around that value:
  * a hand-made table;
  * a CI keyword check;
  * a VS Code setting;
  * a checker flag;
  * a new input on the public tool, which is permanent API and costs tokens on every turn.

  The value lives in three places and goes stale. Step 51 lists `--oldest-mermaid` only under
  `check`, not `mcp`. The table's `pele` column repeats Pele's own `supports()`.
* **Rationale & Recommendation**: Ship the beta-suffix warning plus Pele's own "unsupported" verdict,
  and defer the rest. Version 1 only ever adds fields, so adding them later breaks nothing.

### 7. "No project file" spreads configuration across four places - Severity: Major

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 4)
* **Affected Scope:** D3, D4 (547-551), D7 options, `agent-setup/connect.ts`
* **Discrepancy Description**: Configuration is spread across:
  * the oldest destination: a per-workspace VS Code setting, copied once into a user-scope agent
    registration, and a CI flag;
  * targets: a comment in each diagram.

  Where a repository's diagrams are published belongs to the repository, yet it is stored per user.
  The Problems panel and the agent can disagree, which breaks Goal 5.
* **Rationale & Recommendation**: Discover the nearest project file by walking up from the checked
  file, as EditorConfig does. Keep the comment as a per-diagram override and the user flag as a
  fallback. The file holds only verdict settings (targets, oldest version), never images, links or
  limits.
* **Note:** this conflicts with the author's D3 choice and with finding 6, which recommends deferring
  the oldest-destination value.

### 8. The lazy Mermaid.js worker trades memory against latency; one 2 s limit covers both - Severity: Major

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 3)
* **Affected Scope:** Technical Plan section 4, D1 resource use, step 0, `platform/node/worker-pool.ts`
  (L357-358, 477-484, 801-803, 861-863, 944, 1031-1035)
* **Discrepancy Description**:
  * **Start-up can trip the limit.** Worker start-up ("up to 2 seconds") equals the per-check limit.
    On a cold or slow machine the first check can time out while loading, so the worker restarts
    and pays the cost again. The CLI cold-starts every run, so it exits 2 for a valid diagram.
  * **Memory is never released.** The loaded worker is never stopped, and the same applies per
    VS Code window.
  * **Step 0 measures the wrong thing.** It picks the stand-in by bundle size, not resident memory.
  * **Dropped calls get nothing.** Over-capacity or dropped queue calls have no defined result.
* **Rationale & Recommendation**:
  * Separate a start-up budget (20-30 s) from the per-block limit, never killing a worker for a slow
    start.
  * Warm the Mermaid.js worker as soon as a target needs it.
  * Stop it after a few idle minutes.
  * Choose the stand-in by resident memory, and also test a minimal purpose-built shim.
  * Remember timeouts by content hash.
  * Return an explicit "tool" result for dropped calls.

### 9. Agents only get a Mermaid.js syntax check, while CUJ 1 says "OK from both renderers" - Severity: Major

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 5)
* **Affected Scope:** Overview (L12, 17-18), Non-Goals (128-130), `core/renderers/mermaid` (277), result
  format (299, 333-338), CUJ 1 (170)
* **Discrepancy Description**: The Mermaid.js verdict comes only from `parse()`. Errors Mermaid.js
  raises only while drawing never reach the agent or the Problems panel, and results don't state how
  deep each verdict goes.
* **Rationale & Recommendation**: In the step 0 spike, try `mermaid.render()` after `parse()` in the
  worker, using estimated text sizes and keeping only "completed" or the error. Keep it only if it
  matches browser verdicts on the corpus (for example the Gantt invalid date). Otherwise state the
  depth in every result: Mermaid.js "parsed", Pele "rendered".

### 10. Speculative settings, one of which can't work - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 6)
* **Affected Scope:** step 17 settings (939-946), section 2 `policy` (280), section 4 (357), section 5
  (366-375), Goal 4 (98), Goal 7 (112-114), D2 badge (505-506), steps 46, 56, 71
* **Discrepancy Description**:
  * **`security.allowImages` can't work.** The CSP permits only extension and `data:` images, Pele
    blocks `data:` image URLs, and loosening the CSP breaks Goal 7.
  * **`security.linkSchemes` is redundant**, because links already ask before opening.
  * **`limits.*` has no stated need.**
  * **`checkTimeoutMs` exists only in VS Code**, so the agent and the editor can time out differently.
  * **`preview.autoDirection` opts into what Goal 4 promises not to do.**
* **Rationale & Recommendation**: Hard-code the policy and keep only `preview.defaultRenderer` and
  `diagnostics.enabled`. That also removes the machine-scope enforcement code and its tests.

### 11. Hand-written Markdown fence detection where a CommonMark parser fits - Severity: Major

* **Reviewer Lens:** `egm-zoom-out` (finding 7)
* **Affected Scope:** section 2 `blocks` (275), steps 22-23, corpus (1146-1148), import rule (412)
* **Discrepancy Description**:
  * **It drifts from GitHub's rules.** `blocks` is a hand-written CommonMark container parser. Lists,
    quotes, `~~~`, tabs and indentation are exactly where hand-written detection drifts from the
    GFM/CommonMark rules GitHub follows. For example, a top-level fence indented four spaces is an
    indented code block, which GitHub doesn't draw.
  * **The model is too coarse.** One `indent` and one `quotePrefix` per block can't model per-line
    variation, so column mapping drifts on the very cases in the corpus.
* **Rationale & Recommendation**: Use a pure-JS, runtime-neutral parser such as markdown-it or
  micromark to find the `mermaid` fences and their line ranges. Keep custom code only for the per-line
  mapping from prefixes to columns, and allow the parser in the import rules.

### 12. Small extras that cost more than they return - Severity: Nit

* **Reviewer Lens:** `egm-zoom-out` (finding 8)
* **Affected Scope:** D6 (591-598), self-test (385-387), status line (501-502), step 48, Mermaid.js
  theming (507-509), step 8, release gate (93-94, 811-812, 1224-1225)
* **Discrepancy Description**:
  * **Checker counters can never reach the report.**
  * **The activation self-test repeats CI.** It also claims to "draw" with Mermaid.js in Node, which
    the design says is impossible.
  * **The status-line hash has nothing to compare against.**
  * **Versioned host-webview messages are needless**, since both come from one build.
  * **Theming Mermaid.js from VS Code colours** makes it look less like GitHub.
  * **`sync-version.mjs` duplicates the build.**
  * **The release gate covers rollback patches too.**
* **Rationale & Recommendation**:
  * Keep `--self-test` for troubleshooting only.
  * Use Mermaid's own `default` and `dark` themes.
  * Drop the hash, or add it to results.
  * Fold version syncing into the build.
  * Limit the hand-run agent check to releases that change the tool description, SKILL.md or a
    renderer.

### 13. The high-level view has drifted from the decisions - Severity: Nit

* **Reviewer Lens:** `egm-zoom-out` (finding 9)
* **Affected Scope:** section 1 (226-263); lines 16, 138, 221-222, 455-456, 646, 700-702
* **Discrepancy Description**:
  * **One worker in the diagram.** The section 1 diagram and text show one worker, but D1 and step 40
    use two.
  * **Drafting leftovers remain:**
    * "open question 7" (line 16);
    * "Telemetry is open question 6" (line 138);
    * "added one at a time" (lines 221-222);
    * "Decision D7 decides whether…" (lines 455-456);
    * "to be confirmed in the Detailed Implementation" (line 646).
  * **One outcome is unrecorded.** Alternative 5 defers to "this section's approval gate" but never
    records the outcome.
  * **The D-sections drop to step-level detail:** UI strings, file names, Pele internals.
* **Rationale & Recommendation**: Update the diagram and text, remove the leftovers, record the
  Alternative 5 outcome (the author approved the section on 2026-11-11), and move details into the
  steps.

### 14. The unsaved-changes warning and the agent-loop counts have no channel - Severity: Nit

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 6)
* **Affected Scope:** D2 status line, D6 local counts, "Copy diagnostic report", Reconciliation item 2
* **Discrepancy Description**:
  * **The agent never learns about unsaved edits.** The agent, which acts on the saved file, never
    sees them.
  * **The report can't hold the loop counts.** The checker's counts live in each agent's process
    memory, so the VS Code report can't include the agent-loop numbers it was designed around.
* **Rationale & Recommendation**: Use a per-user Diagramist state folder as the intermediary:
  * the extension writes unsaved-state records, with hashed paths;
  * checkers write their counters there.

  Disclose this side effect, or make it opt-in.

### 15. The fix loop pays one round per error, and agents must count attempts themselves - Severity: Nit

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 7)
* **Affected Scope:** result format rules (L314, 344, 346), tool description and SKILL.md (352-353,
  640), D6 counters (595)
* **Discrepancy Description**:
  * **One error per round.** One error per renderer call becomes one error per tool call, so each
    further slip costs a full agent turn.
  * **Agents count for themselves.** The "stop after three" rule relies on each agent counting.
* **Rationale & Recommendation**: Measure on the agent-eval set before adopting either of these:
  * **More errors per call:** hide the offending line and re-check, returning up to two more errors
    marked as found by skipping a line.
  * **A stop signal:** when the content changes but the same error returns a third time, add one line
    telling the agent to stop. Keep the verdict itself stateless.

### 16. Destination age is tracked only by diagram keyword - Severity: Nit

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 8)
* **Affected Scope:** D4 compat table (543-546, 1013-1014)
* **Discrepancy Description**: Newer syntax inside an older diagram type, such as new node shapes,
  passes without a warning.
* **Rationale & Recommendation**: In the renderer-upgrade pull request, run the corpus on both the old
  and new Mermaid.js. Turn each case the old version rejects into a pattern-based feature check in the
  same table.
* **Note:** this works against finding 6, which recommends deferring the table.

### 17. A "common font stack" can't be both portable and the measured font - Severity: Nit

* **Reviewer Lens:** `egm-inventive-catalyst` (finding 9)
* **Affected Scope:** D5 SVG export (573-575), Goal 6 (110-111), CUJ 4 (192-193)
* **Discrepancy Description**: Goal 6 and CUJ 4 promise a fixed or bundled font, while D5 uses a
  system font stack. Exported SVGs opened elsewhere can overflow their boxes.
* **Rationale & Recommendation**: Bundle one open-licence font for exports, and embed a subset of it in
  the SVG through `@font-face`. That adds a licence entry and a `font-src` CSP entry.

## Conflicts between findings

* **Findings 6 and 16** pull in opposite directions: one defers the version table, the other extends
  it.
* **Finding 7** (a project file) reopens the author's D3 choice, and partly overlaps finding 1, which
  makes Mermaid.js the default target.

These are left for the resolution step.
