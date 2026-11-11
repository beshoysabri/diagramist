# Goldfish Review Report: Stage 9 (Implementation Readiness Test)

**Target:** `docs/designs/diagramist.md` (`DetailedRange, lines 850-1245`)
**Standards:** `implementation-readiness-standard.md` for `egm-implementation-readiness` and
`egm-codebase-details`. `egm-style` used its persona's own rules.
**Context:** the brief, plus saved copies of the Pele README and the API, compatibility, security and
theming pages. The repository has no source code yet.

## Reviewer Status

| Reviewer | Status | Blocker | Major | Nit |
| --- | --- | --- | --- | --- |
| `egm-implementation-readiness` | completed | 4 | 15 | 1 |
| `egm-codebase-details` | completed | 3 | 22 | 4 |
| `egm-style` | completed | 1 | 15 | 12 |

## Blockers after merging duplicates

1. **The plan has no phases or checkpoints, and step 0 can't run first.**
   *Raised by implementation-readiness 1 and codebase-details 1.*
2. **The import rules contradict the planned wiring.**
   *Raised by implementation-readiness 2 and style 1.*
   * There are no entry files that compose features.
   * Webview drawing has no legal path.
   * Nothing stops checker code from importing VS Code.
3. **The checker's execution across two workers is undefined.**
   *Raised by implementation-readiness 3 and codebase-details 2.*
   * The signatures are synchronous although Mermaid's `parse()` and worker calls are asynchronous.
   * There is no coordinator, no message schema and no unit for the timeout.
4. **Result format version 1 has gaps that would become permanent.**
   *Raised by implementation-readiness 4 and codebase-details 3.*
   * No file-level failure status.
   * No "not run" state.
   * Three ways of representing a missing position.
   * No source for targets.
   * Undefined `retry` for tool errors.
   * No code lists.

## Facts checked by the Elephant (the author's main session) on 2026-11-11

These cover claims the reviewers could not verify from the files they were given.

* **Package versions** were confirmed with `npm view`:
  * `@modelcontextprotocol/server` and `@modelcontextprotocol/client` 2.4.0; the server package
    depends on `zod ^4.2.0` and `@modelcontextprotocol/core 2.4.0`;
  * `typescript` 7.0.2, `esbuild` 0.28.2, `vitest` 5.1.0;
  * `dependency-cruiser` 18.7.2, `@vscode/test-electron` 3.1.0, `@vscode/vsce` 4.1.0, `ovsx` 1.4.0;
  * `playwright-core` 1.65.0, `jsdom` 31.0.0, `@types/vscode` 1.146.0.
* **Node version.** `npm view pele engines` gives `{ node: '>=20' }`, which is the source for "Node 20
  or later".
* **`mermaid.parse()` is asynchronous.** The 2026-11-11 test awaited it.
* **Mermaid.js `hash.loc` columns count from 0.** For an unclosed `[` on line 2, Mermaid.js reported
  `loc.last_line` 3 and `last_column` 3, while Pele reported line 3, column 4. So "`last_column + 1`"
  in item 26 is correct.

## Full findings by reviewer

The reviewers' reports are reproduced unedited below, so that each finding can be traced.

### `egm-implementation-readiness`

#### 1. The plan has no phases or checkpoints
- **Severity:** Blocker
- **Affected Scope:** Lines 850-1209 as a whole: Step 0 (856-864) and inventory items 1-81.
- **Finding & Guidance:** The standard requires incremental phases that each leave the code buildable and testable. This plan does not have them.
  - After Step 0 there is one flat 81-item inventory, grouped by file type.
  - Every test (items 66-73) comes after every feature, so no intermediate state is ever shown to build and pass tests.
  - Step 0 says "before anything else", but it cannot run first. It needs the manifest and build (items 1, 7), the Mermaid.js adapter (26), the Mermaid worker entry (42) and the corpus with expected results (66).

  Split the work into ordered phases. Give each phase its exact file list and a "done when" gate made of Verification Plan commands. For example:
  1. Skeleton, tsconfigs, build, dependency rules and CI, plus the pure core modules, corpus and unit tests.
  2. Step 0, run against that corpus.
  3. Workers, read-file, logger, MCP server, CLI and self-test, with the contract, CLI and offline tests.
  4. Extension shell, settings, trust, logging and diagnostics, with the extension tests.
  5. Preview, CSP and Playwright tests.
  6. Export.
  7. Agent setup and the diagnostic report.
  8. Docs, packaging and release.

#### 2. The import rules contradict the planned wiring, and no composition-root files are listed
- **Severity:** Blocker
- **Affected Scope:** Rules at lines 410-415 and item 10 (901-903). Items 4-5 (882-886), 7 (889-896), 25-26, 49, 51-52, 54, 56, 58-59, 62, 64-65.
- **Finding & Guidance:**
  - **Cross-feature imports.** "Features … never each other" (line 413) forbids these:
    - `diagramist mcp` is parsed in `features/cli/server/cli.ts` (item 51), but the server lives in `features/checker/server/mcp-server.ts` (item 49).
    - The single `webview.js` must contain both `features/preview/webview/main.ts` and `features/export/webview/export.ts`.
    - `export-command.ts` (58) needs the webview owned by `preview-panel.ts` (54).
    - `report.ts` (64) needs agent-setup status (62) and the diagnostics counters.
  - **`src/extension.ts` has no rule.** Item 65 runs `features/cli/server/self-test.ts` from it, but no rule says what `extension.ts` may import.
  - **Drawing in the webview has no legal path.**
    - `webview/main.ts` draws with Pele `mount` (line 1087), but only `src/core/renderers/pele/**` may import `pele` (line 902).
    - Item 25 exposes only `render()`.
    - A core wrapper for `mount(element: HTMLElement…)` or Mermaid's `draw` (line 990) cannot be typed under `tsconfig.core.json`, which has no DOM library (line 882).
  - **Bundles have no entry files.** Item 7 names the output bundles but no entry files. Formats are given only for the extension (CommonJS) and the webview (IIFE); the worker and CLI bundles have none.
  - **Nothing stops checker code importing VS Code.** No rule forbids `server/**` or `platform/node/**` from importing `vscode` or `platform/vscode/**` ("Features import platform" allows it). `tsconfig.node.json` also gives server code the VS Code types (884-886). So the checker crash at start-up that brief finding 9 warns about would pass both lint and typecheck.

  Guidance:
  - List entry files, for example `src/entries/{cli,extension,webview,pele-worker,mermaid-worker}.ts`, as the only modules allowed to combine features. Give each one's esbuild entry, format and output.
  - Move the shared pieces (self-test, counters, the panel handle) into `core` or `platform`, or have the entry files inject them.
  - Decide whether the core adapters expose `mount` and `draw`, and give those browser-only files their own tsconfig.
  - Add forbidden-import rules for `server/`, `platform/node/` and `webview/`.

#### 3. How a check runs across the two workers is undefined, and the core signatures can't work
- **Severity:** Blocker
- **Affected Scope:** Items 24, 37 and 40-42 (976-978, 1022-1024, 1031-1039). Design lines 292-293, 357-358, 480-484 and 801.
- **Finding & Guidance:** `check(text, policy) -> RawVerdict` and `checkText(...) -> CheckResult` are synchronous. But Mermaid's `parse()` has been asynchronous since Mermaid 10, and every call into a worker is asynchronous too. The plan also never says:
  - which thread runs `findBlocks`, `targets`, `compat` and `build-result`. Section 3 says "inside the worker"; D1 says there are two workers.
  - what the messages between the pool and each worker contain. No file defines them; `messaging.ts` covers only host↔webview traffic.
  - whether a request is a whole file or one block. The queue drops "an older request for the same file", but section 4 attributes a timeout to "the block".
  - what happens to the other blocks and to queued requests when a worker is killed.
  - what a superseded request, or a 9th request beyond the 8-slot queue, returns. Every MCP `tools/call` must get a response.
  - whether the 2 s limit includes worker start-up. Line 801 allows the first Mermaid.js check up to 2 s just to load, so on slow machines and CI the first check will report a false `timeout`.

  Guidance:
  - Make the signatures async and specify the worker message schema.
  - Time out each block separately.
  - Name the file that orchestrates the check on the main thread.
  - Define the exact "tool" results and codes for superseded and over-capacity requests.
  - Start the timer only when the worker reports it is ready.

#### 4. Gaps in result format v1 would become permanent if the implementer fills them
- **Severity:** Blocker
- **Affected Scope:** Item 27 (992-994), with items 23, 26, 28, 32, 34, 43 and 49. Design section 3 (295-348) and D3 (530-531).
- **Finding & Guidance:** The format is public, and fields can only ever be added (line 346). Item 27 just points at section 3, which leaves these gaps:
  - **No file-level failure.** There is nowhere to report a missing, unreadable, non-text or over-1 MB file, a folder `path`, or a call with neither `path` nor `text`. Item 43, item 49 and the CLI's exit code 2 all need this, and `--json` must print something in these cases.
  - **No "not checked" state.** `verdicts` requires both renderers, but Mermaid.js isn't run when it isn't a target (lines 477-478, 1031-1032).
  - **No target source.** There is no field for "default" or "comment on line N", which D3 and item 32 require.
  - **Positions disagree.** Section 3 says `position` is an object or null (line 321). Item 23 instead anchors position-less errors to `contentStartLine` with `hasPosition: false`, a field the schema doesn't have.
  - **Undefined values.** `file` for `text` input; which name `type` holds (Pele's `type`, Pele's `mermaidType`, or Mermaid's); and `retry` for class "tool".
  - **No code lists.**
    - Item 26 maps only "No diagram type detected". There are no Mermaid.js codes for parse errors or other exceptions.
    - There are no warning codes for unknown targets, beta types, types newer than the oldest destination, or an ignored theme.

  Put the exact JSON Schema in the plan: names, types, nullability, enums and code lists. Item 27, the MCP `outputSchema` and `--json` then follow from it.

#### 5. Step 0 can't be carried out as written
- **Severity:** Major
- **Affected Scope:** Step 0 (856-864), with items 1, 7, 15, 17, 19, 42 and 81 (873, 923, 952-953, 1038-1039, 1209).
- **Finding & Guidance:**
  - **No oracle.** "Passes every corpus case" has nothing to compare against. If the expected Mermaid.js results are recorded from the jsdom run, jsdom passes by construction.
  - **No size metric.** "Smallest bundle" doesn't say minified, gzipped, or including unbundled dependencies.
  - **Unpinned candidates.** happy-dom and linkedom have no versions.
  - **The fallback clashes with packaging.** "Ship jsdom unbundled … into the VSIX's node_modules" contradicts `.vscodeignore`, which ships only `dist/` and a few files (item 19). It also needs `external: ['jsdom']` in the Mermaid worker bundles and `dependencies` in both manifests, and neither is stated.
  - **Globals left to discovery.** Item 42 leaves open which globals Mermaid.js needs and the rule that they must exist before `mermaid` is evaluated.
  - **The record target is mislabelled.** Results are to be recorded in `docs/designs/diagramist.md`, which item 81 marks "Create at finalization" although the file already exists.

  Hand-verify the expected Mermaid.js results for a fixed subset of the corpus. Define the size metric, pin the candidates, spell out each outcome's edits to the other items, and list the design doc as Modify in this step.

#### 6. MCP and CLI inputs have undefined cases, plus two concrete defects
- **Severity:** Major
- **Affected Scope:** Items 49 (1055-1061), 51 (1064-1068), 61 (1121) and 69 (1161). Design line 357 and D4 line 550.
- **Finding & Guidance:**
  - **Tool inputs with no defined outcome:**
    - both `path` and `text` given;
    - a relative `path` (resolved against what?);
    - a folder `path`;
    - `block` out of range, or used with `.mmd`;
    - whether `text` is one diagram or Markdown;
    - fence stripping (item 31): for `text` only, or for files too? How do positions shift, and is it a warning or an error? A `.mmd` file containing fence lines won't render where it is published.
  - **Results and precedence:**
    - `isError` for a failing diagram versus a tool failure;
    - which wins between the `oldestMermaid` input and the `--oldest-mermaid` flag, and what invalid versions do.
  - **CLI cases:**
    - the exit code when diagram errors and tool problems happen together;
    - explicit files with other extensions;
    - files over 1 MB found while scanning a folder;
    - symlinks;
    - how a parent-process exit is detected.
  - **Defect: `--oldest-mermaid` on `mcp`.** The flag is listed only for `check`, yet Connect (line 1121) and D4 put it on `diagramist mcp`. `parseArgs` in its default strict mode throws on unknown options.
  - **Defect: no timeout control.** Section 4 says the limit can be configured, and the contract test needs 50 ms (line 1161). But the checker has no timeout flag or environment variable. There is also no slow-input fixture that reliably runs past 50 ms (Pele takes under 1 ms).

  Add a table mapping each input case to its outcome. Add `--oldest-mermaid` and a timeout option to `mcp`. Name a test hook that makes a check run slowly.

#### 7. The text output format is inconsistent and underspecified
- **Severity:** Major
- **Affected Scope:** Items 29 (997-1000) and 70 (1163). Design CUJ 3 (185), section 3 (332-339), D7 (607-610) and Goal 1 (80-81).
- **Finding & Guidance:**
  - **Three line formats.** The design gives `file:line:col: renderer: code: message` (CUJ 3), `README.md:42:15 error [Mermaid.js syntax] …` (section 3) and `path:line:col: severity [renderer code] message` (D7).
  - **Undefined parts:**
    - the header line and the line for a passing file;
    - how errors without a position print (never "line 0");
    - how block warnings, which have no position, print;
    - whether `ok` lines appear for passing blocks in a failing file (line 338 shows them);
    - relative or absolute CLI paths, and the summary line;
    - the note shown when output is truncated.
  - **The cap doesn't match Goal 1.** "About 4,000 characters" applies to the whole output, while Goal 1 budgets 1,000 tokens per failing diagram.
  - **`structuredContent` is unbounded.** Nothing limits it, so a file with many failures can exceed the budget even when the text is capped.

  Give an exact grammar, golden examples for each case, and a rule for capping or omitting structured content.

#### 8. The file list is not an exact allowlist
- **Severity:** Major
- **Affected Scope:** Items 12, 66-68, 71 and 81 (906, 1143-1155, 1165, 1209).
- **Finding & Guidance:**
  - **Globs for hand-written files.** `test/core/*.test.ts`, `test/extension/suite/*.test.ts`, `test/fixtures/corpus/` and `test/fixtures/agent-eval/` are globs or directories. The standard allows globs only for generated output.
  - **Missing files:**
    - the entry files (finding 2);
    - the in-host test index that `@vscode/test-electron` loads;
    - the webview test harness page;
    - a tsconfig for `test/**` (none exists, so `typecheck` skips the tests);
    - the corpus expected-results files and their format;
    - the D4 keyword-coverage check;
    - the shared counters module.
  - **Wrong actions:**
    - Item 81 says "Create" for a file that already exists.
    - Item 12 adds `.vscode-test/` and `*.vsix`, which `.gitignore` already has; its existing `dist/` entry already covers `packages/*/dist/`.

#### 9. Dependency and tooling choices are left to the implementer
- **Severity:** Major
- **Affected Scope:** Items 1, 7, 11, 13-15 and 17 (870-953). Verification Plan (1213-1223).
- **Finding & Guidance:**
  - **No in-host test runner.** `@vscode/test-electron` needs a test runner inside VS Code (usually Mocha), and none is listed.
  - **No Playwright test runner.** `playwright-core` has no test runner. The plan doesn't say whether `render.spec.ts` runs under `@playwright/test` (not listed) or Vitest, or where Chromium comes from on each OS.
  - **No coverage provider.** The 90% coverage gate needs a Vitest coverage provider package, which isn't listed.
  - **MCP API not chosen.** The plan doesn't say which MCP server API registers `check`, or whether version 2.4.0 needs a schema library.
  - **Possible name clash.** If "workspace root" means npm workspaces, both packages are named `diagramist` (lines 920, 927), and npm refuses duplicate workspace names.
  - **Manifest fields missing.** Neither manifest gives `type` or `main`.
  - **Scripts with no commands.** `release:check` is never defined, and no script has its command spelled out, including `package` and `test:offline`.
  - **CI gaps:**
    - CI (item 13) never runs `npm run package`, so the 15 MB gate (line 1223) never runs on pull requests.
    - The plan doesn't say which artifact that gate measures.
    - Node versions and the per-OS test list are missing.
  - **No publisher yet.** vsce cannot package without a `publisher`, and none exists yet (line 928).

#### 10. The test plan lacks expected outcomes and leaves features untested
- **Severity:** Major
- **Affected Scope:** Items 66-73 (1143-1180), Verification Plan (1211-1225), Goals 1, 4 and 7, and the NFR at line 800.
- **Finding & Guidance:**
  - **Expected results.** The test cases are named but their expected results aren't given, so the golden files risk just recording whatever the code produces. State the expected result for each named edge case, for example:
    - a fence at line 40 maps to file line 40+n;
    - two emoji add 4 columns;
    - a Gantt chart with an invalid date gives Pele `semantic` with no position, anchored to the block's first line;
    - 50,001 characters gives Pele `limit` / too-large / retry false, plus whatever Mermaid.js does;
    - ZenUML is unsupported by both renderers;
    - the Sankey value `abc` gives Mermaid.js OK plus a Pele warning when the target is `mermaid`;
    - pasted fence lines.
  - **Untested features:**
    - agent setup;
    - redaction in the diagnostic report;
    - the worker pool: the queue bound, superseding, restart, start-up time;
    - read-file limits;
    - the export host command;
    - the CSP string;
    - whether the theme map covers every Pele variable;
    - the D4 coverage check;
    - compat warnings with and without a version set;
    - edge cases in the `targets` comment;
    - MCP input edge cases.
  - **Goals and NFRs with no test:**
    - Goal 1's token budgets;
    - Goal 4's latency;
    - the NFR of 10 diagrams in 500 ms;
    - Goal 7, which requires the whole suite to pass offline, though only the CLI test runs offline.
  - **Methods not given:**
    - how Restricted Mode is tested under `@vscode/test-electron`;
    - the agent-eval procedure and its results format;
    - an exact number for the "about 80 words" limit (line 1062).

#### 11. The Mermaid.js adapter maps only Jison errors and misclassifies typos
- **Severity:** Major
- **Affected Scope:** Items 26 (985-991) and 31 (1006-1010). Design lines 347-348 and Alternative 12 (751-757).
- **Finding & Guidance:**
  - **Langium errors unmapped.** Positions come only from `hash.loc`. Alternative 12 lists twelve types that `@mermaid-js/parser` (Langium) parses, which Mermaid.js uses for them. Their errors are not Jison `hash` objects, and neither they nor other exceptions are mapped.
  - **Typos look "unsupported".** "No diagram type detected" becomes "unsupported", with `retry: false` and a hint not to rewrite the diagram. A typo such as `flowchar LR` lands there, and Pele reports it as `unsupported-diagram` too, so the Goal 3 fix loop stops.
  - **No detection method.** The plan doesn't say how to recognise that error: by class or by message text.

  Add a mapping for Langium errors. Add a rule: if the first keyword is neither in `mermaid-types.json` nor on a known-external list (`zenuml`), the error is "invalid", with retry true and a "did you mean" hint.

#### 12. The webview CSP is likely to break rendering, and the image and placeholder behaviour is undefined
- **Severity:** Major
- **Affected Scope:** Items 55-56 (1083-1095), item 17 (945-946) and item 72. Design section 5 (366-371), CUJ 6 and Goal 7.
- **Finding & Guidance:**
  - **CSP blocks Mermaid styles.**
    - `style-src` allows only the extension's resources and a nonce.
    - Mermaid.js puts a `<style>` element and a `style` attribute in every SVG it renders. Inline styles like these need `'unsafe-inline'` or `style-src-attr`.
    - The exact CSP string isn't given.
    - The Playwright test runs outside VS Code, so it won't catch this unless its harness uses the CSP from `html.ts`.
  - **No placeholder source.** Nothing produces the "remote image blocked" placeholder. Pele with `images: false` drops the image and its docs promise no placeholder; Mermaid.js images are only blocked by the CSP.
  - **`allowImages` does nothing.** Setting `diagramist.security.allowImages: true` has no defined effect: the CSP allows only extension and `data:` images, Pele always blocks `data:`, and Goal 7 forbids network access.
  - **Link handling unspecified.** The plan doesn't say how link clicks are intercepted for each renderer, or what changes in Restricted Mode.

#### 13. Block finding and position mapping are underspecified
- **Severity:** Major
- **Affected Scope:** Items 22-23 (964-975) and 66 (1146-1148).
- **Finding & Guidance:**
  - **One `indent` value isn't enough.** CommonMark removes indentation line by line, so lines indented less than the fence lose fewer columns. A single number gives wrong columns.
  - **Rules not stated:**
    - how a closing fence is matched (same character, at least the same length);
    - how the info string is matched (case, `mermaid title=x`);
    - an unclosed fence at the end of the file;
    - four or more spaces of indent, which makes an indented code block, not a fence;
    - tab stops versus UTF-16 columns;
    - quote prefixes `>` with no space and nested `> >`;
    - list continuation indentation;
    - what `Block.fence` holds;
    - `.markdown` files, and what unknown extensions do.
  - **Ambiguous corpus case.** "Frontmatter" could mean Markdown frontmatter or Mermaid `---` frontmatter. The latter interacts with a `%% diagramist:` comment on the first line.

  Specify the CommonMark subset and store a per-line offset array, in UTF-16 units.

#### 14. Agent setup has a destructive edge case and unspecified details
- **Severity:** Major
- **Affected Scope:** Items 60-63 (1108-1131) and 75 (1193-1199). Lines 149-150.
- **Finding & Guidance:**
  - **Disconnect can delete another agent's skill.** Codex and Gemini CLI share `~/.agents/skills/diagramist/` (lines 1116-1117), and Disconnect deletes the copied folder (line 1131). Disconnecting one agent removes the other's skill. Remove the shared folder only when no connected agent still uses it.
  - **Unspecified details:**
    - what reconnecting does when `diagramist` is already registered, for example to change `--oldest-mermaid`;
    - the exact remove commands (line 1113);
    - the JSON paths read from `~/.claude.json` (user scope versus project entries) and `~/.gemini/settings.json`;
    - how PATH is searched, including Windows `.cmd` shims;
    - the frontmatter key that holds the skill version (items 8, 21, 62);
    - whether an existing skill copy is overwritten.
  - **Unlisted dependency.** Reading `~/.codex/config.toml` needs a TOML parser, and none is listed.
  - **Pre-approval unresolved.** How each agent pre-approves `check` is still an open unknown (lines 149-150). Item 75 has no content for it and Connect doesn't do it, yet Goal 3's loop depends on it.

#### 15. The host-webview protocol and export behaviour are incomplete
- **Severity:** Major
- **Affected Scope:** Item 48 (1050-1051) and items 54, 56 and 58-59 (1078-1107). D5 (564-572).
- **Finding & Guidance:**
  - **Fields missing.** Four message names are listed, but none has fields.
  - **Messages missing.** The planned features also need:
    - a webview-ready handshake;
    - link clicks (line 1092);
    - scroll-to-cursor;
    - the renderer switch and lock;
    - the unsaved-changes state.
  - **Protocol details missing.** Payloads, the version field and the byte encoding for exports are undefined.
  - **Export cases undefined:**
    - Export run from the palette while the panel is closed, or locked to another file;
    - which document gets exported;
    - off-screen drawing when the chosen renderer or theme differs from the panel's;
    - names for single-block `.mmd` files.

#### 16. The settings contract is incomplete and lets the editor and checker disagree
- **Severity:** Major
- **Affected Scope:** Item 17 (935-948) and items 30, 40 and 46. Design line 357 and Goal 5.
- **Finding & Guidance:**
  - **Types and defaults missing.** None are given for `oldestMermaidVersion` (whose scope is also missing), `preview.defaultRenderer`, `diagnostics.enabled`, `security.linkSchemes`, or the keys under `limits.*`.
  - **"Can only be lowered" is incomplete.** It doesn't say what happens to a higher value: clamp, ignore or warn.
  - **Keybinding missing.** No key chord or `when` clause is given.
  - **Editor and checker disagree.** The checker can't read VS Code settings and has no flags for limits or the timeout. If the user lowers either, the Problems panel and the agent's checker give different verdicts, which breaks Goal 5.

  Give the full `contributes.configuration` block. Either add matching checker flags or keep these settings out of diagnostics.

#### 17. Plan and design disagree on which files get diagnostics
- **Severity:** Major
- **Affected Scope:** Item 53 (1071-1077). Design section 4 (359-360).
- **Finding & Guidance:** Section 4 says diagnostics cover "open documents and files changed on disk". Item 53 says "Open documents only". That decides whether files an agent edits but the user hasn't opened show up in the Problems panel (CUJ 1, Goal 5). Also unspecified:
  - the watcher glob;
  - the range used for a point position, and whether Mermaid's `spanStart` is used;
  - where position-less errors and warnings are anchored.

#### 18. Promised warnings and the compat table have no implementation
- **Severity:** Major
- **Affected Scope:** Section 3 (line 309), items 31 and 33-34 (1006-1016), and D4 (543-546).
- **Finding & Guidance:**
  - **Warnings with no producer.** Section 3 promises warnings such as "theme is ignored by Pele". Nothing in the plan produces them: no item detects `%%{init}%%` or frontmatter themes, click callbacks, `$$` math or icon syntax.
  - **D4's coverage check has no file.** It has no file and no method for listing the keywords Mermaid.js recognises.
  - **The table is left to research.** The `introducedIn` values in `mermaid-types.json` are left to the implementer, and the purpose of its `pele` field isn't stated.

#### 19. The diagnostic report can't include the checker's counts as specified
- **Severity:** Major
- **Affected Scope:** Item 64 (1132-1136). D6 (591-598).
- **Finding & Guidance:** D6 says both the extension and the checker keep counts and the report includes them. But the checker is an agent-started process that never talks to VS Code, and counts live only in memory (line 1136), so its counts can never reach the report. Also undefined:
  - what counts as an "attempt" and as an "identical error", given that block indexes shift as diagrams are edited;
  - which module owns the counters;
  - the report's format and its exact redaction rules.

  Decide where counts live (extension only, or a local file the checker writes), define each counter, and give a report template.

#### 20. Theme mapping and export appearance are left to the implementer
- **Severity:** Major
- **Affected Scope:** Items 35 (1017-1019), 57 and 59 (1102-1107). CUJ 4 (192-193), D5 (573-575) and Goal 6 (110-111).
- **Finding & Guidance:**
  - **Font contradiction.** CUJ 4 promises "the bundled font". D5 uses a system font stack ("such as Helvetica, Arial or sans-serif"), and no font file is listed.
  - **Colours not given:**
    - the `--vscode-*` to `--pele-*` pairs, including series 1-8 and `--pele-error`;
    - the high-contrast fallbacks;
    - the Mermaid `themeVariables` keys;
    - the light and dark export palettes.
  - **SVG inlining method undefined.** The plan doesn't say how colours and fonts get written into exported SVGs.

#### 21. Smaller gaps
- **Severity:** Nit
- **Affected Scope:** Items 14, 44, 52 and 65. Lines 145-157 and 853.
- **Finding & Guidance:**
  - **Self-test.** Not stated: where "once per version" is stored, whether failures are shown beyond the log, and the `--self-test` exit code.
  - **Checker logging.** There is no way to set the checker's log level, so "diagram text only at trace" can't be switched on.
  - **Release workflow.** Item 14 omits the `id-token: write` permission that provenance needs, and the npm `next` tag and `--pre-release` flags for odd minor versions.
  - **Open unknowns.** Line 853 claims no decision is left, yet the "Unknowns to verify" list (145-157) is still open. Mark each item resolved, moot or deferred.
  - **Layout.** `features/diagnostic-report/` is missing from the section 7 layout.

### `egm-codebase-details`

1. Severity: Blocker
Affected Scope: Plan as a whole (lines 850-1209); Step 0 (856-864); item 13 (907-909); item 66 (1143-1150)
Discrepancy Description & Rationale: The standard says the work must be split into phases, and each phase must leave the repository buildable and testable. The plan has one spike (Step 0), then a flat list of 81 files grouped by area. All tests sit in one block at the end, with no checkpoints. CI (item 13) runs every suite from the first pull request, so CI can't pass until every file exists. The one ordering the plan does give can't run as written:
- Step 0 must pass "the Mermaid.js part of the regression corpus" (859).
- That corpus and its expected verdicts are only created in item 66.
- Those expected verdicts depend on the adapters in items 25-26.

2. Severity: Blocker
Affected Scope: Items 24, 37, 40-42 (976-978, 1022-1024, 1031-1039); design lines 232, 262-263, 286-288, 292-293, 357-358, 480-484
Discrepancy Description & Rationale: The checker's execution model contradicts itself and is never specified.
- Sections 1-3 describe one worker that runs both renderers. Line 293 says "runs both renderers on each block inside the worker", and lines 286-288 load jsdom before the Mermaid.js adapter in the same entry.
- D1 (480-484) and items 40-42 require two separate workers, because jsdom's globals make Pele try jsdom's canvas. The plan never reconciles the two.
- `checkText(text, fileKind, options, renderers) -> CheckResult` is called "pure, with the renderers injected". But the two renderers live in different threads, so it must be asynchronous and run outside both workers. Its signature also has no path, although `CheckResult.file` needs one.
- `RendererAdapter.check(...) -> RawVerdict` (977) is synchronous. Mermaid's `parse()` is asynchronous in current Mermaid; the provided docs can't confirm this, and the brief only records that it works under jsdom.
- No message format is defined between the main thread and the workers.
- It is not said whether a worker request covers a whole file or one block. So the timeout has no defined unit: section 4 says "the block gets class tool / timeout", but a whole-file request that times out has no block to blame.
- It is not said where block finding, targets, compat and hints run (main thread or worker).

This is the checker's central path, and the implementer would have to design it.

3. Severity: Blocker
Affected Scope: Items 23, 27-29, 32, 37, 49, 51, 70 (969-975, 992-1000, 1011-1012, 1022-1024, 1055-1068, 1163-1164); design lines 185, 276, 305-327, 334-338, 346, 477-478, 530-531, 607, 616, 622-623
Discrepancy Description & Rationale: The version 1 result format contradicts itself in several places. Section 3 (346) and D7 (622-623) declare these formats stable, so whatever the implementer picks becomes permanent.
- **Missing position:** the schema says `position … or null` (321). Item 23 instead anchors the error to `contentStartLine` with `hasPosition: false`, a field the schema doesn't have (973). Section 2 says such errors are "marked that way" (276).
- **Where targets came from:** D3 and item 32 report this as "default" or "comment on line N". BlockResult has only `targets` (307).
- **Renderers that don't run:** D1 (477-478) and items 37 and 40 skip Mermaid.js when it isn't a target. But `verdicts: { mermaid, pele }` has no "not run" state, and CUJ 5 expects a renderer that isn't a target to run and warn.
- **File-level failures:** these include a missing file, a file over 1 MB, a non-text file, no `path` or `text`, an unknown file type, and a file with no diagrams. They have no place in the result, so MCP structured output and `--json` (616) have nothing to return in the exit-code-2 cases. It also isn't said whether MCP returns `isError` instead.
- **Undefined values:**
  - `retry` for class "tool";
  - the snippet when the error is on the first line or has no position;
  - whether `startLine` (305) is the fence line or the first content line (`contentStartLine`, 966).
- **Text line format:** there are three versions, and none covers errors without a position. Items 29 and 70 test "the line format" without saying which.
  - CUJ 3 (185): `file:line:col: renderer: code: message`
  - D7 (607): `path:line:col: severity [renderer code] message`
  - The example at 334: `README.md:42:15 error [Mermaid.js syntax] …`, with no colon after the column.

4. Severity: Major
Affected Scope: Items 49, 51, 61, 69 (1057, 1064-1068, 1119-1122, 1161); design lines 31, 357, 550
Discrepancy Description & Rationale: `diagramist mcp` doesn't accept options that other parts of the plan pass to it.
- Item 51 gives `--oldest-mermaid` only to `check`. D4 (550) and item 61 add it to the agent's `diagramist mcp` command. `node:util` `parseArgs` rejects unknown options in its default strict mode, so the checker would fail to start for every user who has set `oldestMermaidVersion`.
- Gemini's add command (1111) has no `--` separator. An appended `--oldest-mermaid` may therefore be read by Gemini CLI itself rather than passed on (unverified).
- The checker has no flag for the timeout, although section 4 says it "can be configured" (357). The 50 ms contract test (1161) therefore can't set its limit.
- The checker has no flag for `diagramist.limits.*` either. Limits lowered in VS Code would apply in the Problems panel but not for the agent, which breaks "they give the same verdict" (31).
- It isn't said which wins when both the per-call `oldestMermaid` input (1057) and the server flag are set.

5. Severity: Major
Affected Scope: Items 4, 25, 26 (882-883, 979-991); design lines 270-271
Discrepancy Description & Rationale: `tsconfig.core.json` doesn't fit Pele's documented types, and the core is not as runtime-neutral as claimed.
- Pele's API page shows `mount(element: HTMLElement, …)` and `enableZoom(element: HTMLElement, …)` exported from the main `pele` entry (pele-site-api.md 167, 233, 237). Mermaid's types also refer to the DOM.
- A config with "no DOM library" will fail on these declaration files unless `skipLibCheck` is set, and the plan doesn't say to set it. If it is set, the claim that the type checker stops browser APIs (882-883) no longer covers library calls.
- The core's Mermaid adapter also exposes `draw`, which only works in a browser (990-991), and its `check` needs a DOM. Both contradict "imports nothing … that needs a browser page" (270-271).

6. Severity: Major
Affected Scope: Items 10, 24, 25, 56 (901-903, 976-984, 1086-1089); design lines 278, 415
Discrepancy Description & Rationale: The webview has no allowed way to draw with Pele.
- Only `src/core/renderers/pele/**` may import `pele`.
- The adapter interface (977) has only `id`, `version`, `detectType` and `check`, and item 25 defines no drawing method, although section 2 says this adapter "draws anywhere".
- The webview calls "Pele `mount`" directly (1087). That either fails `lint:deps` or forces the implementer to design an adapter API.

Reuse opportunity: Pele's `mount()` already shows the error over the dimmed last drawing and exposes it through `onError` and `error` (pele-site-api.md 186, 198, 205). The plan should say to use these for Pele, including for the `aria-live` announcement. Only Mermaid.js then needs its own dimmed-error view (1089).

7. Severity: Major
Affected Scope: Items 25, 26, 31 (981-982, 989, 1006-1010); design lines 347-348
Discrepancy Description & Rationale: A misspelled diagram header gets class "unsupported", so agents are told not to fix it.
- Pele's `unsupported-diagram` means "No diagram type detected, or the type is not registered" (pele-site-api.md 341). A typo such as `flowchar LR` therefore gets `retry: false`, with a hint not to rewrite the diagram. Mermaid's "No diagram type detected" gets the same mapping.
- Pele's `detectType()` returns `null` for text it doesn't recognise, and it is already in the adapter interface. The plan doesn't use it to tell an unknown keyword (fixable, class "invalid") from a known type that a renderer doesn't support, such as ZenUML.
- Pasted fence lines also cause `unsupported-diagram` (brief 401-402). Item 31 strips them but doesn't say how that shifts `diagramLine` or file positions.

8. Severity: Major (assumptions)
Affected Scope: Item 26 (985-991); items 31, 53; design lines 334, 576-578
Discrepancy Description & Rationale: The Mermaid.js adapter rests on claims the provided documentation can't confirm, and its error mapping is incomplete.
- These Mermaid.js claims can't be verified: the `initialize` options, the "No diagram type detected" message text, `mermaid.render`, `htmlLabels`, and that strict mode "drops click callbacks and cleans labels".
- The brief records only "a 0-based `hash.line` and a 1-based `loc` with first and last line and column" (brief 33). The plan adds 1 to `last_column` (987), which counts twice if those columns are already 1-based. The example `42:15 … got 'NEWLINE'` (334) reads as made up rather than measured.
- There is no list of Mermaid error codes or of how they map to classes beyond one message, including Mermaid's size limits. Diagnostic codes (1076) and the per-code hints (1006) depend on that list.
- `initialize` sets global state. It's not said how preview drawing, export drawing (`htmlLabels: false`) and themes share it.
- A diagram's frontmatter or `%%{init}%%` could turn HTML labels back on. Pele's docs say frontmatter and directives override `config` (pele-site-api.md 131), and nothing in the plan covers this for Mermaid.js. That would put `foreignObject` back into PNG exports (576-578).

9. Severity: Major
Affected Scope: Items 55, 59, 72 (1083-1085, 1102-1107, 1173-1178)
Discrepancy Description & Rationale: The webview's Content Security Policy is likely to block the renderers' own styles.
- `default-src 'none'`, with styles allowed only from extension files plus a nonce, blocks `<style>` elements and inline `style` attributes that scripts insert at runtime.
- Mermaid.js puts a `<style>` block in every SVG. This is widely known but not verifiable from the provided docs. The docs don't say how Pele writes `style` and `classDef` colours.
- The plan doesn't decide the `style-src` rule.
- PNG export through a `blob:` URL would be blocked by `img-src`, but item 59 doesn't require a `data:` URL instead.
- Item 72 doesn't say its test page applies the production policy, so the test can pass while the real panel fails.

10. Severity: Major
Affected Scope: Item 40 (1031-1035), items 42 and 51; design lines 357, 800-801, 944
Discrepancy Description & Rationale: The worker pool's edge cases are undefined.
- **Full queue:** the queue holds at most 8 requests. It's not said what the 9th request gets.
- **Superseded requests:** it's not said what an older request for the same file returns when a newer one drops it, though every MCP call needs a reply.
- **Folder scans:** the CLI scan will go over 8 queued requests unless it throttles itself, which the plan doesn't say.
- **Crashes:** a worker that crashes without timing out has no handling.
- **Startup vs. timeout:** the first Mermaid.js check "may take up to 2 seconds" (801), and the default limit is 2000 ms. If load time counts toward the limit, the first check can time out, and the restart reloads jsdom, so queued requests time out one after another.
- **Mermaid's globals:** "installs only the globals Mermaid.js needs" (1039) doesn't list them. It also doesn't require installing them before `mermaid` loads; loading in the wrong order causes the `DOMPurify.addHook` crash recorded in the brief (29-31).

11. Severity: Major
Affected Scope: Items 22, 23, 43, 49 (964-975, 1040-1041, 1057-1058); design line 275
Discrepancy Description & Rationale: Finding diagrams, mapping positions and handling tool inputs are under-specified.
- **Column mapping:** each block keeps one `indent` and one `quotePrefix`. Columns can't be mapped back for lines whose stripped prefix differs:
  - list continuation lines with less indentation;
  - "lazy" quote lines without the `>` prefix;
  - nested `> >` quotes;
  - tabs, which Markdown expands to 4-column stops while Pele counts UTF-16 units.
- **Fence rules** are undefined:
  - how the info string matches (case, spaces, attributes);
  - the closing fence's length and character;
  - fences that are never closed;
  - code blocks indented 4 spaces;
  - fences inside HTML blocks;
  - frontmatter at the top of a Markdown file.
- **File types:** `fileKindFromPath` doesn't cover `.markdown`, `.mdx`, uppercase extensions or unsupported files.
- **Tool inputs:**
  - `text` could be read as one diagram or as Markdown, and the plan doesn't say which.
  - `block` has no defined meaning and no behaviour when out of range.
  - Relative `path` values have no stated base folder.
  - The "non-text" rule and the expected text encodings are not given.

Reuse opportunity: a CommonMark parser such as markdown-it would give fence line ranges and info strings. The plan should pick it or write out its own algorithm.

12. Severity: Major
Affected Scope: Items 53, 54 (1071-1082); design lines 103-104, 309, 359-360
Discrepancy Description & Rationale: The diagnostics scope contradicts the design, and some cases are undefined.
- Section 4 says diagnostics cover "open documents and files changed on disk". Item 53 says "Open documents only".
- When the editor has unsaved changes, it isn't said whether diagnostics check the editor text or the saved file. The agent checks the saved file, and Goal 5 promises the same errors.
- The file watcher's pattern is not given.
- It's not said how "an agent changed a file" is told apart from any other change on disk, such as a git checkout.
- Also undefined:
  - which URI schemes are checked;
  - where a diagnostic's range ends, and whether Mermaid's `spanStart` is used;
  - whether block-level `warnings` become Problems entries.

13. Severity: Major
Affected Scope: Items 60-63 (1108-1131)
Discrepancy Description & Rationale: Agent setup relies on unverified facts about the agents' CLIs and has one destructive edge case.
- **Unverified facts:** none of these are in the provided docs, and the brief's reviewers had no web access (brief 90):
  - the three `mcp add` commands and the matching remove commands;
  - the config file paths;
  - that Gemini CLI treats `~/.agents/skills` as an alias.
- **Shared skill folder:** Codex and Gemini CLI share `~/.agents/skills/diagramist/`. Disconnecting one agent (1131) deletes the skill that the other, still-connected agent uses.
- **TOML:** reading `~/.codex/config.toml` needs a TOML parser, which is not in the dependency list. The agents' own `mcp list` or `mcp get` commands could be used instead, if they exist (unverified).
- **Not addressed:**
  - environment variables that move the agents' config folders;
  - Windows paths;
  - PATH differences between the extension host and the terminal, for both `diagramist` and the agent CLIs;
  - how Connect learns whether a command it sent to a terminal succeeded;
  - what happens when `npm` is missing.

14. Severity: Major
Affected Scope: Items 35, 57, 59 (1017-1019, 1096-1097, 1103-1104); design lines 110, 193, 574-575
Discrepancy Description & Rationale: The plan gives no theme map and no font values.
- **Colours:**
  - There is no table from VS Code's `--vscode-*` variables to Pele's `--pele-*` variables. Pele documents about 30, including `--pele-fg-on-light/-dark`, `--pele-critical`, `--pele-error`, eight series colours and font and weight variables (pele-site-theming.md 12-46).
  - There is no mapping to Mermaid.js `themeVariables`.
  - There are no colour values for the light and dark export themes.
- **Duplication:** `styles.css` and `theme-map.ts` both hold the map, with no build step linking them.
- **Dropped check:** the brief's CI check for unmapped Pele variables (brief 210-211) was dropped.
- **Font:**
  - CUJ 4 says "the bundled font" (193), but D5 says "a common stack, such as Helvetica, Arial or sans-serif" (574-575), and no font file ships (952-953).
  - Pele sizes labels by measuring them with the font it's given, and its docs say that must be the font used for display (pele-site-theming.md 84-104).
  - The plan sets neither `--pele-font` for the preview nor `fontFamily` for export, so exported labels may not fit their boxes.

15. Severity: Major
Affected Scope: Items 58-59 (1098-1107); item 72; design lines 564-578
Discrepancy Description & Rationale: The export algorithm is left to the implementer.
- **Inlining styles:** it's not said which properties and elements get computed styles written in, or how internal `<style>` blocks, gradient stops and arrow markers are handled.
- **Fixed themes:** it's not said how the light and dark export themes are drawn while the panel shows VS Code's colours.
- **PNG size:** the base size is undefined. It could be Pele's `width`/`height` (pele-site-api.md 138-139) or the SVG's viewBox, and `mount` makes diagrams responsive by default. Item 72's "expected pixel size at 2×" therefore has no defined expected value.
- **No open panel:** D5 allows export only from the panel, but the command also runs from the palette. Nothing says what happens if no panel is open.
- **Defaults:** the default choices and the file-name pattern ("such as `README-2.pele.png`") are left open.

16. Severity: Major
Affected Scope: Item 56 (1094), item 72 (1176); design lines 209, 371, 505-506
Discrepancy Description & Rationale: Two preview behaviours rely on Pele output that its docs don't describe.
- **Layout badge:** Pele's render result reports only `svg`, `width`, `height`, `type`, `mermaidType` and `links` (pele-site-api.md 133-142). Nothing says the direction switched; the docs say only that diagrams "may" switch (158). The plan gives no way to detect it.
- **Image placeholder:** with `images: false`, Pele documents no placeholder, and for Mermaid.js the security policy simply blocks the image. No file or algorithm creates the "remote image blocked" placeholder that CUJ 6 and item 72 expect.

17. Severity: Major
Affected Scope: Items 33-34, 36, 52 (1013-1016, 1020-1021, 1069-1070); design lines 543-546
Discrepancy Description & Rationale: How the compatibility table is used and kept current is not specified.
- **Keyword lookup:** the table is keyed by diagram keyword, but `detectType` returns Pele's own names, for example `railroad` for four keywords and `class` for `classDiagram` (pele-site-api.md 288-301).
  - It isn't said how the keyword is found when frontmatter, `%%` comments and directives come first.
  - It isn't said which name goes into `BlockResult.type`.
- **CI check:** the check that fails "when the pinned Mermaid.js recognises a keyword the table doesn't list" needs a way to list Mermaid's keywords. The plan names no such way (no documented API does this), and no file implements it.
- **Syntax versions:** Pele targets Mermaid 12.1.0 syntax (pele-README 5, 87), but Mermaid.js is pinned at 12.3.0.
  - Results don't state Pele's syntax level, which the brief required (162).
  - The self-test and samples don't say what to expect for types that only one renderer supports.

18. Severity: Major
Affected Scope: Items 29, 49 (997-1000, 1059); design lines 320, 324
Discrepancy Description & Rationale: Text from diagrams reaches agents without being marked as data. Pele's error messages contain diagram source (pele-site-api.md 34; pele-site-security.md 59), and snippets are raw lines from files that may come from cloned repositories (CUJ 6). The brief required snippets to be "marked as data" (brief 247), but both the text form and the structured result pass them through unchanged. That leaves a way to inject instructions into the agent's prompt.

19. Severity: Major
Affected Scope: Items 64-65 (1132-1139); design lines 265-266, 591-598
Discrepancy Description & Rationale: The local counts from D6 have no implementation.
- No module counts:
  - checks run;
  - errors by renderer and code;
  - attempts until the first pass;
  - repeated errors.
- "Attempts until the first pass" is not defined: per file, per block, or by diagram content.
- D6 says the checker keeps counts too. But the checker never talks to VS Code and has no command or tool that shows them, so the diagnostic report can't include them.

20. Severity: Major
Affected Scope: Item 17 (926-948), item 46; design lines 374, 494
Discrepancy Description & Rationale: The settings and contributions are incomplete.
- **No defaults** for:
  - `diagramist.preview.defaultRenderer`;
  - `diagramist.diagnostics.enabled`;
  - `diagramist.security.linkSchemes`, whose type is also missing.
- **`diagramist.limits.*`:** neither the keys nor their defaults are given.
- **`oldestMermaidVersion`:** its format, validation and comparison rule (for example "11.4" against "11.4.0") are open.
- **Keybinding:** the actual key combination is not given.
- **Lock toggle:** there is no command for the preview's lock toggle.
- **Scope:** section 5 says safety settings take "user or machine scope", while item 17 says "machine scope only".

21. Severity: Major
Affected Scope: Item 10 (901-903), item 5 (884-886); design lines 412-415
Discrepancy Description & Rationale: The import rules miss the crash the brief warned about.
- "Features import `core` and `platform`" still lets `server/` code import `vscode` or `src/platform/vscode/**`.
- It also lets `webview/` code import `platform/node`.
- The brief's finding 9 warns that a stray `vscode` import crashes the checker at start-up.
- `tsconfig.node.json` gives `server/**` the VS Code types, so the type checker won't catch it either.

22. Severity: Major
Affected Scope: Item 1 (870-878); Step 0 (861); items 11, 27, 60, 69-72
Discrepancy Description & Rationale: The dependency list is incomplete, so the implementer would have to add packages the plan didn't approve.
- **Coverage:** there is no coverage provider for the 90% threshold; Vitest needs a separate coverage package.
- **Extension tests:** there is no test framework to run the suites inside VS Code.
- **Webview tests:** there is no Playwright test runner (`playwright-core` has none, and `render.spec.ts` uses that runner's naming), and no source for Chromium in CI.
- **TOML:** there is no TOML parser.
- **MCP schemas:** it isn't settled whether registering a tool with MCP SDK 2.x needs a schema library such as Zod or accepts raw JSON Schema (unverifiable).
- **Step 0:** happy-dom and linkedom have no versions.

23. Severity: Major
Affected Scope: Items 7, 12, 19, 66-68, 71, 81; Step 0 (863-864)
Discrepancy Description & Rationale: The list of files to write has defects.
- **Globs for hand-written files:** these are hand-written files listed by pattern or folder, but the standard allows that only for generated output:
  - `test/core/*.test.ts`;
  - `test/extension/suite/*.test.ts`;
  - `test/fixtures/corpus/`;
  - `test/fixtures/agent-eval/`.
- **This design document:** `docs/designs/diagramist.md` is marked "Create at finalization" (1209), but it exists now, and Step 0 writes "Packaging notes" into it first.
- **Missing files:**
  - the Step 0 spike;
  - each feature's `register` export (417);
  - a counts module.
- **Packaging:** `.vscodeignore` ships only `dist/`, `skills/` and the docs, which contradicts Step 0's fallback of putting jsdom in the VSIX's `node_modules`. How `vsce` handles workspace dependencies is not stated.
- **`.gitignore`:** item 12 says it adds `packages/*/dist/`, `.vscode-test/` and `*.vsix`. The current file already has `dist/` (which covers `packages/*/dist/`), `.vscode-test/` and `*.vsix`, so only `coverage/` is new.

24. Severity: Major
Affected Scope: Items 66-73; Verification Plan (1211-1229); design lines 80-81, 101-102, 116, 800-805
Discrepancy Description & Rationale: There are gaps in the test infrastructure and in verification.
- **Corpus expectations:**
  - It isn't said whether the corpus's expected results are checked by hand or recorded from the first run; recorded values can't catch mapping bugs.
  - The Pele results the brief already verified aren't written down as expectations:
    - an unclosed `[` on line 2 reported at line 3, column 4;
    - two emoji adding 4 columns;
    - a Gantt chart with an invalid date giving `semantic` at line 0, column 0;
    - source over 50,000 characters giving `limit` with no position;
    - ZenUML and pasted fence lines giving `unsupported-diagram`.
  - Mermaid.js results for the invalid date and the 50,001-character case are unknown.
- **Untested parts:**
  - the worker pool;
  - how agent-setup commands are built, how setup is detected, and disconnecting;
  - host-webview messaging. Its four message types (1050-1051) also leave out link opening, the renderer switch, cursor and scrolling, and a ready signal, which items 54 and 56 need;
  - whether the theme map is complete;
  - the export command;
  - file-reading limits;
  - settings.
- **Unmeasured targets:** no test measures the token budgets (Goal 1), the 500 ms check time, or the preview's update time (Goal 4).
- **Offline coverage:** Goal 7 says the whole test suite passes with networking blocked, but item 73 runs only the CLI offline.
- **Extension test setup:** the extension tests have no compile step (item 7 builds no test bundle, and no tsconfig covers `test/**` or `scripts/**`). There is no fixture workspace for Restricted Mode or for workspace-level setting values.
- **Webview test setup:** there is no test page that stubs `acquireVsCodeApi`.
- **CI assumptions:**
  - The plan assumes `unshare -rn` works without privileges on CI runners. That is unverified and has no fallback.
  - CI Node versions aren't stated, so the `engines >=20` minimum is never tested.
- **Wrong path:** item 69 runs `dist/cli.js`, but the bundle is `packages/diagramist/dist/cli.js` (893).

25. Severity: Major (assumptions)
Affected Scope: Item 1 (873-878), item 15 (922); design line 423
Discrepancy Description & Rationale: Several pinned versions and platform claims can't be verified from the provided docs or the brief. If a pinned version doesn't exist, the very first install fails.
- **Package pins:**
  - `@modelcontextprotocol/server@2.4.0` and `@modelcontextprotocol/client@2.4.0`, including the 2.x package split;
  - `typescript@7`, `esbuild@0.28`, `vitest@5` and `dependency-cruiser@18`;
  - `@vscode/test-electron@3`, `@vscode/vsce@4`, `ovsx@1` and `playwright-core@1.65`;
  - `jsdom@31.0.0`, whose version the brief doesn't record.
- **Node 20:** "Node 20 or later, because Pele requires it" has no support in Pele's docs. They mention Node 22 only for `bench:mermaid` and Node 24 only for the website.
- **Forks:** the claim that VS Code 1.90's API matches "the forks" is unverified.

26. Severity: Nit
Affected Scope: Items 29, 31, 50 (999, 1010, 1062-1063); design lines 80-81
Discrepancy Description & Rationale: Several limits are too vague to test.
- "At most about 80 words. A test enforces the limit" can't be tested, because "about" has no exact number.
- The tool description and hint texts are never given.
- The brackets and quotes that trigger the "reported one line late" hint are not listed.
- "Caps output at about 4,000 characters" gives no exact cap and no rule for what is dropped first. The cap also applies per file, while Goal 1's budget is per failing diagram.

27. Severity: Nit
Affected Scope: Items 54, 56 (1081, 1088); design lines 101-102, 498
Discrepancy Description & Rationale: The preview's speed target can't be met as designed. Goal 4 promises a Pele update "within 300 ms after typing stops", but D2 waits 300 ms of quiet before redrawing, which uses up the whole budget. It also isn't said whether the extension host or the webview does the waiting.

28. Severity: Nit
Affected Scope: Items 1, 7, 14, 49, 51 (872, 889-896, 910-915, 1061, 1064-1068)
Discrepancy Description & Rationale: Several CLI and release details are missing.
- **Exit codes:**
  - which code wins when both 1 and 2 apply;
  - whether a tool failure in a renderer that isn't a target gives exit code 2.
- **Inputs:** how the CLI treats explicitly named non-diagram files and symlinks.
- **Process:**
  - the exit code of `--self-test`;
  - how the server detects that its parent process has exited.
- **Scripts:** the `release:check` script is never defined.
- **Release workflow:**
  - the rule that turns odd minor versions into pre-releases;
  - the `id-token: write` permission that npm provenance needs.
- **Build:**
  - how it detects bundles with different renderer versions;
  - the names used to inject version numbers;
  - whether the CLI and worker bundles are CommonJS or ES modules.

29. Severity: Nit
Affected Scope: Items 52, 65 (1069-1070, 1137-1139); design lines 385, 477-478
Discrepancy Description & Rationale: The self-test conflicts with lazy loading and is underspecified.
- Running both renderers at activation starts the jsdom worker (about 100 MB and up to 2 seconds) in every VS Code window. That goes against D1's plan to load Mermaid.js only when needed.
- Where "once per version" is recorded is not stated.
- Section 6 says the self-test "draws" with each renderer, which Mermaid.js can't do in Node.

### `egm-style`

1. **Severity:** Blocker
   **Affected Scope:** Items 4, 6, 10, 25, 26 and 56 (lines 882-883, 887-888, 901-903, 979-980, 990-991, 1087-1088). Verification Plan, lines 1214-1216.
   **Style Rationale:** These instructions cannot all hold.
   * Item 4 claims "The type checker itself then stops core code from using browser or Node APIs." Item 26 then has the core Mermaid.js adapter expose `draw(id, text, theme)` through `mermaid.render` "in the browser". That is browser-only code inside core.
   * Item 56 draws each block "with Pele `mount`". Item 10 lets only `src/core/renderers/pele/**` import `pele`, and item 25 gives that module only `render`. So either the webview imports `pele`, which `lint:deps` rejects, or core wraps `mount`. `mount` takes an `HTMLElement`, a DOM type that item 4 removes from core.
   * `tsconfig.webview.json` (item 6) does not cover `src/core`.

   The implementer must decide where browser drawing lives. Line 853 says no step leaves that kind of decision. Editorial action: CALIBRATE item 4's claim. Name the module that wraps `mount` and `mermaid.render`, the tsconfig that checks it, and the import rule that allows it.

2. **Severity:** Major
   **Affected Scope:** Lines 852-854 ("No step leaves a design decision to the implementer. The one measured choice … comes with a fixed rule in step 0.")
   **Style Rationale:** This absolute claim does not hold. Findings 1 and 3-7 are contradictions the implementer must settle. These further choices are also left open:
   * **Full queue (line 1035):** what happens when the 8-request queue is full, and what a dropped request returns. Every MCP `tools/call` needs a reply.
   * **`check` inputs (lines 1040, 1057-1058):** what a relative `path` is resolved against; which input wins when both `path` and `text` are given; whether `block` counts from 1; whether `text` is read as Markdown or as one diagram.
   * **Non-text files (line 1041):** how they are detected.
   * **Settings (lines 940-946, 1002-1003):** the names, defaults and ranges of `diagramist.limits.*`, and whether they cover Mermaid.js's own size settings. Also the defaults of `preview.defaultRenderer`, `diagnostics.enabled` and `security.linkSchemes`.
   * **Keybinding (lines 935-936):** no key is named.
   * **Typing pause (line 1088):** the preview waits "for typing to pause" with no interval. D2's "300 ms for Pele, up to 1 second" (lines 498-499) reads as either the pause or Goal 4's deadline.
   * **Export without a panel (lines 1098-1101):** what "Export Diagram…" does when no preview panel is open, since only the webview produces bytes.
   * **Export width (lines 1102-1107, 1177):** the layout width for exports. `mount()` fits the pane, and item 72's "expected pixel size" depends on this.
   * **Export font:** D5 says "such as Helvetica, Arial or sans-serif" (lines 574-575). CUJ 4 says "the bundled font" (line 193). Item 59 names neither.
   * **Checker log level (lines 1042-1043):** how it is set.
   * **Mermaid.js worker globals (line 1039):** "only the globals Mermaid.js needs" is a second measured choice besides step 0.

   Editorial action: CALIBRATE. Settle these in the items, or replace the sentence with a short "Left to the implementer" list.

3. **Severity:** Major
   **Affected Scope:** Item 37 (lines 1022-1024) and item 40 (lines 1031-1032). Conflicts with section 3 (lines 292-293, 311-314) and CUJ 5 (lines 195-203).
   **Style Rationale:**
   * "Works with one renderer or both, depending on targets" and "Mermaid.js, started at the first check whose targets include Mermaid.js" contradict line 293: "runs both renderers on each block".
   * CUJ 5 needs the non-target renderer to run, because Pele's failure must appear as a warning. The text never says which renderers run for each `targets` value.
   * The v1 `Verdict` (`ok: true`, or `ok: false` with errors) has no value for a renderer that did not run. Line 346 says v1 fields are "only ever added", so that value must be fixed before release.
   * "It is pure" (line 1023) is jargon that hides the contract. The renderers sit behind worker threads with timeouts (item 40), so the call is asynchronous and can time out. Yet the signature returns `CheckResult`.

   Editorial action: CALIBRATE. State which renderers run for each `targets` value. Add the "not run" value to section 3. Replace "pure" with the actual contract (no I/O of its own, returns a promise).

4. **Severity:** Major
   **Affected Scope:** Items 23 and 24 (lines 969-978). Section 2 (line 276) and section 3 (line 321).
   **Style Rationale:** The design now describes a missing position three ways:
   * attached to the block's first line and "marked that way" (line 276);
   * `position: … or null` (line 321);
   * anchored to `contentStartLine` "with `hasPosition: false`" (line 973).

   `hasPosition` is not in the v1 schema, and the text does not say which object carries it. Line 973 does not say whether `toFilePosition` returns `null` or an anchored position, so the `| null` in its signature has no explanation. In item 24, `classHint` has no value set and no rule for when another module overrides it (for example `hints`, item 31). Nothing is said to use `spanStart`. Editorial action: CALIBRATE to one contract with the same field names in sections 2 and 3 and item 23. Define or drop `classHint` and `spanStart`.

5. **Severity:** Major
   **Affected Scope:** Item 29 (lines 997-1000) and item 70 (line 1163). Lines 185, 334-338 and 607.
   **Style Rationale:** Item 70 tests the "line format", but item 29 lists its parts without punctuation. The design shows three different formats:
   * `file:line:col: renderer: code: message` (line 185);
   * `README.md:42:15 error [Mermaid.js syntax] …` (line 334);
   * `path:line:col: severity [renderer code] message` (line 607).

   Item 29 also does not say whether passing blocks in a failing file get a line (line 338 shows one), or how an error with no position is printed. Editorial action: give the literal format once in item 29, with one example each for an error, a warning, an error without a position and a passing block. Make lines 185, 334 and 607 match.

6. **Severity:** Major
   **Affected Scope:** Items 30, 40, 49, 51, 61 and 69 (lines 1002-1003, 1033-1034, 1057-1058, 1065-1066, 1121-1122, 1161). Settings at lines 940-946.
   **Style Rationale:** Settings that change results exist only in VS Code. The plan does not say how the checker gets them.
   * **Timeout:** item 40 takes the limit from `checkTimeoutMs`, a VS Code setting (line 944). Neither the CLI (item 51) nor the `check` tool (item 49) accepts a timeout. Yet item 69 tests "a timeout with a 50 ms limit" against `cli.js mcp`, and line 357 says the limit "can be configured".
   * **Worker start-up:** the text does not say whether start-up counts toward the limit. The 2,000 ms default equals the time the NFR allows for the first Mermaid.js check while its worker loads (line 801).
   * **`--oldest-mermaid`:** item 51 lists it only under `check`. Item 61 and D4 (line 550) put it in the agent's `diagramist mcp` command.
   * **Limits:** item 30 lets settings lower the limits, but the checker reads no settings.

   So "they give the same verdict" (line 31) and Goal 5 (lines 103-104) hold only with default settings. Editorial action: list the options that `mcp` and `check` accept, or CALIBRATE lines 31 and 103-104 to "with default settings".

7. **Severity:** Major
   **Affected Scope:** Item 53 (lines 1073-1074) and section 4 (lines 359-360).
   **Style Rationale:** Item 53 triggers diagnostics "when the file watcher sees a change on disk", then limits them to "Open documents only". Section 4 says diagnostics cover "open documents and files changed on disk". The two readings differ in the main case: an agent edits a file the person has not opened. That decides whether Goal 5 holds for such a file. Editorial action: state one scope, in the same words, in both places.

8. **Severity:** Major
   **Affected Scope:** Step 0 (lines 856-864) and item 66 (lines 1143-1150).
   **Style Rationale:**
   * "Before anything else" (line 858) cannot hold. The step needs the corpus with expected verdicts (item 66), the samples (item 36) and an esbuild setup (items 1, 2 and 7).
   * Item 66 does not say where the expected Mermaid.js verdicts come from. If they are recorded from a jsdom run, step 0 compares jsdom with itself.
   * "(works in the 2026-11-11 test)" (line 861) goes beyond the evidence. That test ran Mermaid.js in plain Node (brief, lines 27-31). Nothing says it was bundled with esbuild or run against a corpus. CALIBRATE to what was run.
   * "The smallest bundle" names no measure: bytes, compressed size or memory. Memory is jsdom's main cost (about 100 MB, line 753).
   * "Ship jsdom unbundled … and bundled into the VSIX's `node_modules`" (lines 862-863) uses "bundled" in two senses in one sentence. Use "included in" for the VSIX.
   * No rule covers unbundled jsdom also failing corpus cases.

   Editorial action: list step 0's prerequisite items, and state the size measure and the fallback's pass condition.

9. **Severity:** Major
   **Affected Scope:** Item 60 (lines 1108-1117), item 75 (lines 1193-1199) and lines 1224-1225. Conflicts with Open Questions (lines 149-150).
   **Style Rationale:**
   * Item 60 states the Gemini CLI and Codex `mcp add` commands and skill folders as fact. Item 75 documents "pre-approving the read-only `check` tool" for each agent.
   * The Open Questions still list "the exact `mcp add` commands, scopes and tool pre-approval settings for Gemini CLI and Codex" as unknowns, and no step verifies them.
   * Additional Resources gives a source and date only for the Codex entry (lines 830-831).
   * "(official)" (line 1117) does not say official according to what.
   * The support table marks the three agents "supported" on Linux, macOS and Windows (line 1197). CI runs no agent, and the hand-run check (lines 1224-1225) names no operating system.

   Editorial action: CALIBRATE. Give each command, folder and pre-approval step a source and check date, or mark it unverified and add a verification step before item 61. State which systems the hand-run check covers, or narrow "supported".

10. **Severity:** Major
    **Affected Scope:** Verification Plan (lines 1211-1229) and item 73 (lines 1179-1180).
    **Style Rationale:** No verification step checks the measures the design states:
    * under 100 tokens for a passing file and under 1,000 per failing diagram (lines 80-81, 805);
    * connecting an agent in under two minutes (line 92);
    * preview updates within 300 ms and 1 second (lines 101-102);
    * a 500 ms check of 10 diagrams, and the memory figures (lines 800-803).

    Goal 7's measure is "the test suite passes with networking blocked" (line 116). Item 73 runs only `diagramist check` offline; the MCP, extension and webview tests run with network. "Expects the same results" (line 1180) does not say the same as what: an online run, or the corpus's expected verdicts. Editorial action: CALIBRATE. Add a check for each measure or relabel the unchecked ones as targets, and match Goal 7's measure to what item 73 runs.

11. **Severity:** Major
    **Affected Scope:** Item 29 (lines 999-1000), item 50 (lines 1062-1063) and item 68 (line 1154).
    **Style Rationale:**
    * "Caps output at about 4,000 characters" and "at most about 80 words. A test enforces the limit." give the tests no number to check. "At most about" contradicts itself.
    * The cap is in characters and does not say whether it applies per failing diagram or to the whole output. Goal 1 and the NFR promise tokens per failing diagram (lines 80-81, 805). No conversion is given, so a reader cannot tell whether the cap keeps the promise.
    * "Noting how many were left out" does not say how many of what: problems, blocks or characters.

    Editorial action: CALIBRATE. State exact limits in the unit each test measures, and say how the character cap relates to the token measure.

12. **Severity:** Major
    **Affected Scope:** Item 56 (lines 1087, 1094-1095) and reconciliation item 6 (line 1242).
    **Style Rationale:**
    * "When `autoDirection` is on and Pele changes the layout" and "a badge appears when Pele changes a diagram's layout" claim a signal Pele does not give.
    * Pele's `RenderResult` has `svg`, `width`, `height`, `type`, `mermaidType` and `links`, and nothing about direction. Item 25 limits the code to Pele's public API.
    * Pele's docs say diagrams below the breakpoint "may" switch direction. A narrow width alone can "wrap labels, reduce spacing, or rearrange the diagram" even with `autoDirection` off. So "changes the layout" includes cases the badge will never flag.
    * Item 56 draws with "`autoDirection` off, `images` off" (line 1087). That contradicts its own "when `autoDirection` is on" (line 1094) and the settings at lines 942 and 945.

    Editorial action: CALIBRATE to a condition the code can test; D2's example badge (lines 505-506) already uses panel width. Say that the drawing options come from those settings.

13. **Severity:** Major
    **Affected Scope:** Items 36, 52 and 65 (lines 1020-1021, 1069-1070, 1138-1139). Section 6 (line 385).
    **Style Rationale:**
    * "One minimal valid diagram per supported type" does not say supported by which renderer, yet item 52 "Checks every sample with both renderers".
    * Item 33's `pele` field implies some types lack Pele support. Pele targets Mermaid 12.1.0 syntax, while Diagramist pins Mermaid.js 12.3.0. A correct build could therefore log self-test failures on every new version (item 65).
    * Section 6 says the self-test "draws" with each renderer. The design rules out Mermaid.js drawing in Node (lines 128-130), and item 52 says "Checks".

    Editorial action: CALIBRATE to "each sample is checked with each renderer that supports its type", and use "check" in section 6.

14. **Severity:** Major
    **Affected Scope:** Item 64 (lines 1133-1136) and D6 (lines 591-598).
    **Style Rationale:**
    * "The session's counts" does not say whose session.
    * D6 says "the extension and the checker keep local counts" and that the report includes them. But the checker never contacts VS Code (lines 256-257), counts "live in memory only", and no item adds counting to the checker.
    * Two of D6's counts, "attempts until the first pass" and "repeated identical errors", describe the agent's calls to `check`. Only the checker sees those calls, so the report cannot contain them.

    Editorial action: CALIBRATE D6 and item 64 to counts the extension can observe, or name where the checker exposes its counts.

15. **Severity:** Major
    **Affected Scope:** Lines 872, 897-900, 907-915, 1014, 1050-1051 and 1222-1223.
    **Style Rationale:** Several names have no definition or nothing that runs them:
    * `release:check` (line 872) is never defined, and `release.yml` (item 14) does not run it.
    * No script, build step or workflow calls `scripts/sync-version.mjs` or `scripts/third-party-notices.mjs` (lines 897-900).
    * Package sizes are "recorded in the CI summary" (lines 1222-1223), but `ci.yml` (item 13) does not run `npm run package`.
    * "The build fails above 15 MB" does not say which file (the VSIX, the npm tarball or each), or whether the size is packed.
    * D4's CI check for keywords missing from the table (lines 545-546) has no file or step. Item 33's "built once … as in D4" (line 1014) leaves it unplaced, and "once" conflicts with updating the table at each upgrade.
    * `messaging.ts` lists `render`, `status`, `export-request` and `export-bytes` (lines 1050-1051). Item 56 sends link clicks to the host (lines 1092-1093), which needs a message not on the list.

    Editorial action: define each name where it is introduced, and say what runs it.

16. **Severity:** Major
    **Affected Scope:** Lines 1233-1234.
    **Style Rationale:** "Seven differences were found" reads as a complete list. Other brief requirements changed without being listed:
    * the `hasPosition` flag (brief, line 246) is missing from section 3 but appears in item 23;
    * the CI check that fails on an unmapped `--pele-*` variable (brief, lines 210-211) appears nowhere in the design or plan;
    * the snippet "marked as data" (brief, line 247) became a plain 200-character snippet (line 324, item 29), with no instruction to mark diagram text as data.

    Editorial action: CALIBRATE to "seven differences were reviewed with the author", and list the others with their status.

17. **Severity:** Nit
    **Affected Scope:** Lines 852, 864, 1156 and 1209.
    **Style Rationale:**
    * Line 852 says paths are relative to the repository root, but line 1156 uses `dist/cli.js`. The file is `packages/diagramist/dist/cli.js` (line 893).
    * Item 81 marks `docs/designs/diagramist.md` "Create at finalization", but that is the file under review and it already exists.
    * Step 0 records results under "Packaging notes", a section that does not exist and has no stated position.

18. **Severity:** Nit
    **Affected Scope:** Item 10 (lines 901-903).
    **Style Rationale:** The "plus" clause repeats two rules that section 7 already states (line 415). DROP the clause.

19. **Severity:** Nit
    **Affected Scope:** Item 7 (lines 890-893), with section 8 (lines 421-422) and section 3 (line 293).
    **Style Rationale:** Item 7 builds five bundles. Section 8 still says "four bundles: extension host, webview, checker and worker", and section 3 says "inside the worker". Update the counts.

20. **Severity:** Nit
    **Affected Scope:** Lines 491, 1098, 1118, 1124, 1130 and 1132.
    **Style Rationale:** The command titles mix two styles. "Export Diagram…" and "Open Preview to the Side" use title case. "Connect AI agent", "Check agent setup", "Disconnect agent" and "Copy diagnostic report" use sentence case. These strings are shown to users; pick one style.

21. **Severity:** Nit
    **Affected Scope:** Lines 305, 940, 966, 1057, 1065-1066, 1126 and 1188.
    **Style Rationale:** Several concepts carry more than one name:
    * the oldest-version option is `oldestMermaid`, `--oldest-mermaid` and `diagramist.oldestMermaidVersion`;
    * the first line of diagram text is `contentStartLine` (line 966) and `startLine` (line 305);
    * flags are listed under "Subcommands" (lines 1065-1066);
    * "the CLI" at line 1126 means the agent's program, but elsewhere means Diagramist's own command (line 1188).

    Use one name per concept, or state the mapping once.

22. **Severity:** Nit
    **Affected Scope:** Lines 925, 950-951 and 1192.
    **Style Rationale:** Items 16 and 74 say only "unofficial". Item 18 names Obsidian, the Mermaid project and Microsoft. Use the item 18 sentence in all three.

23. **Severity:** Nit
    **Affected Scope:** Lines 1081-1082 and 1237-1238.
    **Style Rationale:** "When an agent changes a file that isn't shown" and "says when agents are checking a saved file" describe events the extension cannot observe. It sees files change on disk and an editor with unsaved changes, not agents. CALIBRATE to the trigger the extension can see, as D2 does (lines 502-503), and say which files the watcher covers.

24. **Severity:** Nit
    **Affected Scope:** Lines 1171 and 1177.
    **Style Rationale:** "Restricted Mode behaviour" should name the expected states from section 5 (lines 376-377). "The expected pixel size at 2×" should state the size.

25. **Severity:** Nit
    **Affected Scope:** Lines 945-948, against line 374.
    **Style Rationale:** "The security settings are restricted" should name the setting keys listed under `restrictedConfigurations`. "At machine scope only" (line 945) and "only at user or machine scope" (line 374) describe the same rule in different words; use VS Code's scope names in both.

26. **Severity:** Nit
    **Affected Scope:** Line 915.
    **Style Rationale:** "Odd minor versions publish as pre-releases" is imprecise for npm, which has no pre-release switch for a normal version number. The NFR uses the `next` dist-tag (lines 807-808). Name the mechanism for each registry.

27. **Severity:** Nit
    **Affected Scope:** Line 878.
    **Style Rationale:** "APIs that VS Code 1.90 and the forks have" names no forks and cites no check. CALIBRATE: name the forks and when their API level was checked. Otherwise DROP "and the forks".

28. **Severity:** Nit
    **Affected Scope:** Lines 883, 928, 1116-1117, 1122, 1135 and 1203-1208.
    **Style Rationale:** Word-level edits:
    * Line 883: drop "itself".
    * Line 928: "the author's … publisher ID, to be created by the author" says the same thing twice. Say it once and point to line 1227.
    * Lines 1116-1117: replace "(official)" and "(its documented alias for the shared folder)" with sources, for example "per OpenAI's skills page; Gemini CLI also reads this folder".
    * Line 1122: "Otherwise it copies the command" should say when (the user declines) and where (the clipboard).
    * Line 1135: "ticks to include them" should name the control.
    * Lines 1203-1204: "report problems privately" should name the channel. "Pele issues" should say "vulnerabilities" and point to each project's security policy rather than its issue tracker.
    * Line 1208: a template cannot "send renderer differences upstream"; say it directs reporters to obsidianmd/pele or mermaid-js/mermaid.
