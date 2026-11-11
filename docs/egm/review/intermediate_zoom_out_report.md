# Goldfish Review Report: Stage 8 (Intermediate Zoom Out)

**Target:** `docs/designs/diagramist.md` (`full file, lines 1-1245`)
**Standard:** `zoom-out-standard.md`
**Inputs besides the target:** the stage 5, 6 and 7 reports. The design was not edited between stages,
because this was an uninterrupted run. The reviewer was asked to separate essential fixes from
over-engineering and conflicts. Context: the brief and the Pele README, API, compatibility and
security pages.

## Reviewer Status

| Reviewer | Status | Blocker | Major | Nit |
| --- | --- | --- | --- | --- |
| `egm-zoom-out` | completed | 1 | 7 | 1 |

## Findings (unedited)

**1. Severity: Blocker. One default, D3's "both renderers must pass", causes most of the stage 6–7 add-ons. Change the default instead of adding them.**
- **Affected Scope:** D3 (520-533, especially 525-526); Goal 2 (82-86); CUJ 1 (163-164); CUJ 5 (195-203); §3 rule (343); D1 (477-478); items 37 (1022-1024) and 40 (1031-1032). Reports: stage 5 #1, #7, #16; stage 6 #2, #6 (second point); stage 7 design 5, design 7 (second paragraph), structural 2 (target granularity, coverage), style 3, style 10.
- **Simplicity Rationale:**
  - **The problem.** GitHub, Notion and documentation sites all draw with Mermaid.js. Pele targets Mermaid 12.1.0 syntax (pele-README L87) and rejects some input that Mermaid.js accepts (pele-site-compatibility L78). With "both" as the default, CI fails on diagrams GitHub draws (D7 exit 1, 611-614), and agents are pushed to rewrite valid diagrams. That is the brief's Blocker 3 again (concepts_brief L155-157).
  - **The patches stages 6 and 7 propose:**
    - a "not checked" verdict state;
    - a field saying where the targets came from;
    - `targets=none`;
    - a `--targets` CLI flag;
    - a table of the syntax gap between the two renderers (design 5; stage 5 #16);
    - a project file (stage 5 #7);
    - retry rules for diagram types only Mermaid.js supports (stage 6 #6).
  - **Fix the default instead (stage 5 #1).**
    - Mermaid.js is the default target.
    - Both renderers always run on every block, and Pele failures are warnings.
    - Pele's verdict counts only when the user exports with Pele. The export already fails visibly when Pele can't draw, so this needs no new mechanism.
  - **What this removes.** The conditional skip of Mermaid.js (D1, items 37 and 40), the "not run" state, the flag, the project file and the syntax-gap table.
  - **What stays.** The existing comment, for the rare diagram that only goes to Pele. `targets=none` is a cheap optional extra for deliberately broken examples.
  - **Next step.** This reopens the author's D3, so it needs his agreement. CUJ 1 and CUJ 5 wording then follow from it.

**2. Severity: Major (missed by stages 5–7). The Problems panel checks unsaved editor text while the agent checks the saved file, so Goal 5 is false by design. Change the input instead of patching the symptom.**
- **Affected Scope:** Goal 5 (103-104); Overview (31); §3 (292-293); §4 (359-360); D2 status line (501-504); item 53 (1073-1074); Reconciliation 2 (1237-1238). Reports: stage 5 #14; stage 6 #17; stage 7 style 4.
- **Simplicity Rationale:**
  - **The mismatch.** Goal 5 promises "the same errors the agent gets". The checker reads the file on disk. The diagnostics re-check the editor buffer after every 400 ms pause in typing.
  - **The earlier patches.**
    - A status-line note (Reconciliation 2).
    - Rewording "same verdict" to "same text" (style 4).
    - A shared per-user state folder (stage 5 #14). This brings shared state between processes back into the stateless design the brief chose (concepts_brief L110-116).
  - **The structural fix.** Diagnostics read the file from disk, using the checker's own reader, on open, on save and on external change. VS Code reloads an open document that has no unsaved edits when its file changes on disk, so no extra file watcher is needed. As-you-type feedback stays in the preview, which already shows errors as text (361-362).
  - **What this removes.** The per-keystroke diagnostics path, stage 6 #17's scope question, and stage 5 #14's state folder.
  - **The trade-off to state.** Problems entries refresh on save, as they do with on-save linters. With that, Goal 5 holds whenever the extension and checker versions match.

**3. Severity: Major (missed). The MCP server causes most of stage 7's new risks, yet nobody weighed shipping the CLI first and MCP later. Let the M1 agent evaluation decide.**
- **Affected Scope:** Overview part 1 (15-20); Goal 1 (70-71); Goal 3 (87-94); D1 (453-467); D7 options (602); D8 (636); §3 tool (350-353); NFR (802-803); items 40, 49-50, 60-63, 69. Reports: stage 5 #3; stage 6 #3, #5; stage 7 design 7, 8a-b, 10.
- **Simplicity Rationale:**
  - **The CLI path is already in the design.** All three agents have a shell tool, and D8's skill already tells them to run `diagramist check <path>` (636). The brief noted that any agent with a shell can use the CLI without setup (concepts_brief L112-114).
  - **Costs that exist only because of the MCP server:**
    - a resident process in every agent session, even sessions with no diagrams (design 7);
    - stdio launch failures with Windows `.cmd` shims and under Node version managers (design 8a-b);
    - structured-output and protocol-version questions behind the token budgets (design 10);
    - the request queue and its drop rules (item 40; stage 6 #5);
    - the tool inputs that still need defining (stage 6 #3);
    - setup automation for three agents (items 60-63).
  - **Costs of CLI only.** A cold start on each call, up to about 2 s when Mermaid.js loads (NFR 801). Each agent's command allowlist must also be documented; these are still unknown, like the MCP pre-approval settings at 149-150.
  - **D7 never offered this.** Its options were "CLI as well" or "MCP only".
  - **Recommendation.** At M1 (stage 5 #3), run the Goal 3 evaluation with the CLI plus SKILL.md. Ship MCP in v1 only if it measurably improves convergence or an agent needs it; it can be added later without breaking anything. If MCP stays, keep it as small as finding 5 says. This changes the Overview's framing, so it needs the author.

**4. Severity: Major. Essential for v1 from stages 6–7 (runtime and agent loop). Each item is small.**
- **Affected Scope:** §1 (226-266); §2 (286-288); §4 (357-358); D1 (480-484); D7 (611-614); items 26 (985-991), 37, 40 (1031-1035). Reports: stage 6 #1, #5, #6, #16; stage 7 design 4, 6, 7 (first bullet), style 3, 5, 13; stage 5 #8 (first bullet).
- **Simplicity Rationale:**
  - **Draw the real topology once.** In each process, a coordinator on the main thread does the following, and a file with no diagrams starts no worker:
    - reads the file;
    - finds the blocks;
    - resolves the targets;
    - sends each block to the Pele worker and the Mermaid.js worker;
    - merges the verdicts.
  - **Separate the start-up deadline from the per-block limit.** Otherwise the first Mermaid.js check can time out, restart cold and loop, and the CLI exits 2 on valid input.
  - **Three one-line rules (design 6b-d):**
    - class "tool" sets `retry: false`;
    - each renderer's verdict stands alone;
    - state which exit code wins when both kinds of failure occur.
  - **The MCP server and CLI never drop a request.** "Newest request for the same file wins" applies to diagnostics only.
  - **"No diagram type detected" should be "invalid", not "unsupported".** As written, a misspelled keyword gets `retry: false` and a hint not to edit (line 989). Keep "unsupported" for known plugin types such as ZenUML.
  - **Mermaid.js has two error shapes:** jison errors with `hash.loc`, and Langium errors with no position.
    - Fall back to the block's first line when there is no position.
    - Give Mermaid.js errors a short code list that Diagramist defines.
    - Add one corpus case per shape.
    - Put the rules for extracting messages in item 26, not in the Technical Plan.
  - **Settle two contract terms before v1 freezes them.** Choose one representation for "no position" (stage 6 #16), and give the two meanings of "warning" separate names (style 5).
  - **Memory figures.** Label them as measured on a single thread, and measure once more on the real two-worker layout.

**5. Severity: Major. Essential for v1 from stages 6–7 (contract, security, wording).**
- **Affected Scope:** §3 (290-353); CUJ 3 (185); D7 (607-608); items 43 (1040-1041), 49 (1057-1059), 55 (1083-1085); §5 (364-378); Overview (12); D3 (525-529); Goal 7 (112-116); D6 (589); Goal 3 (92); Goal 4 (101-102) against D2 (498-499); NFR (815-816). Reports: stage 6 #3, #12, #15, #18; stage 7 Blockers 2-3, design 2, 3, 10, 11, 16, structural 5, style 1, 2, 4, 6, 7, 8, 10, 16.
- **Simplicity Rationale:**
  - **One normative definition.** §3 alone defines the text line and the result format.
  - **Make the MCP contract smaller rather than defining more of it.**
    - Return text only and declare no `outputSchema`; the JSON format lives in the CLI's `--json`.
    - Inputs are `path`, or `text` holding one diagram, with positions counted from the diagram's first line.
    - Relative paths resolve against the server's working directory.
    - Drop the `block` and `oldestMermaid` inputs.

    This answers stage 6 #3 and #18 and design 10 by removal, and inputs can be added later.
  - **Path safety (the cheap part of design 2):**
    - accept only regular `.md`, `.markdown`, `.mmd` and `.mermaid` files, after resolving the real path;
    - mark snippets as data (concepts_brief L247);
    - log error messages only at trace level, because Pele's messages contain diagram text (pele-site-api L34).
  - **Content Security Policy.** Decide the style policy (scripts by nonce, inline styles allowed) and run the Playwright tests under the production policy. Without this decision, the preview may lose its colours (design 11).
  - **One wording pass:**
    - verdicts say "parses with Mermaid.js 12.3.0" and "renders with Pele 1.13.0";
    - privacy is promised "at run time", with the npm install the user agrees to as the one exception;
    - "the same verdict for the same text and versions";
    - one preview timing number;
    - what "one command" means in Goal 3;
    - the targets comment only in the positions that were tested;
    - what Disconnect removes and what it leaves.

**6. Severity: Major. Recommendations that would over-engineer v1: defer or drop them.**
- **Affected Scope:** as cited in each item.
- **Simplicity Rationale:**
  - **Risks section (stage 7 Blocker 1): keep it lean.** The feature-spec standard needs a Risks & Limits section.
    - List about seven risks, one line each, each pointing to the section that mitigates it: parse depth and version gap, renderer disagreement, launch failures, version drift, memory per session, path scope, and a webview frozen by a diagram.
    - The limits table uses only numbers the code enforces: 1 MB per file, 50,000 characters per diagram, 2 s per block, about 4,000 characters of output, 15 MB per package.
    - Add one PNG rule: if the canvas can't be created at the chosen scale, the export says so.
    - Reject design 1's five-field template, which would restate every decision, and any new limit that nothing enforces.
  - **Preview render failures in the Problems panel (design 3).** These would be errors the agent never gets, which breaks Goal 5. Instead, keep corpus cases that parse but fail to render, and one residual-risk line. Defer stage 5 #9's spike that renders Mermaid.js under jsdom: its estimated text sizes can cause false errors.
  - **Path scoping by MCP roots (design 2).** Roots support isn't verified for the three agents. "Read only Diagramist's own entry from agent configs" becomes moot once config parsing is dropped (finding 7).
  - **Memory and timeout machinery:** `resourceLimits`, restarting after N checks, a memory budget (design 7); idle stop, remembering timeouts by content hash, and a purpose-built shim (stage 5 #8). These are premature until the new measurement shows a problem. In step 0, choose among existing browser stand-ins by resident memory.
  - **An absolute Node + `cli.js` command and a setup handshake (design 8).** An absolute path breaks on every Node upgrade, which is the problem D1 and brief finding 2 solved (concepts_brief L123-142). Use the PATH command with a Windows wrapper, document EACCES and version managers, and reserve the npm name now.
  - **Drift machinery:** a long-lived checker child process with a bundled fallback (stage 5 #5); one-click fixes, a self-test through the registered command, a "same minor version" rule (design 9). Keep the bundled core plus one `diagramist --version` comparison when the extension activates.
  - **Font bundling or embedding, and a preview-versus-export pixel test (stage 5 #17; design 12).** Weaken the claim instead. The system font stack is enough: a PNG is drawn where its text was measured, so it comes out exact. State that export re-draws in the chosen theme with `htmlLabels: false`.
  - **Folder scans (design 18).** Skip `.gitignore` and `--exclude`, since pre-commit passes file names. Add `.markdown` only. Stage 5 #11's CommonMark parser fixes nested fences.
  - **Measurement extras (design 15).** Skip a statistically valid Goal 3 gate and changed-only redraws. Record Goal 3 as a trend, with agent and model versions. Pele's `mount` already delays hidden redraws (pele-site-api L207).
  - **State in the checker (stage 5 #14 and #15).** The state folder and the stop signal both add state to a stateless checker. Drop D6's checker counters instead.
  - **Document restructuring:** structural 2's full fold-back, design 13's link for every rejection, structural 7/9/10's symmetry fixes. Fix only the sentences that contradict decisions. Link the brief's "Decisions after the review" (concepts_brief L9-25) once, and close Alternative 5 in one line.

**7. Severity: Major. Recommendations that conflict, and how to resolve them.**
- **Affected Scope:** D4 (535-557); item 17 (939-946); D8 (644-649); items 8, 60-63; §7 (391-417); D2 (505-508).
- **Simplicity Rationale:**
  - **D4, the oldest supported Mermaid version.** Stage 5 #6 defers it; stage 5 #7 wants a project file; stage 5 #16 and design 5 extend the table; design 9 detects stale copies; stage 6 #3 asks which place wins.
    - Defer the setting, flag, input and table, and keep the beta-suffix warning.
    - Pele supports every type in Mermaid 12.1.0 (pele-site-compatibility L10). So when Mermaid.js passes and Pele warns "unsupported", the diagram uses a newer type. That signal is free.
    - Deferring also removes a workspace value that gets copied into a user-scope registration and a shell command (structural 1).
  - **Agent setup.** Stage 5 #3 and #4 shrink it; design 8 and 9 grow it. Take stage 5 #4:
    - run each agent's own `mcp add` and `mcp remove` in a visible terminal;
    - read status from each agent's own `mcp list` or `mcp get`, with no config parsing;
    - never delete the skill folder that Codex and Gemini share (stage 6 #13).
  - **Keeping the skill current.** Rather than tracking skill versions (stage 5 #5; design 9), make results self-explaining and keep SKILL.md to tips that don't depend on the version. Then drop the version tracking (D8 648-649; item 8).
  - **Code layout.** Combine stage 5 #2 with design 17:
    - merge `checker` and `cli`;
    - keep the self-test only in that merged feature;
    - fold export into the preview;
    - move the theme map to the webview;
    - let the preview webview import the renderers to draw, using `core/policy`. This is lighter than splitting the renderer folders.
  - **Settings.** Stage 5 #10 answers stage 6 #4 and Blocker 3's question about images: images are always off.
    - Drop `allowImages`, `linkSchemes`, `limits.*`, `checkTimeoutMs` and `preview.autoDirection`.
    - Dropping these also removes the layout badge (Reconciliation 6) and items 46 and 71's scope enforcement.
  - **Mermaid.js theme.** Stage 5 #12 conflicts with Goal 4's VS Code colours (97). This is the author's call and isn't needed for v1.

**8. Severity: Major. The smallest coherent set of changes.**
- **Affected Scope:** whole document.
- **Simplicity Rationale:** In this order:
  1. Reopen D3 and D4 as in finding 1, and drop D6's checker counters. These need the author.
  2. Stage the plan in four milestones (stage 5 #3):
     - **M1:** core, CLI and MCP, SKILL.md, then the agent evaluation, which settles finding 3.
     - **M2:** diagnostics and preview.
     - **M3:** export.
     - **M4:** connect and disconnect.
  3. Redraw §1 and add finding 4's runtime rules.
  4. Make diagnostics check the saved file.
  5. Make the MCP contract text-only, make §3 normative, and add the file allowlist and the Content Security Policy decision.
  6. Fix the Mermaid.js adapter: an unknown type is "invalid", both error shapes are handled, and errors get a short code list.
  7. Hard-code the policy and keep only two settings. Merge `checker` and `cli`. The webview draws.
  8. Agent setup uses the agents' own commands, plus one version check.
  9. Use a CommonMark parser to find fences.
  10. Do one wording pass, add a lean Risks & Limits section, and do one editorial pass covering leftovers, unknowns (each naming its decision), jargon and Alternative 5.

  Everything else in findings 6 and 7 can wait. This set mostly removes code rather than adding it.

**9. Severity: Nit (missed). D1 justifies two workers by Pele's private width table, but Pele has a public `measurer` option.**
- **Affected Scope:** D1 (480-484); §1 (232); step 0 (856-864). Context: pele-site-api L109, L357-367.
- **Simplicity Rationale:**
  - **The argument in D1.** Under jsdom, Pele tries to use a canvas to measure text, and its built-in width table isn't exported.
  - **The gap.** `render()` accepts any `measurer`, and pass/fail verdicts don't need exact label widths.
  - **A cheap test.** In step 0, try Pele `render()` with a simple width estimator under jsdom globals. If it works, the one-worker diagram comes back and stage 6 #1 and design 6b and 6f mostly disappear. If not, keep two workers.
