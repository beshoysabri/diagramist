# Consolidated Goldfish Review Report

**Target:** `docs/designs/diagramist.md` (1,245 lines; FeatureRange 1-849, DetailedRange 850-1245)
**Mode:** `egm-review`, uninterrupted. All five stages ran in order without pausing; the design was not
edited between stages.
**Date:** 2026-11-11

## Reviewer status

| Stage | Reviewer | Status | Blocker | Major | Nit | Report |
| --- | --- | --- | --- | --- | --- | --- |
| 5 Initial Zoom Out | `egm-zoom-out` | completed | 0 | 7 | 2 | [zoom_out_report.md](zoom_out_report.md) |
| 5 Initial Zoom Out | `egm-inventive-catalyst` | completed | 0 | 5 | 5 | same |
| 6 Comprehension | `egm-comprehension` | completed | 0 | 13 | 7 | [comprehension_report.md](comprehension_report.md) |
| 7 Critic | `egm-design` | completed | 1 | 12 | 6 | [critic_report.md](critic_report.md) |
| 7 Critic | `egm-structural` | completed | 1 | 5 | 4 | same |
| 7 Critic | `egm-style` | completed | 2 | 14 | 8 | same |
| 8 Intermediate Zoom Out | `egm-zoom-out` | completed | 1 | 7 | 1 | [intermediate_zoom_out_report.md](intermediate_zoom_out_report.md) |
| 9 Implementation Readiness | `egm-implementation-readiness` | completed | 4 | 15 | 2 | [implementation_readiness_report.md](implementation_readiness_report.md) |
| 9 Implementation Readiness | `egm-codebase-details` | completed | 3 | 22 | 4 | same |
| 9 Implementation Readiness | `egm-style` | completed | 1 | 15 | 12 | same |

That is 179 raw findings. After merging duplicates there are **30 action items**: 8 🔴 Blocker, 20 🟡
Major and 2 🟢 Nit. Three further recommendations are declined, and one is contested.

Every reviewer ran as a fresh general-purpose subagent. Each first read its persona file from the
pinned EGM commit `e9e1f06` and was told to stay read-only. None had web access.

## What the review says

The core idea held up: no reviewer argued against an agent-callable checker with a VS Code preview.
The serious problems are elsewhere.

* **Some promises outrun what the design does.**
  * "Works on GitHub" rests on a parse-only Mermaid.js check, at a version GitHub may not run.
  * "No network, ever" sits next to an `npm install -g`.
  * "Same verdict in the editor and the agent" ignores unsaved edits and versions that drift apart.
* **One default drives most of the complexity.** Making Pele a must-pass renderer creates false errors
  for diagrams bound for GitHub, and about seven proposed patches exist only to work around that.
* **The implementation plan is not yet buildable as written.** It has no phases. Its import rules
  contradict its own wiring. The two-worker check has no defined execution model, and the public
  result format has gaps that would become permanent.

Most fixes remove things rather than add them. The Stage 8 reviewer's "smallest coherent set of
changes" is the backbone of the plan below.

## Action items

**Needs the author** marks items that reopen a decision the author made, or change an approved goal.

### 🔴 Blockers

**CA-01. Make Mermaid.js the default must-pass renderer.** *Needs the author: reopens D3.*

* **Change:**
  * Both renderers always run on every block.
  * Mermaid.js failures are errors by default. Pele failures are warnings, and Pele's verdict becomes
    binding when the user exports with Pele.
  * `%% diagramist: targets=pele` (or `mermaid,pele`) opts a diagram in to Pele as a must-pass
    renderer. `targets=none` marks deliberately broken examples.
* **What this removes:**
  * the conditional skip of Mermaid.js;
  * the "not run" state;
  * the need for a project file or CLI flag for targets;
  * the CUJ 1 and CUJ 5 wording problems.

**CA-02. Add a lean "Risks & Limits" section.** This is the H2 the feature-spec standard requires.

* **Risks:** about nine, one line each, giving impact, mitigation (with a link to its section) and
  residual risk:
  * check depth and the version gap with destinations;
  * disagreement between the renderers;
  * launch failures (Windows, Node version managers, EACCES);
  * version drift between extension and checker;
  * memory per session;
  * reading arbitrary paths;
  * a webview frozen by one diagram;
  * the npm name and publish token as a supply-chain dependency;
  * the support matrix for a single maintainer.
* **Limits:** a table listing only limits that code enforces: 1 MB per file, 50,000 characters per
  diagram, 2 s per block, the output cap, the package-size gate, and the PNG canvas limit.
* **Moves here:** the still-open unknowns, each naming the decision it affects.

**CA-03. Word every verdict by what was actually checked.**

* **Change:**
  * Mermaid.js verdicts say "parses with Mermaid.js 12.3.0"; Pele verdicts say "renders with Pele
    1.13.0".
  * Remove "works on GitHub and Notion" and "render where they will be used".
  * Each result's text says the check depth per renderer. The Overview states that GitHub and Notion
    may run other Mermaid.js versions.

**CA-04. State the privacy promise exactly.**

* **Change:**
  * Say "makes no network requests at run time".
  * The optional, user-confirmed `npm install -g` in "Connect AI agent" is the one stated exception,
    also named in the README.
  * Images are always off; there is no setting for them.
  * Goal 7's measure becomes: tests fail on any attempted outbound connection. Every test suite that
    can run without a network does so.

**CA-05. Split the implementation plan into phases, each with a "done when" gate.**

* **Phases:**
  * **P1:** skeleton, tsconfigs, build, import rules and CI, plus the core modules, the corpus with
    hand-verified expectations, and unit tests.
  * **P2:** the step 0 spike, run against P1's corpus.
  * **P3:** the checker (workers, CLI, MCP server, self-test), with contract, CLI and offline tests,
    plus the agent evaluation (see CA-06).
  * **P4:** the extension shell and diagnostics.
  * **P5:** the preview, the CSP and webview tests.
  * **P6:** export.
  * **P7:** agent setup and the diagnostic report.
  * **P8:** docs, packaging and release.
* **Each phase:** lists its files and is gated by named Verification Plan commands. CI runs only the
  suites that exist so far.

**CA-07. Add entry files and complete the import rules.**

* **Entry files:** `src/entries/{cli,extension,webview,pele-worker,mermaid-worker}.ts` are the only
  modules allowed to combine features. Each has an esbuild entry, a format and an output.
* **Fewer features:**
  * merge `checker` and `cli` into one feature, which owns the self-test;
  * fold `export` into `preview`;
  * fold the diagnostic report into `agent-setup`;
  * move the theme map to the webview layer.
* **Drawing:** browser-only `draw` modules for each renderer, importable only from `*/webview/**`,
  are type-checked by a webview tsconfig that includes the DOM library. Pele drawing reuses `mount()`'s
  own error display.
* **Forbidden imports:**
  * `server/**` and `platform/node/**` may not import `vscode` or `platform/vscode/**`;
  * `webview/**` may not import `platform/node/**`.

  State the `skipLibCheck` choice for library DOM types.

**CA-08. Define the checker's execution model.**

* **Asynchronous calls:** `checkText` and `RendererAdapter.check` return promises. `mermaid.parse()`
  is asynchronous, which was checked.
* **A coordinator on the main thread:** it reads the file, finds blocks, resolves targets, sends each
  block to the Pele worker and the Mermaid.js worker, and merges the verdicts.
* **Message schema:** define the messages between the coordinator and each worker.
* **Timeouts:**
  * the timeout applies per block, and its clock starts when the worker reports it is ready;
  * a separate start-up budget of 20 s;
  * the worker restarts on a crash or a timeout.
* **No dropped requests:** the MCP server and CLI never drop a request. A bounded queue with
  "superseded" results applies only to diagnostics.
* **Exit codes:** 2 if any tool or input problem, else 1 if any error, else 0.
* **One worker or two:** in step 0, try Pele's public `measurer` option under jsdom. If it works, use
  one worker.
* **Redraw:** section 1's diagram and text to match.

**CA-09. Pin result format version 1 as an exact JSON Schema in the plan.**

* **Fields:**
  * file-level `status`: `ok`, `no-diagrams`, `not-found`, `too-large`, `not-text` or `bad-input`;
  * one position form, `position: { line, column, diagramLine, diagramColumn } | null`, plus
    `anchorLine`;
  * `targets` and `targetsFrom`;
  * `retry` defined for every class, false for "tool".
* **Names and codes:**
  * Rename the per-block notices (`notices`) so they are distinct from errors with severity "warning"
    from renderers that aren't targets.
  * Define Diagramist's own code lists for Mermaid.js errors and for notices.
* **Text form:** one exact grammar, with golden examples for an error, a warning, an error without a
  position, a passing block, the header, the summary and the truncation note.
* **Caps:** exact output caps in characters, with the relation to Goal 1's token budget stated.

### 🟡 Major

**CA-06. Decide at P3 whether the MCP server ships in v1.** *Needs the author: reopens the framing of
D1 and D7.*

* Run the Goal 3 agent evaluation first with the CLI plus `SKILL.md`, since all three agents have a
  shell.
* Ship the MCP server in v1 only if it measurably improves convergence or an agent needs it. Adding it
  later breaks nothing.
* If it ships, keep it as small as CA-10.

**CA-10. Make the MCP contract smaller.**

* **Output:** text content only, with no `outputSchema`. The JSON form lives in `diagramist check
  --json`.
* **Inputs:** either `path` (resolved against the server's working directory) or `text` (exactly one
  diagram, with positions counted from its first line). Passing both is an input error.
* **Removed:** the `block` and `oldestMermaid` inputs. `isError` is used only for tool or input
  problems.

**CA-11. Path and content safety.**

* Accept only regular `.md`, `.markdown`, `.mmd` and `.mermaid` files, after resolving the real path;
  refuse anything else without echoing its content.
* Wrap snippets as untrusted data.
* Log error messages, which contain diagram text, only at trace level.
* Strip remote references from exported SVG.

**CA-12. Map every Mermaid.js and Pele error shape.**

* **Mermaid.js shapes:**
  * jison errors: `hash.loc` columns count from 0, so add 1 (checked);
  * Langium errors: no position, so anchor to the block;
  * unknown type;
  * any other exception.
* **Messages:** extract the "Expecting … got …" line and shorten the token lists.
* **Classes:**
  * an unknown first keyword is "invalid", with `retry: true` and a "did you mean" hint, using Pele's
    `detectType()`;
  * only known external types such as `zenuml` are "unsupported".
* **Tests:** one corpus case per error shape.

**CA-13. Decide the webview Content Security Policy.**

* Scripts load by nonce. `style-src` allows inline styles, which the renderers' SVG needs; the CSS
  injection risk is noted, with no script execution possible.
* PNG export uses a `data:` URL.
* The webview tests run under the exact production policy.

**CA-14. Run diagnostics on the saved file.**

* **When:** on open, on save, and on changes from outside the editor. As-you-type feedback stays in
  the preview.
* **Scope:** open documents, plus `**/*.{md,markdown,mmd,mermaid}` files that change on disk inside
  the workspace, excluding `node_modules`.
* **Goal 5** becomes "the same verdict for the same saved file and the same versions".

**CA-15. Defer D4's version machinery.** *Needs the author: reopens D4.*

* **Keep:** the beta-suffix warning. When Mermaid.js passes and Pele says "unsupported", warn "newer
  diagram type; may not render on older Mermaid".
* **Drop for v1:** the version table, its CI check, the VS Code setting, the `--oldest-mermaid` flag
  and the tool input.

**CA-16. Hard-code the policy and keep two settings.**

* **Keep:**
  * `diagramist.preview.defaultRenderer` (default `mermaid`);
  * `diagramist.diagnostics.enabled` (default `true`).
* **Drop:**
  * `security.allowImages`, `security.linkSchemes` and `limits.*`;
  * `checkTimeoutMs` and `preview.autoDirection`;
  * the layout badge, and the code and tests that enforce machine scope.
* **Name the keybinding** and its `when` clause.

**CA-17. Make agent setup thinner and safer.**

* **Use each agent's own commands:**
  * `mcp add` and `mcp remove` run in a visible terminal, with a Windows `cmd /c` form;
  * status comes from the agents' own `mcp list` or `mcp get`.

  So there is no config-file parsing and no TOML parser.
* **Shared skill folder:** never delete the shared `~/.agents/skills/diagramist`; tell the user
  instead.
* **Documentation:** document EACCES and Node version managers.
* **Before P3:** reserve the npm name `diagramist`.
* **Sources:** give each agent command and skill folder a source and check date, or mark it
  unverified, with a verification step before P7.

**CA-18. Detect version drift once.** Keep the bundled core. When the extension activates, run
`diagramist --version` once; if it differs, show a non-blocking notice with the update command.

**CA-19. Find fences with a CommonMark parser** (markdown-it).

* The parser handles fence ranges, info strings, nesting, unclosed fences and 4-space indents.
* A per-line UTF-16 offset map handles column mapping.
* `.markdown` files are added.

**CA-20. Make export match its claims.**

* **Fonts:**
  * use a system font stack, and relax Goal 6's and CUJ 4's "fixed / bundled font" (*needs the author:
    changes Goal 6*);
  * PNG is exact because it is drawn where the text was measured.
* **Drawing:**
  * export redraws off-screen with the chosen renderer and theme, with `htmlLabels: false`;
  * define the base size (the renderer's natural size × scale) and a canvas cap with a clear error;
  * when no panel is open, open it for the active file, then export.
* **Theme:**
  * include the full `--vscode-*` → `--pele-*` table and the export palettes;
  * generate `styles.css` from the theme map.

**CA-21. Measure memory properly in step 0.**

* **Labels:** mark today's figures as single-thread measurements. Step 0 measures resident memory on
  the real layout, and picks the browser stand-in by resident memory.
* **Inputs to pin:**
  * the candidate versions;
  * hand-verified expected Mermaid.js results for a fixed subset of the corpus;
  * the size metric.
* **Fallback edits:** spell out the packaging edits if jsdom must ship unbundled (externals,
  dependencies, `.vscodeignore`).

**CA-22. Keep only the counts the extension can see.**

* Remove the checker's counters from D6, since nothing can read them.
* The extension keeps per-window counts: checks run, and errors by renderer and code.
* Define these in one module, with a report template and redaction rules.

**CA-23. Complete dependencies and tooling.**

* **Test and schema packages:**
  * a runner for in-host tests (Mocha);
  * `@playwright/test` at 1.65, with the browser source stated;
  * `@vitest/coverage-v8`;
  * `zod` 4, which `@modelcontextprotocol/server` 2.4.0 depends on (checked).
* **Build details:** each bundle's module format, and the `type` and `main` fields in both manifests.
* **Evidence:** record the version checks behind each pin (2026-11-11), including `pele`'s `engines`
  (`>=20`).
* **Release:**
  * define or drop `release:check`;
  * CI runs `npm run package`;
  * add `id-token: write`;
  * name the pre-release mechanism for each registry.

**CA-24. Make the file list exact.**

* Replace globs for hand-written files with named files.
* Add the missing files:
  * entry files and `register` exports;
  * the in-host test index and the webview test page;
  * the test tsconfig;
  * the corpus expectations file and its format;
  * the counts module.
* Fix item 81 (Modify, not Create), the `.gitignore` item (only `coverage/` is new) and the path to
  `packages/diagramist/dist/cli.js`.

**CA-25. Give tests their expected outcomes.**

* **Expected results:**
  * every named corpus case, including the six behaviours verified on 2026-11-11;
  * tests for the worker pool, how setup commands are built, the messages, theme coverage, the export
    command and read-file limits.
* **Measures:** add tests for Goal 1's token budget (measured during the agent evaluation), the 500 ms
  check, preview latency, and Goals 5 and 6. Otherwise relabel them as targets.
* **Setup:**
  * offline coverage that matches Goal 7, with a fallback when `unshare` isn't available;
  * a CI Node matrix of 20 and 22;
  * a Restricted Mode fixture workspace;
  * an `acquireVsCodeApi` stub.

**CA-26. Specify the host-webview messages.**

* **Messages, with their fields:** `ready`, `render`, `status`, `link-click`, `renderer-switch`, `lock`,
  `scroll-to-block`, `unsaved-state`, `export-request` and `export-bytes` (base64).
* **No version field:** both sides come from one build.

**CA-27. One wording pass.**

* **Promises:**
  * "the same verdict for the same saved file and versions";
  * one preview timing (a typing pause, plus a render target);
  * what "one command" means in Goal 3;
  * the targets comment only in the positions that were tested.
* **Behaviour descriptions:**
  * what "Disconnect agent" removes and what it leaves;
  * claims about existing tools narrowed to their listings;
  * CUJ 6: the image isn't shown and no request is made;
  * CUJ 2: the stop-after-three rule.
* **Claims to fix:**
  * replace "No step leaves a design decision" with a short "Left to the implementer" list, or make
    it true;
  * complete the reconciliation list (`hasPosition`, the unmapped `--pele-*` CI check, snippets as
    data).
* **Consistency:**
  * one capitalisation style for command titles, and one name per concept;
  * the full "unofficial" sentence everywhere;
  * cite the source for Node 20, and name the forks or drop the claim.

**CA-28. One editorial pass.**

* **Leftovers:** remove drafting text and stale "open question N" references. Mark each unknown as
  resolved, moot, or moved to Risks.
* **Terms:** define EGM terms once or drop them ("Elephant", "Goldfish", "gate"). Expand MCP. State
  that Pele is a separate implementation of the Mermaid language.
* **Headings:**
  * make "Additional Resources" and "Future Improvements" H2 sections;
  * add the standard's section names in parentheses;
  * turn three labels into H3 headings.
* **Alternatives:**
  * restate their reasons as trade-offs;
  * add Cons for the last two names in Alternative 4;
  * name the evaluated MCP servers;
  * close Alternative 5 in one line;
  * link the brief's decisions once.
* **Repetition:** remove repeated passages.

### 🟢 Nits

**CA-29. Trim small extras.**

* Run the self-test only through `diagramist --self-test`.
* Drop the status-line hash.
* Draw the Mermaid.js preview with Mermaid's own `default` or `dark` theme, chosen by VS Code's theme
  kind. *Needs the author: changes Goal 4's "VS Code's theme colours" for Mermaid.js.*
* Fold version syncing into the build.
* Run the hand-run agent evaluation only for releases that change the tool description, `SKILL.md` or
  a renderer, and record it as a trend with agent and model versions.

**CA-30. Set an upgrade policy.** A renderer upgrade that changes any verdict is at least a minor
release, with a "Validator changes" changelog entry. A Pele or Mermaid.js major version means a
Diagramist major version.

## Declined and contested

* **Declined (Nit): extra error-finding in the fix loop.** Hiding a line to find more errors, and a
  stop signal kept in results, are left out of v1. Revisit with data from the agent evaluation.
  (`egm-inventive-catalyst` 7)
* **Declined (Nit): folder-scan extras.** `.gitignore` handling, `--exclude` and `.mdx` are left out of
  v1, because pre-commit passes file names. `.markdown` is added in CA-19. (`egm-design` 18, part)
* **Declined (Nit): document symmetry.** Bullet markers, bold lead-ins, a template for decision
  records, link styles and anchors. Measures for Goals 5 and 6 are covered by CA-25.
  (`egm-structural` 9-10, `egm-design` 15, part)
* **Contested: links for every "Rejected by author".** The feature-spec standard forbids crediting a
  rejection to a *maintainer* without a link; it says nothing of the document's author, and EGM's
  draft template prescribes "Rejected by author: …". The valid part, restating reasons as trade-offs,
  is in CA-28. (`egm-structural` 3, part; `egm-design` 13, part)

**Heavier variants not adopted.** Each of these is covered by a lighter fix in the item named, as
Stage 8 recommended:

* a project file (CA-01, CA-15);
* `mermaid.render()` under jsdom (CA-03);
* preview render failures in the Problems panel (a residual risk in CA-02);
* `resourceLimits`, restart after N checks, idle stop, remembered timeouts and a purpose-built shim
  (CA-21, if measurements show a need);
* an absolute Node path in agent configs (CA-17);
* a long-lived checker child and one-click drift fixes (CA-18);
* font embedding and a pixel-diff test (CA-20);
* a shared state folder (CA-14, CA-22).

## Conflicts resolved

| Conflict | Resolution |
| --- | --- |
| Defer the version table (stage 5, zoom-out 5) vs extend it (stage 5, inventive 8; stage 7, design 5) | Defer (CA-15). The "Mermaid.js passes, Pele says unsupported" signal comes free. |
| Project file (stage 5, inventive 4) vs comment only (D3) | Neither is needed once Mermaid.js is the default (CA-01). The comment covers Pele-only diagrams. |
| Grow agent setup (stage 7, design 8-9) vs shrink it (stage 5, zoom-out 4) | Shrink it, with the agents' own commands (CA-17), plus one version check (CA-18). |
| More settings with checker flags (stage 6, 4; stage 9) vs fewer settings (stage 5, zoom-out 6) | Fewer: hard-code the policy (CA-16). |
| Split renderer folders (stage 5, inventive 10) vs draw in the webview (stage 8, 7) | Browser-only draw modules imported only from webview code (CA-07). |
| Ship MCP as the main channel (D1, D7) vs CLI first (stage 8, 3) | Decide with data at P3 (CA-06). |

## Traceability Matrix

Raw finding numbers are as they appear in each stage report.

| Stage | Reviewer | Finding → action item |
| --- | --- | --- |
| 5 | zoom-out | 1→CA-01; 2→CA-07; 3→CA-05; 4→CA-17, CA-18; 5→CA-15; 6→CA-16; 7→CA-19; 8→CA-29, CA-22; 9→CA-28, CA-08 |
| 5 | inventive-catalyst | 1→CA-18; 2→CA-01; 3→CA-08, CA-21; 4→CA-01, CA-15 (project file not adopted); 5→CA-03; 6→CA-14, CA-22; 7→declined; 8→CA-15; 9→CA-20; 10→CA-07 |
| 6 | comprehension | 1→CA-08, CA-28; 2→CA-01, CA-09; 3→CA-10; 4→CA-16, CA-04, CA-27; 5→CA-08; 6→CA-12, CA-01; 7→CA-07; 8→CA-22; 9→CA-20; 10→CA-28; 11→CA-28; 12→CA-03; 13→CA-17; 14→CA-28; 15→CA-09; 16→CA-09; 17→CA-14; 18→CA-09, CA-25; 19→CA-05, CA-21; 20→CA-27, CA-16, CA-26, CA-23 |
| 7 | design | 1→CA-02; 2→CA-11; 3→CA-03, CA-02; 4→CA-12; 5→CA-01; 6→CA-08; 7→CA-21; 8→CA-17; 9→CA-18; 10→CA-10, CA-25; 11→CA-13; 12→CA-20; 13→CA-28, contested in part; 14→CA-28; 15→CA-27, CA-29, CA-25; 16→CA-04; 17→CA-07; 18→CA-19, declined in part; 19→CA-30 |
| 7 | structural | 1→CA-02; 2→CA-08, CA-28, CA-01, CA-20; 3→CA-28, contested in part; 4→CA-28; 5→CA-09, CA-27; 6→CA-28; 7→CA-28; 8→CA-28; 9→declined; 10→declined |
| 7 | style | 1→CA-03; 2→CA-04, CA-16; 3→CA-08; 4→CA-27, CA-14; 5→CA-09; 6→CA-09; 7→CA-27; 8→CA-27, CA-25; 9→CA-20; 10→CA-27; 11→CA-28; 12→CA-28, CA-02; 13→CA-21; 14→CA-27; 15→CA-29; 16→CA-17, CA-27; 17→CA-27; 18→CA-28; 19→CA-28; 20→CA-27; 21→CA-27; 22→CA-27; 23→CA-27, CA-22; 24→CA-09, CA-11 |
| 8 | zoom-out | 1→CA-01; 2→CA-14; 3→CA-06; 4→CA-08, CA-12, CA-09, CA-21; 5→CA-10, CA-11, CA-13, CA-03, CA-04, CA-27; 6→CA-02, CA-22, CA-29, heavier variants not adopted; 7→CA-15, CA-17, CA-07, CA-16, CA-29; 8→CA-05 (order of work); 9→CA-08, CA-21 |
| 9 | implementation-readiness | 1→CA-05; 2→CA-07; 3→CA-08; 4→CA-09; 5→CA-21; 6→CA-10, CA-15; 7→CA-09; 8→CA-24; 9→CA-23; 10→CA-25; 11→CA-12; 12→CA-13, CA-16, CA-27, CA-26; 13→CA-19; 14→CA-17; 15→CA-26, CA-20; 16→CA-16; 17→CA-14; 18→CA-09, CA-15; 19→CA-22; 20→CA-20; 21→CA-23, CA-28, CA-29 |
| 9 | codebase-details | 1→CA-05; 2→CA-08; 3→CA-09; 4→CA-10, CA-15; 5→CA-07; 6→CA-07; 7→CA-12; 8→CA-12; 9→CA-13; 10→CA-08; 11→CA-19, CA-10; 12→CA-14; 13→CA-17; 14→CA-20; 15→CA-20; 16→CA-16, CA-27; 17→CA-15; 18→CA-11; 19→CA-22; 20→CA-16; 21→CA-07; 22→CA-23; 23→CA-24; 24→CA-25, CA-26; 25→CA-23; 26→CA-09; 27→CA-27; 28→CA-23, CA-08; 29→CA-29 |
| 9 | style | 1→CA-07; 2→CA-27, CA-16, CA-20, CA-08; 3→CA-01, CA-08, CA-09; 4→CA-09; 5→CA-09; 6→CA-16, CA-15; 7→CA-14; 8→CA-21, CA-05; 9→CA-17; 10→CA-25; 11→CA-09; 12→CA-16; 13→CA-29; 14→CA-22; 15→CA-23, CA-26; 16→CA-27; 17→CA-24, CA-21; 18→CA-28; 19→CA-28; 20→CA-27; 21→CA-27; 22→CA-27; 23→CA-27, CA-14; 24→CA-25; 25→CA-16; 26→CA-23; 27→CA-27; 28→CA-27 |
