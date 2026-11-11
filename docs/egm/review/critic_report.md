# Goldfish Review Report: Stage 7 (Critic Review)

**Target:** `docs/designs/diagramist.md` (`FeatureRange, lines 1-849`)
**Standards:** `feature-spec-standard.md` for `egm-design` and `egm-structural`. `egm-style` used its
persona's own rules.
**Context given to reviewers:** `docs/egm/concepts_brief.md`, plus saved copies of the Pele README and
the pele.run index, API, compatibility, theming and security pages.

## Reviewer Status

| Reviewer | Status | Blocker | Major | Nit |
| --- | --- | --- | --- | --- |
| `egm-design` | completed | 1 | 12 | 6 |
| `egm-structural` | completed | 1 | 5 | 4 |
| `egm-style` | completed | 2 | 14 | 8 |

## Blockers after merging duplicates

1. **There is no Risks & Limits (Risks & Mitigations) section, as the feature-spec standard requires.**
   *Raised by `egm-design` 1 and `egm-structural` 1.* Risk material is scattered across section 4,
   section 5, D1's "When it fails", the NFRs and the unknowns, and the widest-impact risks are not
   named.
2. **A pass promises more than the check tests.**
   *Raised by `egm-style` 1; same substance as `egm-design` 3, Major.*
   * The design says "works on GitHub and Notion" and "render where they will be used", and uses a bare
     "OK".
   * But Mermaid.js is only parsed, at a pinned version that GitHub and Notion may not run.
   * The fix is to word every verdict as "parses with Mermaid.js x" and "renders with Pele y".
3. **The privacy promise is absolute, yet "Connect AI agent" runs `npm install -g`.**
   *Raised by `egm-style` 2; also `egm-design` 16, Nit.*
   * State it as a user-confirmed exception, and say "at run time".
   * Settle whether images can be turned on: the CSP and the fixed policy say no, while the settings
     say yes.

## Findings that repeat earlier stages

These are noted for the consolidated report:

* **The worker layout contradicts itself.** The section 1 diagram shows one worker; D1 requires two.
  Also raised in stage 5 (zoom-out 9) and stage 6 (comprehension 1). Here: `egm-design` 6,
  `egm-structural` 2, `egm-style` 3.
* **Default targets of "both" cause false errors.** Also stage 5 finding 1 and stage 6 finding 2.
  Here: `egm-design` 5.
* **The extension and the global checker drift apart.** Also stage 5 finding 5. Here: `egm-design` 9,
  `egm-style` 4.
* **The export font is described three different ways.** Also stage 5 finding 17 and stage 6
  finding 9. Here: `egm-design` 12, `egm-structural` 2, `egm-style` 9.
* **Drafting leftovers and stale "open question" references remain.** Also stage 5 finding 13 and
  stage 6 finding 10. Here: `egm-design` 14, `egm-structural` 4, `egm-style` 11 and 12.
* **The text output format is written three ways.** Also stage 6 finding 15. Here:
  `egm-structural` 5, `egm-style` 6.
* **Alternatives are attributed without a link, and Alternative 5 is left open.** Also stage 6
  finding 10. Here: `egm-design` 13, `egm-structural` 3.
* **The memory figures were measured on the old single-worker layout.** Here: `egm-design` 7,
  `egm-style` 13.

## New in this stage (not raised before)

* **`check` reads any path on disk.** That includes files outside the workspace, FIFOs and secrets.
  It echoes their content in messages and snippets, and the brief's "mark snippets as data" was
  dropped. *`egm-design` 2.*
* **Mermaid.js error shapes.** Only jison errors carry `hash.loc`; Langium-based types give no
  position, and multiple errors at once. Taking the "first line" of a message gives "Parse error on
  line N". Mermaid.js has no set of error codes. *`egm-design` 4.*
* **Windows and Node version managers.**
  * The `diagramist` command is an npm `.cmd` shim, which needs a `cmd /c` wrapper on Windows.
  * nvm, fnm and volta keep global packages per Node version.
  * `npm install -g` can fail with EACCES.
  * "Check agent setup" tests the extension host's PATH, not the agent's.

  *`egm-design` 8.*
* **Token budgets depend on what each agent passes to its model,** text or structured content.
  *`egm-design` 10.*
* **CSP versus renderer styles.** A nonce-only `style-src` would strip Mermaid.js's inline styles.
  There is no `font-src`. *`egm-design` 11.*
* **PNG export has no pixel cap** (canvas limits). Preview and export differ on `htmlLabels`.
  *`egm-design` 12.*
* **The Goal 3 release gate is statistically weak.** 27 of 30 is consistent with a true pass rate of
  about 74%. *`egm-design` 15.*
* **The CLI file search** misses `.mdx` and `.markdown`, ignores `.gitignore`, and treats fences
  nested inside longer fences as real diagrams. *`egm-design` 18.*
* **There is no versioning policy for renderer upgrades that change verdicts.** *`egm-design` 19.*
* **Headings and structure.**
  * "Additional Resources" and "Future Improvements" sit under NFRs instead of being H2 sections.
  * Section names differ from the standard.
  * Three labels should be headings.

  *`egm-structural` 6 and 7.*
* **"It can be the first line or anywhere in the diagram" overclaims the tested positions** of the
  targets comment. *`egm-style` 10.*
* **"Disconnect agent" doesn't remove the skill copy or the global install.** *`egm-style` 16.*
* **The registry checks behind "none offers agents a check" cover listings only.** *`egm-style` 14.*

## Full findings by reviewer

The reviewers' reports are reproduced unedited below, so that each finding can be traced.

### `egm-design` (design critic, feature-spec standard)

#### 1. The spec has no Risks & Limits section
**Severity:** Blocker
**Affected Scope:** /data/claude/projects/diagramist/docs/designs/diagramist.md (all line numbers below are in this file unless another file is named). The whole spec, L1–849. Risk material is scattered across L355–378, L465–467 and L791–816. Standard: /tmp/tmp.RECAsvDMPw/egm/resources/document_standards/feature-spec-standard.md L23–27 and L38–39.
**Finding & Recommendation:** The standard says the spec must explicitly call out its own constraints and must name failure modes, security implications and scalability limits, with mitigations. The spec has no Risks & Mitigations or Limits section. What exists is:
* webview hardening (section 5);
* one "When it fails" bullet for D1;
* some NFR targets.

The risks with the widest impact are not named anywhere:
* a pre-approved tool that can read any file (finding 2);
* Mermaid.js verdicts that come from parsing only but are presented as render verdicts (3);
* false errors caused by the default targets (5);
* timeouts while a worker is still starting (6);
* memory per agent session (7);
* launch failures on Windows and under Node version managers (8);
* drift between an extension that updates itself and a global checker that never does (9);
* who owns the npm name and the publish token for a package the extension installs globally (L1228 says the name is not registered yet);
* a support matrix of 2 renderers × 3 runtimes × 3 agents × 3 operating systems, maintained by one person.

Recommendation: add a "Risks & Limits" section. For each risk, give the trigger, impact, how it is detected, the mitigation and the residual risk. State hard limits: maximum file size, diagrams per file, diagram size, PNG pixel size, memory per session and package size. Findings 2–12 should be folded into it.

#### 2. `check` is a pre-approved reader of any file on disk
**Severity:** Major
**Affected Scope:** L275, L292–300, L320–324, L350–353, L364–378, L388–389, L798; CUJ 6 (L205–209); D5 (L573).
**Finding & Recommendation:** `check` accepts any path ("absolute path, as read from disk", L300). Nothing limits it to the agent's workspace or to diagram file types; L275 defines behaviour only for `.mmd`, `.mermaid` and Markdown. The tool is read-only and is meant to be pre-approved (/data/claude/projects/diagramist/docs/egm/concepts_brief.md L258–259). In Claude Code, a pre-approved MCP tool is matched by name only, so `Read` deny rules (for example for `~/.ssh` or `.env`) do not apply to it.

The output repeats file content in `message` and `snippet` (L320, L324):
* Pele's error messages include diagram source (/data/claude/projects/diagramist/.egm-context/pele-site-api.md L34).
* Mermaid's "no diagram type detected" error embeds the input text.

So a non-diagram file read as one block returns its first lines to the model. Reads are also not limited to regular files: a FIFO or `/dev/zero` passes a size check based on `stat` and then hangs or exhausts memory. Symlinks are not resolved first.

Related gaps:
* The brief required snippets "marked as data" (concepts_brief.md L247) to blunt prompt injection from cloned repositories. Section 3 dropped this.
* Error messages carry diagram text, so logging them at any level below trace breaks L378 and L798.
* Mermaid.js SVG exports keep remote `<image>` URLs that the preview's CSP blocked. Opening the exported file elsewhere makes exactly the request CUJ 6 says never happens.
* The diagnostic report's "agent setup status" (L388–389) is read from agent config files that also hold other MCP servers' environment values and secrets.

Recommendation: write these into section 5:
* Limit `path` to the MCP roots (or the server's working directory) plus folders the user opts into.
* Accept only regular `.md`, `.markdown`, `.mmd` and `.mermaid` files, after resolving the real path. For anything else, return "no diagrams" and no content.
* Mark snippets as untrusted data.
* Remove diagram text from messages before logging them.
* Strip remote references from exports.
* Read only Diagramist's own entry from agent configs.

Cover each with a contract test.

#### 3. Mermaid.js is checked by parsing only, but the spec promises render-level results and equal verdicts
**Severity:** Major
**Affected Scope:** L31, L41–46, L82–83, L128–130, CUJ 1 (L163–171), L277, L497, D3 (L525–526).
**Finding & Recommendation:** The checker and the diagnostics run `mermaid.parse()` under jsdom (L277). The preview and exports run `mermaid.render` in a browser (L497, D5). These are different operations:
* `parse` runs the grammar and the diagram's database.
* Errors raised during layout and drawing, including values some diagram types only resolve when drawing, appear only in `render`.

So a diagram can pass `check` and still fail in the preview, in an export, and on GitHub. For the main destination, the tool still does not answer Problem 1, "agents can't see whether a diagram renders" (L41).

Three claims rest on treating parse and render as the same:
* L31: "so they give the same verdict";
* CUJ 1 (L170–171): "OK from both renderers" and no Problems entries;
* D3 (L525–526): "a passing diagram works on GitHub and Notion".

The preview's own Mermaid.js render failures never reach the Problems panel either. The person can see an error in the preview that both the agent's tool and the Problems panel call OK.

Recommendation:
* Word every Mermaid.js verdict as "parses with Mermaid.js 12.3.0", and drop "works on GitHub".
* Add test cases that parse but fail to render, to measure the gap. The invalid-date Gantt case at L1148 is a start.
* Show preview render failures in the Problems panel under their own source, for example "Diagramist (Mermaid.js render)".
* Record the remaining gap as a risk.

#### 4. The Mermaid.js adapter's error handling assumes jison errors only
**Severity:** Major
**Affected Scope:** L73–78, L276–277, L281, L314, L319–320, L332–339, L344, L593; Alternative 12 (L754–756).
**Finding & Recommendation:**
* **Positions.** Positions come only from `hash.loc` (L277), which only Mermaid's older jison grammars produce. By the spec's own Alternative 12, 12 types are parsed by `@mermaid-js/parser`, including architecture, gitGraph, info, packet, pie, radar and treemap. Through `mermaid.parse()`, these fail with Langium parse errors: lists of lexer and parser errors, with no `hash`. As written, those types get no position. They can also report several errors at once, which contradicts L314 and L344.
* **Messages.** "message: first line only" (L320) is wrong for jison errors. Their first line is "Parse error on line N:"; the useful "Expecting …, got …" line comes after the context and caret lines. The spec's own example (L334) shows that later line. The "Expecting" list uses grammar token names (SQE, PE, DIAMOND_STOP) and can run to dozens of entries.
* **Codes.** Mermaid.js has no set of error codes. Yet several parts of the spec assume a stable "renderer's error code": Goal 1 (L75), the `code` field (L319), hints per code (L281) and the D6 counters (L593).

Recommendation:
* For each Mermaid error shape (jison `hash`, Langium parse error, unknown-diagram error, and a plain `Error` thrown by a diagram's database), specify how the message is extracted and where the position comes from or falls back to. Extraction should drop the context and caret lines and translate or shorten token lists.
* Define a closed, versioned set of Diagramist codes for Mermaid.js.
* Add one test case per error shape.

#### 5. Default targets "both", plus the renderers' different syntax versions, guarantee false errors with no way to opt out
**Severity:** Major
**Affected Scope:** L52–55, L83–86, CUJ 5 (L195–203), L318, L347–348, D3 (L520–533), L541–545, L611–618, L778–779.
**Finding & Recommendation:** Mermaid.js is pinned at 12.3.0 (L541), but Pele targets Mermaid 12.1.0 syntax (/data/claude/projects/diagramist/.egm-context/pele-README.md L87). Anything added in 12.2–12.3 can pass Mermaid.js and fail Pele.

What D3's default of "both" does with that:
* The Pele failure is an error (L318), and the CLI exits with 1 (L613). CI and pre-commit fail on diagrams that are valid where they are published. `retry: false` (L347) stops agents rewriting the diagram, but not the CI failure.
* When the renderers disagree on validity, as with the Sankey `abc` value (L53–55), the default pushes the agent to rewrite a diagram GitHub accepts so that Pele accepts it. That is the brief's Blocker finding 3 coming back (concepts_brief.md L155–157).
* CUJ 5 avoids this only by assuming "the file targets Mermaid.js only" (L197). D3 cannot express that.

D3 also has no file-level targets, no `targets=none` or ignore value, and no CLI flag (L615–618). So every diagram bound for GitHub needs a tool-specific comment. A repository with deliberately broken examples, or with ZenUML, can never pass.

The spec's own case for Pele is exported images (L52–53, L84–85). The D3 options table (L778–779) never weighs the cost of false errors, or the obvious alternative: Mermaid.js by default, with Pele required at export time.

Recommendation:
* Decide D3's default again, with the false-error cost stated. Either default to Mermaid.js for Markdown and make Pele an opt-in or an export-time check, or keep "both" and make Pele's "unsupported" a warning.
* Add an ignore value and a `--targets` CLI flag.
* Fix CUJ 5's wording.
* Have the compatibility table (L543–545) track the syntax-version gap between the two renderers, not just whether Pele supports each type.

#### 6. The worker layout contradicts itself, and failures across the two workers are not defined
**Severity:** Major
**Affected Scope:** Diagram (L226–252), L262–263, L286–293, L347–348, section 4 (L355–360), L412, L480–484, L611–614, L801.
**Finding & Recommendation:** The architecture diagram (L232) and section 1 (L262–263) put the core, Mermaid.js and Pele in one worker. D1 (L480–484) says they must run in two workers, because jsdom's browser globals break Pele. So the main diagram shows a setup known not to work; the "checked" note at L252 only means the diagram itself renders.

With two workers, the spec leaves six things undefined:
* **(a) Startup and the time limit.** It does not say whether the 2-second limit (L357) includes worker startup. A cold Mermaid.js worker needs up to 2 seconds (L801), and every timeout restarts it cold (L357–358). Slow machines (Windows with antivirus scanning, CI runners) can get stuck in a cycle of timeout results.
* **(b) Partial failure.** It does not say what a diagram's result is when one worker fails and the other succeeds.
* **(c) Retry for tool problems.** `retry` is not set for the "tool" class (L347–348 covers only "unsupported" and "too-large"). Agents may try to "fix" a valid diagram after a timeout.
* **(d) Exit codes.** It does not say which exit code wins when a run has both diagram errors and tool problems (L611–614).
* **(e) Queue limits.** Queue limits and back-pressure are missing, though the brief required them (concepts_brief.md L224). A branch switch that touches hundreds of Markdown files floods the diagnostics, which also watch files changed on disk (L359–360).
* **(f) Bundle contents.** It does not say that the Pele worker's bundle must leave out `mermaid` and jsdom. The core imports both adapters (L412). Without that rule, every Pele worker pays Mermaid's load cost and risks the global-variable clash D1 describes.

Recommendation:
* Redraw the diagram and section 1 with two workers.
* Give worker startup its own deadline, and start the per-check clock only once the worker reports ready.
* Return each renderer's result even when the other fails.
* Set `retry: false` for "tool" errors, with a hint saying the tool failed and the diagram should not be edited.
* Define the exit-code precedence, and the queue size and merge/drop rules for both MCP calls and diagnostics.
* Pass renderers into the core (dependency injection) so each worker bundle contains only its own adapter.

#### 7. Memory per agent session was measured on a different layout and is never released
**Severity:** Major
**Affected Scope:** L236, L461, L469–478, L525, L753, L802–803.
**Finding & Recommendation:** The memory table (L469–475) is "resident memory of one process", measured before the two-worker design. Each worker thread adds its own V8 isolate and Node environment, so the NFR figures (about 60 MB idle and about 160 MB with Mermaid.js, L802–803) are not backed for the design as written.

The stated saving, loading Mermaid.js only when needed (L477–478), is cancelled by D3's default. Mermaid.js is a target for every diagram that doesn't opt out (L525), so the jsdom worker loads on almost every session's first check. Its cost is about 100 MB by the spec's own figure (L753). Nothing ever frees it: there is no idle shutdown, no periodic restart and no `resourceLimits`.

The checker is registered at user scope (L461), and agents start their stdio servers when a session starts. So every session pays the base cost even if it never touches a diagram, and each session runs its own checker (L478). Five sessions at once plus the extension host's own workers (L236) come to roughly 1 GB for a linter.

Recommendation:
* Measure again with the real layout (two workers, bundled jsdom, Node 20, Windows).
* Set a memory budget per session in the NFRs.
* Stop the Mermaid.js worker after a few idle minutes, and restart it after N checks.
* Set worker `resourceLimits`.
* Start the Pele worker only when needed too.

#### 8. D1's global npm install has failure modes the spec doesn't list, and "Check agent setup" checks the wrong environment
**Severity:** Major
**Affected Scope:** L87–94, L152–153, CUJ 7 (L213–217), L423, L453–467.
**Finding & Recommendation:** D1 lists only two failures (L465–467): no Node, and no access to the npm registry. Also missing:
* **(a) Windows.** The registered `diagramist` command is an npm `.cmd` shim, which launchers that start processes without a shell cannot run. Claude Code's documentation already requires a `cmd /c` wrapper for npm-shim (npx) servers on Windows. Without one, every session fails with "connection closed".
* **(b) Node version managers.** nvm, fnm, volta and asdf keep global packages per Node version. After switching Node versions, or when an agent starts from a GUI or IDE panel without the shell profile, `diagramist` is no longer on PATH.
* **(c) Permissions.** `npm install -g` with a system-wide Node install fails with EACCES.
* **(d) No Node at all.** Users of the native Claude Code installer or the Codex binary may not have Node (concepts_brief.md L129–130). For them, Goal 3's "one command, under two minutes" (L92) does not hold, and the runtime question (L152–153) is still open.
* **(e) Supply chain.** The extension installs the package by name from the public registry. Ownership of the `diagramist` npm name, and its publish token, become a supply-chain dependency for every user.

"Check agent setup" looks for `diagramist` on the extension host's PATH (L459, L217). That PATH and Node version can differ from the agent's, so the check can report "reachable" while every agent session fails.

Recommendation:
* At connect time, register an absolute command: the resolved Node binary plus the package's `cli.js`, with a Windows form that needs no shell.
* Make "Check agent setup" run exactly the registered command and complete an MCP `initialize` handshake.
* Document the EACCES and Node-version-manager cases.
* Reserve the npm name now, or publish under a scope.
* Test on Windows explicitly.

#### 9. Nothing keeps the extension, the global checker, the skill copy and copied settings in step, so Goal 5 breaks in normal use
**Severity:** Major
**Affected Scope:** L31, L103–104, L147–148, L385–387, L462–464, L548–551, L644–649, L807–816.
**Finding & Recommendation:** The extension updates itself; the global checker and the copied `SKILL.md` never do. After the first release, the Problems panel and the agent's checker run different Diagramist versions, and possibly different renderer versions. That breaks L31 and Goal 5 (L103–104). If Claude Code's VS Code integration passes diagnostics to the model (L147–148), the model sees conflicting verdicts from two Diagramist versions.

Other gaps:
* Drift is caught only when the user happens to run "Check agent setup" (L462–464, L648–649).
* `--oldest-mermaid` is copied into the agent's command once (L548–551). Later changes to the VS Code setting silently diverge from what the agent uses.
* A rollback (L811–812) never reaches checkers already installed.
* The self-test at first activation (L385–387) checks the extension's own bundles, not the checker agents run. So "packaging faults show up before an agent meets a false error" is not true for agents.

Recommendation:
* When the extension activates, run the registered checker's `--version`. This is local and cheap.
* If the version, the skill copy or the oldest-Mermaid value is stale, show a non-blocking notification with a one-click fix.
* Make "Check agent setup" run `--self-test` through the registered command.
* Define a compatibility rule, for example "same minor version". Past it, diagnostics should say the checker differs.
* Say in the rollout section that checker fixes and rollbacks reach users only this way.

#### 10. The token budgets depend on what each agent passes to the model, and that is untested
**Severity:** Major
**Affected Scope:** L80–81, L151, L290–329, L432, L805, L823.
**Finding & Recommendation:** Results come back as both JSON and text, and L329 assumes agents read the text. MCP clients differ:
* MCP's structured-output rules recommend also returning the JSON as text.
* Some clients pass `structuredContent` to the model instead of the text, or as well as it.

The JSON for even a passing file with several diagrams is well over the 100-token budget: an absolute path, verdicts from two renderers per diagram, targets and warnings. Its either/or shapes (`ok: true`, or `ok: false` with errors; `position … or null`, L311–321) may trip clients that validate against `outputSchema`.

Support for structured results is still an open question (L151). The contract tests use only the official SDK client (L432). The server is built on SDK 2.x (L823), and nothing confirms it accepts the protocol versions each agent's client uses. So the headline measure is never checked against the three real agents.

Recommendation:
* Define the budget as the tokens each agent's model actually sees, and measure it in the release-time agent run.
* Decide whether to declare `outputSchema` at all. If you keep it, make the JSON small: a relative path, and no entries for diagrams that pass.
* Add a smoke test per agent that records real token counts for a pass and a failure.

#### 11. The stated webview CSP probably blocks the renderers' styles and the bundled font
**Severity:** Major
**Affected Scope:** L192–193, L366–371, L507–509, L573–578; the implementation plan's CSP at L1083–1085, for context.
**Finding & Recommendation:** Section 5 allows "only Diagramist's own scripts and styles" (L366–368). The implementation plan's CSP uses a nonce, with no `'unsafe-inline'` for styles and no `font-src`. A nonce cannot allow `style` attributes at all, and it allows inserted `<style>` elements only if Diagramist rewrites every SVG before inserting it.
* Mermaid.js puts a generated `<style>` element and inline `style` attributes in its SVG.
* Pele inserts its SVG as HTML (pele-site-api.md L199). It styles it with CSS variables and class rules, which probably also needs inline CSS (to verify).

So a nonce-only `style-src` would strip fills, colours and fonts. The export reads "colours and fonts … from the drawn diagram" (L573), so it would copy the broken styling. CUJ 4's "bundled font" (L193) also needs `font-src`.

Recommendation: decide the style policy explicitly. The usual answer is `style-src 'unsafe-inline'` with scripts still nonce-only; state the remaining risk (CSS injection, with no script execution). Add `font-src` if a font ships. Run the Playwright tests under the exact production CSP and compare the result with an unrestricted render.

#### 12. Exports don't deliver Goal 6's "fixed font", and the PNG path has no size limit
**Severity:** Major
**Affected Scope:** L105–111, CUJ 4 (L188–193), L570–578.
**Finding & Recommendation:**
* **Fonts.** Goal 6 promises exports that stand on their own with "a fixed font" (L110–111). D5 instead writes a font list ("Helvetica, Arial or sans-serif", L574–575), which resolves to different fonts on different machines. CUJ 4 (L193) says "the bundled font". Pele sizes boxes from text measured in the font present when it draws (/data/claude/projects/diagramist/.egm-context/pele-site-theming.md L84, L104). An SVG opened where the list resolves to another font will have labels that overflow or sit wrong.
* **PNG fonts.** An SVG drawn onto a canvas as an image can't load the page's web fonts. A bundled font works only if it is embedded in the SVG as a data URI.
* **PNG size.** The scale goes up to 4× (L570) with no cap. Wide diagrams exceed Chromium's canvas limits (about 32,000 px per side and about 268 million px in total) or use hundreds of MB, and the spec doesn't say what happens then.
* **Mermaid.js labels.** Mermaid.js exports use `htmlLabels: false` (L577) but the preview doesn't, so an export won't match what the user previewed.

Recommendation:
* Pick one font approach and make Goal 6, CUJ 4 and D5 agree: embed a subset of the font, convert text to paths, or weaken the claim.
* Cap the PNG size and give a clear error above the cap.
* Either use the same `htmlLabels` setting in the preview and the export, or state the difference.
* Add a pixel comparison between preview and export to the tests.

#### 13. Alternatives Rule: rejections are credited to the author without a link, and one alternative is left undecided
**Severity:** Major
**Affected Scope:** L142–143, L450–451, L664, L674–675, L683–684, L692, L700–702, L732–733, L769–770; standard L15–21.
**Finding & Recommendation:** The standard requires each rejection to state a concrete technical or scope trade-off. It forbids crediting a rejection to a maintainer without linking their issue, discussion or PR.
* Alternatives 1–4 and 9 (L664, L674–675, L683–684, L692, L732–733) and the whole D1–D8 options table (L769–770) say "rejected by author", with no link.
* Alternative 1's reason is only a preference (L664).
* D1's record (L450–451) gives "after asking which one the Elephant would pick" as the reason. That is process, not rationale.
* Alternative 5 (L700–702) admits the author was never asked "build new or contribute to an existing extension". That was the brief's open question 4, so "Questions 1–8 … were resolved" (L142–143) is not accurate.

Recommendation: state each rejection as its trade-off (most already appear under Cons). Then either drop "by author" or link a decision record, such as an issue or PR in beshoysabri/diagramist. Decide Alternative 5 with a stated trade-off, or list it as an open question.

#### 14. Leftover drafting text contradicts the decisions
**Severity:** Nit
**Affected Scope:** L16–17, L138, L149–150, L221–222, L454–455, L645–646, L826–831.
**Finding & Recommendation:** Several passages were written before the decisions and now contradict them:
* the CLI "may also ship (open question 7)" (L16–17);
* "Telemetry is open question 6" (L138);
* decisions "are added one at a time" (L221–222);
* "Decision D7 decides whether…" (L454–455);
* skill folders are "to be confirmed" (L645–646), yet L828–831 lists them, with two options for Gemini;
* the open questions still ask for the `mcp add` commands (L149–150) that L826–831 already gives.

Recommendation: do one pass for consistency. Remove the notes about the drafting process. For each remaining unknown, name an owner and the decision it blocks.

#### 15. Measures are inconsistent, unbounded or missing
**Severity:** Nit
**Affected Scope:** L80–102, L359, L361–362, L494–499, L800–801.
**Finding & Recommendation:**
* **Debounce vs target.** Goal 4 asks for a Pele preview update within 300 ms after typing stops (L101–102). D2 waits for a 300 ms pause before redrawing (L498–499), so the target can't be met. Diagnostics wait 400 ms (L359).
* **No size limits.** The timings in Goal 4 and L800 don't say how large a diagram they apply to.
* **Preview redraws.** The preview redraws every diagram in the file on the webview's main thread, with no time limit (L361–362, L494–499). Alternative 11's argument against unbounded rendering applies here too.
* **Missing measures.** Goals 2, 5, 6 and 8 have none. Goal 5 could have an automated test that the checker and the diagnostics agree on the test corpus.
* **Goal 3's release gate is statistically weak (L93–94).** 27 passes out of 30 is consistent with a true pass rate as low as about 74% (95% Wilson interval). The gate doesn't fix the agent and model versions, and the cost of the paid agent runs isn't estimated.

Recommendation:
* Make the debounces and targets agree, and tie them to a diagram size.
* Redraw only diagrams that changed or are visible.
* Add measures for Goals 5 and 6.
* Record the agent and model versions for each run.
* Either use more cases for Goal 3, or track it as a trend rather than a gate.

#### 16. Goal 7's "no network" has an unstated exception
**Severity:** Nit
**Affected Scope:** L112–116, L459–461, L794.
**Finding & Recommendation:** "Connect AI agent" offers to run `npm install -g` (L459–461). That contradicts "No part of Diagramist makes network requests" (L112, L794), and that flow can't pass the test with networking blocked (L116). Recommendation: state it as an exception the user confirms, run in a visible terminal.

#### 17. The import rules can't hold for the single `diagramist` program
**Severity:** Nit
**Affected Scope:** L385–386, L398–399, L413, L453–455, L604.
**Finding & Recommendation:** One command serves `mcp` (the `checker` feature) and `check` and `--self-test` (the `cli` feature), but L413 forbids features from importing each other. The extension also runs the self-test (L385–386), and the spec gives that code no shared home. Recommendation: add an entry module for the program that wires the features together, as `src/extension.ts` does for the extension. Put the self-test outside any single feature.

#### 18. The CLI's file search misses common documentation formats and ignore rules
**Severity:** Nit
**Affected Scope:** L51, L275, L604–605.
**Finding & Recommendation:**
* Documentation sites (L51) often use `.mdx` and `.markdown` files, which aren't scanned.
* Folder scans skip only `node_modules` and hidden folders, not git-ignored build output or vendored docs.
* Finding diagrams doesn't follow CommonMark's fence-nesting rules. A ```` ```mermaid ```` example inside a longer outer fence would be checked as a real diagram. That pattern is common in documentation about Mermaid, including Diagramist's own README.

Recommendation: scan `.mdx` and `.markdown`, respect `.gitignore`, add `--exclude`, require CommonMark fence rules, and add a test case for nested fences.

#### 19. No compatibility policy for renderer upgrades that change verdicts
**Severity:** Nit
**Affected Scope:** L424–426, L541–546, L611–614, L807–810.
**Finding & Recommendation:** Verdicts and exit codes are an API for CI users, but there is no versioning rule for upgrades that change verdicts. The brief asked that a Pele major version mean a Diagramist major version (concepts_brief.md L334–336). D4's CI check, which fails "when the pinned Mermaid.js recognises a keyword the table doesn't list" (L545–546), would need a list of Mermaid's internal type detectors, which Mermaid doesn't publish, and no method is given. Recommendation: state a versioning policy for upgrades that change verdicts, and say how the keyword list is built, for example from the per-type sample diagrams.

### `egm-structural` (structure, feature-spec standard)

1. **Severity:** Blocker
   **Affected Scope:** Lines 1–849 as a whole. There is no Risks & Mitigations section. Pieces of it sit in §4 (355–362), §5 (364–378), D1 "When it fails" (465–467), Non-Functional Requirements (791–816) and "Unknowns to verify while drafting" (145–157).
   **Discrepancy Description & Rationale:** The standard lists Risks & Mitigations as a required area. Its "Risks & Limits" rule says the spec must identify failure modes, security implications, scalability limits and how each is mitigated.
   - The H2 outline is Overview, The Problem, Goals, Non-Goals, Open Questions, CUJs, Technical Plan, Alternatives Considered and Non-Functional Requirements. None of these is a place for risks.
   - The mitigations that exist (timeouts, CSP, Restricted Mode) are not tied to a list of risks. A fresh reader therefore cannot confirm that all major risks are covered, which is the standard's core test.

   Risks that currently have nowhere to go:
   - **Verdict fidelity.** The pinned Mermaid.js is not the version GitHub or Notion runs (126–127, 538–539), so a "pass" can still fail where the diagram is published. This appears only as a non-goal, with no mitigation and no statement of residual risk.
   - **Scalability.** "Each agent session starts its own checker" (478), at about 155–159 MB each once Mermaid.js loads (475). No bound is given for parallel sessions or subagents, or for the workers each VS Code window starts.
   - **A false failure built into the design.** The NFRs allow the first Mermaid.js check up to 2 s (801), but §4 kills every check at 2 s and reports class "tool", code "timeout" (357–358). Nothing says whether worker start-up counts toward the limit.
   - **Security:**
     - The `npm install -g` in "Connect AI agent" (459–461) is an unlisted network exception to Goal 7's "No part of Diagramist makes network requests" (112) and to D6's "without exceptions" (589).
     - `diagramist.oldestMermaidVersion` is copied into a shell command that the extension runs (548–551). It is not among the safety settings restricted to user or machine scope (374–375).
     - The `check` tool reads any path it is given and echoes snippets (292, 324). No path scope is stated.
   - **Assumptions with no owner.** The unknowns at 147–157, such as each agent's limit on tool output, have no owner or fallback, yet they decide whether Goal 1's token measure can be met.

   To conform, add an H2 "Risks & Mitigations". Give each risk its impact, the mitigation with a reference to the section that implements it, and the residual risk.

2. **Severity:** Major
   **Affected Scope:** §1 (226–263), §2 (286–288), §3 (292–293, 308) and §4 (357–358) against D1 (477–484). Goal 2 (82–86), CUJ 1 (163–164) and CUJ 5 (197) against D3 (527–531). Goal 6 (110–111) and CUJ 4 (192–193) against D5 (574–575). §6 (388–389) against §7 (393–408).
   **Discrepancy Description & Rationale:** The decisions were "added one at a time" (221–222), but the base sections were never updated to match them. As a result, the architecture a reader meets first contradicts the decision record:
   - **Workers.** The diagram shows one checker worker running "core + Mermaid.js parser + Pele" (232) and one extension-host worker (236). §1, §3 and §4 all speak of a single worker. §2 loads jsdom ahead of the Mermaid.js adapter (286–288), which puts jsdom next to Pele. D1 then rules that jsdom breaks Pele, so the two renderers need separate workers (480–484). The diagram also leaves out the D7 CLI, and its "agent setup" node (238) has no edges.
   - **Target granularity.** D3 and §2 (282) set targets per diagram. Goal 2 (84–86), CUJ 1 ("The README targets Mermaid.js"), CUJ 5 ("the file targets Mermaid.js only") and D1 ("not a target for the file", 478) all describe targets per file or per destination instead.
   - **Coverage.** Goal 2 says every diagram is checked by both renderers (82), and §3 always carries `verdicts: { mermaid, pele }` (308). D1 skips Mermaid.js when it is not a target (477–478), so `verdicts.mermaid` is undefined for a `targets=pele` block.
   - **Export font.** Goal 6 promises "a fixed font" (110) and CUJ 4 "the bundled font" (193). D5 uses a system font stack, "Helvetica, Arial or sans-serif" (574–575), which is neither fixed nor bundled.
   - **Code layout.** "Copy diagnostic report" (§6 at 388–389, D6 at 597) has no feature folder in §7. The plan has to invent `features/diagnostic-report/` (1132).

   To conform, fold each decision back into §1–§4, the Goals and the CUJs. Redraw the diagram with two Node workers per host and the CLI path. Keep §9 only as the record of options and choices.

3. **Severity:** Major
   **Affected Scope:** Alternatives Considered (654–787) and the D1–D8 record lines (450–451, 488–489, 522–523, 537–539, 561–562, 586–587, 602, 627–628).
   **Discrepancy Description & Rationale:** The Alternatives Rule requires each rejection to state a concrete trade-off. It also forbids attributing a rejection to a maintainer without linking the issue, discussion or PR.
   - **Attributions with no link:**
     - "Rejected by author" with no link: Alternative 1 (664), 2 (674–675), 3 (683–684), 4 (692) and 9 (732–733).
     - The options table: "Each row was rejected by the author" (769–770).
     - D1–D8 record only "The author took A/B/C", with no reason for the chosen option. D4 gives only a reason against B. D1's stated basis is "After asking which one the Elephant would pick" (451).
   - **Preference instead of a trade-off:** Alternative 1's reason is "they want to work inside VS Code" (664).
   - **No trade-off at all:** Alternative 4 rejects "Diagramsmith" and "Lavagram" with Pros only. Its Cons cover only "the first two" names (690–691).
   - **Not resolved:** Alternative 5 is still "raised at this section's approval gate" (702).
   - **Unverifiable:**
     - Alternative 7 rejects "an existing Mermaid MCP server" without naming any (710–715).
     - Alternatives 8, 10 and 11 cite "the Goldfish review" (722, 740, 748) without linking concepts_brief.md findings 1, 8 and 6, which hold the evidence.

   To conform:
   - Link each attributed rejection to its record: the brief's "Alternatives Weighed" or "Decisions after the review" anchors, or a repository issue. Otherwise restate the reason as the technical or scope trade-off already listed under Cons.
   - Add Cons for the last two names.
   - Name the MCP servers that were evaluated.
   - Close Alternative 5.

4. **Severity:** Major
   **Affected Scope:** "## Open Questions" (140–157), the numbered references at 16, 138 and 439–446, and Alternative 5 (700–702).
   **Discrepancy Description & Rationale:** The numbered question list was replaced by one sentence saying questions 1–8 are resolved (142–143). The document still cites them by number:
   - "open question 7" (16);
   - "open question 6" (138);
   - "(open question 1)" to "(open question 8)" in the §9 table (439–446).

   No numbered list remains in this document, so these references can't be resolved. The Input brief cited at line 6 numbers its questions differently: its 6 is agent guidance and its 7 is telemetry, while here 6 is telemetry and 7 is the CLI. A reader who checks the brief lands on the wrong question.

   Two of the references also contradict the decisions:
   - Line 16 says the checker "may also ship as a command-line tool", but D7 (600–623) and CUJ 3 ship it in v1.
   - Line 138 says "Telemetry is open question 6", but D6 decided on none.

   The brief's "build or contribute" question never got a D number and is left open in Alternative 5.

   "Unknowns to verify while drafting" (145–157) mixes items in different states:
   - **Answered:** the `mcp add` commands, given at 826–831.
   - **Moot:** `ELECTRON_RUN_AS_NODE` after D1, and conflicts in the built-in preview after D2.
   - **Deferred:** the browser stand-in, moved to plan step 0.
   - **Still open:** agents' output limits, and whether diagnostics reach the model.

   To conform, either restore the list with a "→ Dn" mapping and a note on how it was renumbered from the brief, or cite D numbers directly. Move the unknowns that are still open into the risks section from finding 1.

5. **Severity:** Major
   **Affected Scope:** CUJ 3 (185), the §3 example (333–338) and D7 (607–610). §2 (276) against §3 `position` (321). D3 (530–531) against `BlockResult` (304–309). Goal 4 (101–102) against D2 (498–499).
   **Discrepancy Description & Rationale:** The same contract is defined differently in different places, and none of the definitions is marked as the authoritative one.
   - **Line format: three variants.**
     - CUJ 3: `file:line:col: renderer: code: message`, with no severity.
     - §3 example: `README.md:42:15 error [Mermaid.js syntax] …`, with no colon after the column and the summary line first.
     - D7: `path:line:col: severity [renderer code] message`, with "A summary line comes last" (610). D7 claims this is "the same as the text form in section 3".
   - **Errors without a position.** §2 says they are "attached to the block's first line and marked that way" (276). §3 instead says `position … or null` and has no marker field. The brief required a `hasPosition` flag, and the plan uses one (973).
   - **Where targets came from.** D3 says each block's result shows the source of its targets (530–531), but `BlockResult` has only `targets` (307).
   - **Preview timing.** D2's "after a pause in typing (300 ms for Pele …)" (498–499) reads as a 300 ms debounce. That would make Goal 4's "within 300 ms after typing stops" (101) impossible to meet. The preview's debounce is never stated, while the diagnostics debounce is (400 ms, 359).

   To conform, make §3 the single normative definition of the result and line formats, and have the CUJs and decisions refer to it.

6. **Severity:** Major
   **Affected Scope:** "## Non-Functional Requirements" (791), which contains "### Additional Resources" (818) and "### Future Improvements" (835), and the NFR bullets at 800–805.
   **Discrepancy Description & Rationale:** The heading hierarchy is wrong. "Additional Resources" and "Future Improvements" are H3 children of Non-Functional Requirements, so the outline presents reference links and deferred options as if they were v1 requirements. Both are document-level sections and should be H2 siblings.

   The NFR bullets also repeat figures that are owned elsewhere, which creates two sources of truth that can drift apart:
   - 805 repeats Goal 1's measure (80–81);
   - 802–803 repeat the D1 memory table (471–475).

   To conform, promote both sections to H2 and replace the repeated figures with references.

7. **Severity:** Nit
   **Affected Scope:** Headings at 36, 68, 120 and 219. Pseudo-headings at 57, 145 and 469.
   **Discrepancy Description & Rationale:** Some section names don't match the standard, so a checklist audit can't map them one-to-one:
   - "The Problem" instead of "Problem Statement";
   - "Technical Plan (Architecture)" instead of "Proposed Architecture";
   - separate "Goals" and "Non-Goals" sections instead of "Goals & Non-Goals".

   Three sub-sections are plain paragraph labels rather than headings, so they don't appear in the outline:
   - "What exists today (checked 2026-11-11):" (57);
   - "Unknowns to verify while drafting:" (145);
   - "Resource use, measured on 2026-11-11 …:" (469).

   To conform, use the standard's names, or add them in parentheses, and turn the three labels into H3 headings.

8. **Severity:** Nit
   **Affected Scope:** Lines 15, 89, 221–222, 419, 437–446, 451, 646, 677, 702, 722, 740, 748 and 770.
   **Discrepancy Description & Rationale:** The status line (4) says the document is ready for review, but text from the drafting process remains:
   - **Process narration:** "Decisions … are added one at a time as the author makes them" (221–222). Headings contain "(made without a gate)" (419) and "(the shape after the Goldfish review)" (677).
   - **Open hedges:**
     - "(to verify)" inside Goal 3 (89), which leaves that goal's scope undecided.
     - "(to be confirmed in the Detailed Implementation)" (646), although lines 828–831 already list the skill folders.
   - **The §9 table:** the "Status" column says "decided" in every row, and the "Decision" column holds the questions rather than the decisions (437–446).
   - **Unexplained terms:** "Elephant" (451, 770), "Goldfish" (677, 722, 740, 748) and "gate" (419, 702). "MCP" is never spelled out from its first use at 15. EGM is named only at 832–833.

9. **Severity:** Nit
   **Affected Scope:** Lists and labels throughout, the Goals (70–118), D1–D8 (448–652) and the Non-Goals (124–138).
   **Discrepancy Description & Rationale:** These inconsistencies don't break rendering, but they break symmetry:
   - **Bullet markers:** lines 25–29, 44–46, 59–66, 73–78, 92–94, 97–99 and 106–108 use `* `. Everything else uses `*   `.
   - **Bold lead-ins:** some end with "." inside the bold (453), some with ":" inside (465, 611), and some with ":" outside (163, 661).
   - **D6:** it is the only decision record without bold lead-ins (589–598).
   - **Decision records:** they don't share a template.
     - "Not in v1" appears only in D2 and D5.
     - "Later" appears only in D3 and D8.
     - "When it fails" appears only in D1.
     - None has a rationale line.
   - **Goals:** Goals 1, 3, 4 and 7 have a *Measure* line; Goals 2, 5, 6 and 8 have none.
   - **Non-goals:** those at 124–132 give a reason; those at 133–137 are bare bold phrases.

10. **Severity:** Nit
    **Affected Scope:** Additional Resources (818–833), evidence claims (53–54, 57–66, 457–458, 481–482, 528–529, 538–539, 577, 754–756) and internal cross-references.
    **Discrepancy Description & Rationale:**
    - **Mixed link styles:** bare URLs at 820–822, Markdown links at 6 and 832.
    - **Resources with no link at all:**
      - the MCP SDK (823);
      - the VS Code guides (824–825);
      - the agent docs, including "OpenAI's skills page" (826–831);
      - the EGM repository for commit `e9e1f06` (832–833).
    - **Evidence with no source:** claims such as "checked 2026-11-11" and "A test on 2026-11-11 showed" cite no source, script or output.
    - **Plain-text cross-references:** "section 9", "section 5", "section 3", "Goal 7" and the D-number references are not anchor links.

### `egm-style` (style)

1. **Severity:** Blocker
   **Affected Scope:** Overview line 12; D3 lines 525-526; the "OK"/"ok" wording at lines 18-19, 170, 200 and 338.
   **Style Rationale:** The spec says a pass proves more than the check tests. Line 12 says agents write diagrams "that render where they will be used". Lines 525-526 say a diagram that passes the default targets "works on GitHub and Notion". The spec's own evidence says otherwise:
   - GitHub and Notion run their own Mermaid.js versions (Non-Goal, 126-127), and GitHub doesn't publish which one (D4, 537-539).
   - Outside the webview, Mermaid.js only parses a diagram; it never draws it (17-18, 128-130).

   The brief's Blocker finding 3 set the rule for this wording (concepts_brief.md line 162: name the renderer and version, never "valid Mermaid"). The result text also uses one bare "OK"/"ok" for both a Mermaid.js parse and a Pele render. If this wording reaches the README or SKILL.md, agents and users will read a pass as a guarantee that GitHub renders the diagram.

   **Action: CALIBRATE.** For example: "parses with Mermaid.js 12.3.0 and renders with Pele 1.13.0; GitHub and Notion may run other Mermaid.js versions (D4)". The per-block text should say which kind of check each renderer passed, using the wording Goal 2 already has ("(syntax)", "(full render)", 82-83).

2. **Severity:** Blocker
   **Affected Scope:** Goal 7, lines 112-116; section 5, lines 366-369 and 374; D6, lines 589-590; NFR line 794; compared with D1, lines 459-461 and 465.
   **Style Rationale:** The privacy promise is absolute, and the spec contradicts it. These lines make the promise:
   - "No part of Diagramist makes network requests" (112).
   - "No network from any part" (366).
   - "No part of Diagramist sends data anywhere, which keeps Goal 7 without exceptions. The README says so." (589-590).

   But in D1, "Connect AI agent" offers to run `npm install -g diagramist@<version>` (459-461), and line 465 lists npm registry access as a requirement. The workplaces that block online tools, named at 48-49, would decide whether to allow Diagramist based on a false statement. Two more claims overreach:
   - "Blocked by default" (113-114) and "off by default" (369) suggest the user can turn images on, and 374 lists images as a setting. But `policy` calls `images: false` fixed (280), and the Content Security Policy allows images only from the extension and `data:` (366-367). Pick one behaviour and state it.
   - The measure (116), "the test suite passes with networking blocked", shows the code works offline. It doesn't show that no request is attempted, which is what the goal claims.

   **Action: CALIBRATE** the claims to "at run time" (also at 19-20). **RELOCATE** the one exception, the optional npm install, to the consent step in "Connect AI agent" and to the README's privacy statement. Make the measure fail on any attempted outbound connection.

3. **Severity:** Major
   **Affected Scope:** Lines 17-18, 82, 232, 236, 262-263, 270-271, 286-288, 293, 308, 357, 421-422 and 619; compared with D1, lines 477-484.
   **Style Rationale:** D1 records a test result: Pele must not share jsdom's globals, so Pele and Mermaid.js run in two separate worker threads, and Mermaid.js is not loaded at all when it isn't a target. Earlier sections still describe the older design:
   - One worker holds "core + Mermaid.js parser + Pele" (232; also 262, 293, 357, 619).
   - "The Node entry points (the checker and the extension-host worker) load jsdom" (286-288). That puts browser globals in the Pele worker, which D1 forbids.
   - The core "imports nothing that needs a browser page" (270-271), yet `renderers/mermaid` imports `mermaid`, which needs jsdom in Node.
   - "Every diagram is checked by Mermaid.js" (82; also 17-18 and 293). The result field `verdicts: { mermaid, pele }` (308) has no "not run" state, so the spec doesn't say what a block with `targets=pele` returns. This one affects the public result format.
   - The extension-host worker (236) is shown with only the core, although Goal 5 needs both renderers there.
   - Section 8 names one "worker" bundle (421-422) without saying whether both workers use it.
   - The section 1 diagram also leaves out the D7 command-line tool.

   **Action: CALIBRATE** these passages to D1.

4. **Severity:** Major
   **Affected Scope:** Lines 31, 103-104 and 619-620.
   **Style Rationale:** Three claims have no conditions: "so they give the same verdict" (31), "the same errors the agent gets ... at the same file positions" (103-104), and "the CLI and the agent tool always agree" (619-620). The spec itself names three cases where they differ:
   - The checker and extension versions can differ (463-464).
   - The checker reads the saved file, while diagnostics and the preview follow the unsaved editor text (292, 359-360, 498, 502-504).
   - `--oldest-mermaid` is copied into the agent's command once, but the VS Code setting can change later (547-551).

   **Action: CALIBRATE** to "the same verdict for the same text, versions and settings", and point to the version and unsaved-changes warnings as the stated exceptions.

5. **Severity:** Major
   **Affected Scope:** Result format, lines 302, 307, 309, 318-319 and 346; also lines 75, 334, 358 and 502; D3, lines 530-531.
   **Style Rationale:** The version 1 result format is a public contract ("fields are only ever added", 346), and three of its terms are unclear. Renaming them after release would break existing consumers.
   - "Warning" means two things. One is an entry in a block's `warnings` list (309): a notice such as "theme ignored", D3's invalid comment, or D4's version warning. The other is an `Error` with `severity: "warning"` (318): a failure in a renderer that isn't a target. `summary.warnings` (302), the status line's "number of warnings" (502) and rule 346 don't say which one they count. Rename one, or define the count.
   - `code` is described as "the renderer's own code" (319, and Goal 1 at 75). But `timeout` (358) is Diagramist's own code. The 2026-11-11 test recorded only `hash.line` and `loc` on Mermaid.js errors (concepts_brief.md 32-33), so the Mermaid.js `syntax` code at 334 appears to come from Diagramist.
   - D3 says each block's result shows where its targets came from (530-531), but the `targets` field (307) has no place for that.

6. **Severity:** Major
   **Affected Scope:** CUJ 3, line 185; example, line 334; D7, lines 607-608.
   **Style Rationale:** The command-line error line is defined three different ways:
   - `file:line:col: renderer: code: message` (185).
   - `path:line:col: severity [renderer code] message` (607).
   - `README.md:42:15 error [Mermaid.js syntax] …` (334), with no colon after the column.

   Editor problem matchers, pre-commit output and agents all parse this line. The `--json` option (622-623) doesn't remove the need for one text format. Pick one and use it in all three places. Also spell the renderer name one way: it is "Mermaid.js" here, but `mermaid` in the JSON keys and D3 comments.

7. **Severity:** Major
   **Affected Scope:** Goal 4, lines 101-102; section 4, lines 357-360; D2, lines 498-499; NFR lines 800-801.
   **Style Rationale:** The timing numbers conflict, or can't be checked.
   - Goal 4 sets a total time: "updates within 300 ms after typing stops". D2 sets a wait before redrawing: "after a pause in typing (300 ms for Pele, up to 1 second for Mermaid.js)". If the redraw only starts after 300 ms, the 300 ms goal can't be met. "A pause of up to 1 second" doesn't define a pause. Diagnostics use a third value, 400 ms (359).
   - The 2-second limit applies to "each check", but "the block" gets the timeout (357-358). Is the limit per block or per file?
   - NFR 801 allows up to 2 seconds for the first Mermaid.js check while its worker loads. That equals the default limit, so say whether start-up time counts toward it.
   - The 300 ms, 1 second and 500 ms figures (101-102, 800) name no reference machine or diagram size.

8. **Severity:** Major
   **Affected Scope:** Goal 1, lines 80-81; Goal 3, line 92; line 329; NFR line 805.
   **Style Rationale:** These measures can't be tested as written.
   - The token limits don't name a tokenizer, and the three agents count tokens differently. They also don't say whether the JSON copy counts. The `result` module prints both forms (279), and "Agents read the text form first" (329) suggests both are sent.
   - "By default" (81) implies another output mode, but none is defined. NFR 805 repeats the measure without "by default".
   - "Connecting one agent takes one command" (92) doesn't match CUJ 7, which is a palette command, a picker and a confirmation. With VS Code closed (CUJ 2), it takes `npm install -g diagramist` plus the agent's `mcp add`, and D8 adds a skill copy. Define what counts as one command.

9. **Severity:** Major
   **Affected Scope:** Goal 6, lines 110-111; CUJ 4, lines 192-193; D5, lines 573-575.
   **Style Rationale:** The export font is described three ways: "a fixed font" (110), "the bundled font" (192-193), and "a common stack, such as Helvetica, Arial or sans-serif" (574-575). A font stack uses whatever font the viewer's machine has, so it is neither fixed nor bundled, and nothing in the spec bundles a font. Other wording in these lines also overreaches:
   - "Looks the same as the preview when pasted into Google Slides" (193) has no conditions. In CUJ 4 the user picks the light theme, but the preview follows VS Code's theme (507), so the colours differ whenever VS Code is dark.
   - "Real colours" (110, 192) should say "literal colour values instead of CSS variables".
   - "Some slide tools" (574) should name the tools that were tested.

   **Action: CALIBRATE.**

10. **Severity:** Major
    **Affected Scope:** D3, lines 528-529; D8, line 639.
    **Style Rationale:** "It can be the first line or anywhere in the diagram" covers every position, but the test cited in the next sentence covers only two: the first line, and the line after the type line. Frontmatter, Sankey CSV rows (where the two renderers already disagree) and nested blocks are untested. Agents will place the comment by following SKILL.md, so if the claim is wrong, valid diagrams start failing.
    **Action: CALIBRATE** to "on the first line or directly after the type line (tested 2026-11-11)", and use the same wording in SKILL.md.

11. **Severity:** Major
    **Affected Scope:** Lines 16, 138, 140-143, 221-222, 454-455, 645-646 and 701-702.
    **Style Rationale:** Text left over from drafting shows decided items as still open:
    - "It may also ship as a command-line tool (open question 7)" (16), though D7 ships it.
    - "Telemetry is open question 6" (138), though D6 decided on no telemetry.
    - An "Open Questions" heading (140) with no open questions under it.
    - "Decisions D1–D8 ... are added one at a time as the author makes them" (221-222).
    - "Decision D7 decides whether it also offers `check`" (454-455).
    - "(to be confirmed in the Detailed Implementation)" (645-646), though lines 828-831 already give the skills folders.
    - "It is raised at this section's approval gate" (701-702), with no outcome recorded.

    **Action: CALIBRATE** each to the decided state; **DROP** lines 221-222.

12. **Severity:** Major
    **Affected Scope:** Lines 145-157; Goal 3, line 89.
    **Style Rationale:** None of these caveats names the decision it would inform, and several are already settled.
    - Diagnostics (147-148): nothing in v1 depends on the answer. **DROP**, or name the decision it would change.
    - Agent setup (149-150): lines 827-831 already give the `mcp add` commands and skills paths. **CALIBRATE** to what is still unknown, which is the pre-approval settings.
    - Agent limits (151): **CALIBRATE** by linking it to the Goal 1 token budget it would test.
    - Runtime (152-153): matters only for the launcher (D1 option B). **RELOCATE** to Future Improvements (837).
    - Browser stand-in (154-155): step 0 of the implementation plan covers it. **DROP**, or point to step 0.
    - Preview conflicts (156-157): no longer relevant after D2. **RELOCATE** to line 838.
    - "(to verify)" in Goal 3 (89) leaves the goal's scope open. **CALIBRATE** the goal to terminal use, and list the VS Code panels as an unknown.

    "While drafting" (145) is out of date in a spec marked ready for review.

13. **Severity:** Major
    **Affected Scope:** NFR lines 802-803; line 679; line 753; table at lines 469-475.
    **Style Rationale:** The memory figures are labelled as measured, but the measured setup isn't the chosen design.
    - The table at 469-475 measured one process with both renderers on one thread. D1 (480-484) rules that setup out and switches to two worker threads, which were not measured. NFR 802-803 still presents "about 60 MB" and "about 160 MB" as "measured on 2026-11-11".
    - "About 7 MB of memory" (679) is the increase over an idle Node process (63 − 56 MB), not the total.
    - "About 100 MB less memory" (753) assigns the whole increase from Mermaid.js plus jsdom to jsdom alone. `@mermaid-js/parser` would use memory of its own.

    **Action: CALIBRATE.** Label these as single-thread measurements or estimates, or measure the two-worker design.

14. **Severity:** Major
    **Affected Scope:** Lines 59-61, 698-699, 707 and 713-714.
    **Style Rationale:** The recorded check of existing tools (concepts_brief.md 404-411) covers the listings of three Pele preview extensions and an npm search. These claims go beyond it:
    - "None offers agents a check they can call" (60-61) also covers the official Mermaid Chart extension, which wasn't checked.
    - "None has an agent checker, Mermaid.js, a CLI or export" (698-699), "no mapping of positions into Markdown files" (707) and "None maps positions into files" (714) aren't in the record.
    - "Mermaid.js only" (713) contradicts "built on Mermaid.js or other renderers" (62-63).

    **Action: CALIBRATE**, for example "their listings (checked 2026-11-11) mention no …".

15. **Severity:** Major
    **Affected Scope:** Lines 385-387.
    **Style Rationale:** The self-test is said to draw one sample of every diagram type "with each renderer", and to run "on first activation and with `--self-test`". Neither of those places can draw with Mermaid.js: it draws only in the webview (128-130, 277). "Before an agent meets a false error" is also vague.
    **Action: CALIBRATE** to "parses each sample with Mermaid.js and renders it with Pele". Replace "a false error" with "an error caused by packaging rather than by the diagram".

16. **Severity:** Major
    **Affected Scope:** Lines 815-816.
    **Style Rationale:** "The off switch for agent tools is 'Diagramist: Disconnect agent', which runs the agent's own `mcp remove`" overstates what it does. It removes only the MCP entry. The SKILL.md copy in the agent's skills folder stays (644-646), and it tells agents to run `diagramist check <path>` in a shell (636). The global npm install keeps that command available (456-457). The spec doesn't say whether "Disconnect agent" removes the skill. An operator following this rollback step would wrongly believe the agent has stopped using Diagramist.
    **Action: CALIBRATE.** List what "Disconnect agent" removes and what stays.

17. **Severity:** Nit
    **Affected Scope:** Lines 263, 265, 382, 492-493, 545-546 and 576-578.
    **Style Rationale:** These claims are absolute and need narrowing.
    - "Can't freeze the agent's tool or VS Code" (263): the preview draws in the webview with no time limit (361, 497).
    - "The agent and VS Code never talk to each other" (265): the unknown at 147-148 is about an agent integration that does. Say "the checker and the extension".
    - "Every ... log line ... names the ... versions" (382): if the intent is "each log session starts with the versions", say that.
    - "Its keybinding is limited to those files, so it never replaces Markdown's own preview shortcut" (492-493): Markdown files are among "those files", so the conclusion doesn't follow. Name the key combination.
    - "The table can't fall behind an upgrade" (545-546): the CI check catches only keywords missing from the table.
    - "Pele's SVG contains no `foreignObject`" (576-577): this holds only because Diagramist passes no math resolver; Pele's API page says MathML math is wrapped in `foreignObject`. "So the canvas stays readable" (578) should state the actual effect.

    **Action: CALIBRATE.**

18. **Severity:** Nit
    **Affected Scope:** Lines 419, 423, 451, 677, 701-702, 722, 740, 748 and 769-770.
    **Style Rationale:** Review-process jargon and narration give a public repository's readers no reasons.
    - "After asking which one the Elephant would pick" (451) and "For D1 the author asked for the Elephant's pick" (769-770): "the Elephant" is never defined, and lines 456-467 already give D1's reasons. **DROP.**
    - "Made without a gate" (419), "approval gate" (702) and "the Goldfish review" (677, 722, 740, 748): say "the design review" and cite lines 832-833 once.
    - "Choices with one defensible answer" (419) is an opinion, not a heading.
    - "Node 20 or later, because Pele requires it" (423) cites no source. The Pele README mentions only Node 22 for benchmarks and Node 24 for its website. **CALIBRATE** by citing the source.

19. **Severity:** Nit
    **Affected Scope:** Lines 467, 517-518, 533, 581-582, 652, 772-787 and 835-846; 33-34 and 124-125; 314 and 344; 412 and 415; the "Reason for Rejection" lines 664-764; 757-758.
    **Style Rationale:** Several passages repeat each other.
    - Deferred options are listed three times: five inline notes that they "can be added later without breaking anything" (a promise with no conditions), the last column of the table, and Future Improvements. Keep the table and Future Improvements.
    - Lines 124-125 repeat 33-34 almost word for word.
    - Line 344 repeats 314.
    - Line 415 repeats 412, and 412 ("`core` imports only itself, plus the two renderers") is hard to parse.
    - Each "Reason for Rejection: Rejected by …" repeats its own label.
    - Lines 757-758 repeat 842-843.

20. **Severity:** Nit
    **Affected Scope:** Lines 776-777 and 838; 191 and 564; 765; 454.
    **Style Rationale:** Some cross-references don't match.
    - Line 838 calls diagrams in VS Code's built-in Markdown preview "D2 option C". The table marks option B "Yes, as an opt-in" (776) and gives B the drawback "Two surfaces", which describes C.
    - The export command is called "Diagramist: Export" (191) in one place and "Diagramist: Export Diagram…" (564) in another.
    - Line 765 cites D5 for the preview panel, but the panel is D2.
    - Line 454 calls `--version` and `--self-test` subcommands; they are flags.

21. **Severity:** Nit
    **Affected Scope:** Lines 15, 42, 48, 49, 52-53, 60, 65, 543, 671-672, 688-689, 701, 713, 763, 779-782 and 786.
    **Style Rationale:** Many qualifiers are vague or are opinions.
    - "Small" for the checker (15) conflicts with the 56–159 MB measured (473-475). "Small" also appears at 60 and 543.
    - "Common" (42), "often several times" (48) and "mostly" (49) have no source.
    - "Fast, small and themeable, which suits exported images" (52-53): use the measured times instead. Themeability doesn't help exports, since D5 removes CSS variables from them (573-574).
    - "The real file" (65) means positions counted from the start of the file.
    - "Breaks easily … frequent releases" (671-672), "heavy" (713), "hundreds of megabytes, seconds to start, far more memory" (763) and "About 3 MB more" (782) are unmeasured.
    - "Every registry checked" (688-689) doesn't name the registries.
    - "Go well beyond" (701) is vague.
    - "Misses diagram types that GitHub lacks" (780) actually means it misses the warnings about them.
    - "Too thin, and costs tokens on every turn" (786) reads as a contradiction; state the trade-off.
    - "Possibly" (779) and "No" (781) give no reason.

    **Action: CALIBRATE or DROP.**

22. **Severity:** Nit
    **Affected Scope:** Lines 13, 33, 43 and 47 compared with 83, 105 and 124; 97; 98; 117 compared with 281 and 545; 133; 163 and 213; 164 and 197; 217; 399; 425; 527; 827-830.
    **Style Rationale:** Terms and voice are inconsistent.
    - "The person" and "the user" are used interchangeably. "As you type" (97) and "our edge cases" (425) break the third person.
    - "Written direction" (98) should be "source direction (`LR`/`TB`)".
    - Spelling mixes American and British forms: "organized" (117), "recognises" (281, 545).
    - "A Mermaid grammar" (133) should say "a TextMate grammar for syntax highlighting".
    - "Diagramist is installed" (163, 213) doesn't say whether it means the extension or the npm package.
    - "The README targets" and "the file targets" (164, 197) suggest targets set for a whole file, which D3 doesn't offer.
    - "Reachable" (217) doesn't fit a program that runs over stdio.
    - The command-line tool is placed under a `server/` folder (399).
    - "Opting out" (527) is the heading for `targets=mermaid,pele`, which is just the default.
    - Paths mix `~/` and `$HOME/` (827-830).

23. **Severity:** Nit
    **Affected Scope:** Lines 161, 168-169, 171, 178, 203, 333-338 and 597-598.
    **Style Rationale:** The user journeys and the sample output are imprecise.
    - CUJ 1 quotes an error message (168-169) that doesn't match the text format at line 334.
    - CUJ 1's title says the fix happens "before the user sees it", but the preview beside the README follows the editor text as it changes (171, 498).
    - CUJ 2 says the agent fixes the diagram "until it passes" (178), ignoring the rule to stop after three failures (352-353).
    - "The agent is told not to change the diagram for Pele" (203) is passive and doesn't say how the agent is told. The rules at 347-348 cover only "unsupported" and "too-large" errors.
    - The sample output shows one error for an unclosed `[`. Pele also rejects that input (concepts_brief.md 395-396), so show Pele's line or say it's left out.
    - "Often reported one line late" (337) rests on a single test.
    - The diagnostic report includes the checker's counts (597-598), yet the checker never talks to VS Code (256-257, 503-504). Say where the counts are stored.

24. **Severity:** Nit
    **Affected Scope:** Lines 314, 630 and 634; logging lines 378, 388-389 and 798.
    **Style Rationale:** Some limits mix a hard limit with an estimate, and the logging statements disagree.
    - "Under about 80 words" (630), "about 150 lines at most" (634) and "at most one today" (314) are each a limit and an estimate at once. Use a limit that can be tested, and "in v1" instead of "today".
    - Line 378 allows diagram text in logs at trace level. Line 798 says logs contain no diagram text or paths unless the user opts in. Say whether turning on trace level counts as opting in, and whether paths are logged at other levels.
