# Goldfish Annotated Review Report

**Status: resolved** (2026-11-13). The author chose "auto accept". 30 PROPOSE FIX items were applied to
`docs/designs/diagramist.md`; 1 CONTEST (in part), 0 ESCALATE and 3 DECLINE were left as recorded below.
No findings remain unaddressed.

**Target:** `docs/designs/diagramist.md` (`full file`)
**Source:** [consolidated_review_report.md](consolidated_review_report.md): 30 action items, merged
from 179 raw findings across five stages. The consolidated report has the full descriptions and the
traceability table.

**Summary of suggestions:**

* PROPOSE FIX: 30
* CONTEST: 1 (in part)
* ESCALATE: 0
* DECLINE: 3

Five fixes reopen one of the author's decisions or change an approved goal. They are marked
**[changes your decision]**.

## Prioritized Findings & AI Suggestions

### [Issue 1] [`egm-zoom-out`, `egm-inventive-catalyst`, `egm-design`] - Severity: Blocker (CA-01) **[changes your decision: D3]**

*   **Affected Scope:** [Lines 520-533](../../designs/diagramist.md#L520-L533) (D3), plus Goal 2
    (82-86), CUJ 1 and CUJ 5, D1 (477-478), and items 37 and 40.
*   **Discrepancy Description:** Pele is a must-pass renderer by default, though every published
    destination draws with Mermaid.js. Diagrams GitHub accepts get errors and can be rewritten for
    Pele.
*   **Rationale:** This brings back the brief's Blocker 3. About seven proposed patches exist only to
    work around this default.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Destinations decision 1 (GitHub, Notion, documentation sites) makes
    Mermaid.js the renderer that matters for text, and export already lets the user pick Pele. Moving
    Pele's verdict to export time keeps the author's "both" intent (both always run) without false
    errors.
*   ***Proposed Edit:***
    *   Location: D3, Goal 2, CUJ 1, CUJ 5, D1, section 3 rules, items 32, 37 and 40, and SKILL.md
        contents (D8).
    *   Change: Default targets become `mermaid`, and both renderers always run. Pele failures are
        warnings unless the diagram says `targets=pele` or `targets=mermaid,pele`. The Pele export
        path shows Pele errors and offers Mermaid.js. `targets=none` silences deliberately broken
        examples. Drop "load Mermaid.js only when it is a target".

### [Issue 2] [`egm-design`, `egm-structural`] - Severity: Blocker (CA-02)

*   **Affected Scope:** whole FeatureRange; [Lines 791-816](../../designs/diagramist.md#L791-L816)
    (NFRs).
*   **Discrepancy Description:** There is no Risks & Limits section, although the feature-spec standard
    requires one.
*   **Rationale:** A fresh reader cannot confirm that all the major risks are covered.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The standard's requirement is explicit, and the risks are real. The lean form
    follows Stage 8's limit on scope.
*   ***Proposed Edit:***
    *   Location: new H2 "Risks & Limits", before Non-Functional Requirements.
    *   Change:
        *   About nine one-line risks, each with impact, mitigation (linked) and residual risk, as
            listed in CA-02.
        *   A limits table holding only the limits code enforces.
        *   The still-open unknowns move here.

### [Issue 3] [`egm-style`, `egm-design`, `egm-comprehension`] - Severity: Blocker (CA-03)

*   **Affected Scope:** [Line 12](../../designs/diagramist.md#L12), D3 (525-526), CUJ 1 (170), and the
    "OK" text in section 3.
*   **Discrepancy Description:** "Render where they will be used" and "works on GitHub and Notion"
    rest on a Mermaid.js check that only parses, at a version GitHub may not run.
*   **Rationale:** Agents and users will treat a pass as a guarantee.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The design's own non-goals (126-130) say both things, so the claims
    contradict the document.
*   ***Proposed Edit:***
    *   Location: Overview, D3, CUJ 1, section 3 text form, Goal 2, README and SKILL.md items.
    *   Change: Write "parses with Mermaid.js 12.3.0" and "renders with Pele 1.13.0". Each result header
        states the depth of each check. Add one Overview sentence on the version gap with GitHub and
        Notion. Remove "works on GitHub and Notion".

### [Issue 4] [`egm-style`, `egm-design`] - Severity: Blocker (CA-04)

*   **Affected Scope:** [Lines 112-116](../../designs/diagramist.md#L112-L116) (Goal 7), section 5
    (366-375), D6 (589-590), D1 (459-461).
*   **Discrepancy Description:** The design promises no network requests "without exceptions", while
    "Connect AI agent" runs `npm install -g`. Images are called "off by default" but cannot be turned
    on.
*   **Rationale:** Workplaces decide whether to allow Diagramist based on this promise.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Without the fix, the document contradicts itself on the claim that matters
    most for use at work.
*   ***Proposed Edit:***
    *   Location: Goal 7, section 5, D6, D1, NFR security bullet.
    *   Change:
        *   "No network requests at run time; the one exception is the optional `npm install -g` that
            the user confirms in Connect."
        *   Images are always off, with no setting.
        *   Goal 7's measure becomes "tests fail on any attempted outbound connection".

### [Issue 5] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-zoom-out`] - Severity: Blocker (CA-05)

*   **Affected Scope:** [Lines 850-1209](../../designs/diagramist.md#L850-L1209) (Detailed
    Implementation Plan).
*   **Discrepancy Description:** The plan is one flat list of 81 items, with no buildable or testable
    phases. Step 0 needs files that later items create.
*   **Rationale:** The standard requires incremental phases, and CI cannot pass until every file
    exists.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** This also builds in Stage 5's advice to test the agent loop first.
*   ***Proposed Edit:***
    *   Location: Detailed Implementation Plan.
    *   Change: Regroup the items into phases P1-P8 (as in CA-05). Each phase gets its file list and a
        "done when" gate made of named commands. Step 0 becomes P2. CI runs only the suites that exist.

### [Issue 6] [`egm-implementation-readiness`, `egm-style`, `egm-codebase-details`, `egm-zoom-out`] - Severity: Blocker (CA-07)

*   **Affected Scope:** [Lines 393-417](../../designs/diagramist.md#L393-L417) (section 7), items 4-7,
    10, 25-26, 49-51, 56, 58 and 64.
*   **Discrepancy Description:**
    *   Features must import each other, which the rules forbid.
    *   Drawing in the webview has no legal home.
    *   Nothing stops checker code from importing `vscode`.
    *   There are no entry files.
*   **Rationale:** The implementer would have to redesign the module structure.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The fix also removes the boundary violations Stages 5-7 found.
*   ***Proposed Edit:***
    *   Location: section 7, section 2, items 4-7, 10, 24-26, 49-52, 54-59, 62-65.
    *   Change:
        *   Add `src/entries/*` entry files.
        *   Merge `checker` and `cli`; fold export into preview, and the report into agent-setup.
        *   Move the theme map to the webview.
        *   Browser-only draw modules are importable only from webview code, with their own tsconfig.
        *   Add forbidden-import rules for `vscode`, `platform/vscode` and `platform/node`.
        *   State the `skipLibCheck` choice.

### [Issue 7] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-comprehension`, `egm-design`] - Severity: Blocker (CA-08)

*   **Affected Scope:** [Lines 226-293](../../designs/diagramist.md#L226-L293) (sections 1-3), section
    4 (355-362), D1 (480-484), items 24, 37 and 40-42.
*   **Discrepancy Description:**
    *   The design shows one worker in some places and two in others.
    *   The signatures are synchronous, though the work is not.
    *   There is no coordinator and no message schema.
    *   The timeout has no defined unit, and worker start-up can trip it.
    *   Dropped requests have no reply.
*   **Rationale:** This is the checker's central path.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Mermaid's `parse()` was confirmed asynchronous in the 2026-11-11 test, and
    every MCP call must get a reply.
*   ***Proposed Edit:***
    *   Location: sections 1-4, D1, items 24, 37, 40-42 and 51.
    *   Change: Spell out the CA-08 execution model:
        *   async signatures and a main-thread coordinator;
        *   the message schema between coordinator and workers;
        *   a per-block timeout that starts at "ready", and a 20 s start-up budget;
        *   no dropped MCP or CLI requests;
        *   exit codes 2 > 1 > 0;
        *   the step 0 single-worker test using Pele's `measurer`.

        Redraw the section 1 diagram.

### [Issue 8] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`, `egm-comprehension`] - Severity: Blocker (CA-09)

*   **Affected Scope:** [Lines 290-348](../../designs/diagramist.md#L290-L348) (section 3), CUJ 3
    (185), D7 (607-616), items 23, 27-29 and 70.
*   **Discrepancy Description:** Result format version 1 has gaps:
    *   no file-level status;
    *   three ways to represent a missing position;
    *   no source for targets;
    *   `retry` undefined for tool errors;
    *   "warning" with two meanings;
    *   no code lists;
    *   three text-line formats.
*   **Rationale:** Version 1 only allows fields to be added, so whatever the implementer picks becomes
    permanent.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** This has to be settled before any code.
*   ***Proposed Edit:***
    *   Location: section 3 (normative), CUJ 3, D7, items 23, 27-29, 31, 32 and 70.
    *   Change: Put the exact JSON Schema in the plan (CA-09). Write one text grammar with golden
        examples, and exact caps in characters. Rename block notices.

### [Issue 9] [`egm-zoom-out`] - Severity: Major (CA-06) **[changes your decision: D1 and D7 framing]**

*   **Affected Scope:** [Lines 15-20](../../designs/diagramist.md#L15-L20) (Overview), D1, D7, Goal 3.
*   **Discrepancy Description:** The MCP server causes most of the new risks:
    *   a resident process per session;
    *   Windows and Node-version-manager launch failures;
    *   structured-output and protocol questions;
    *   queue rules.

    The plan never weighed shipping the CLI first.
*   **Rationale:** All three agents have a shell, and SKILL.md already teaches `diagramist check`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** This is reversible either way. Deciding with data from the evaluation costs
    nothing.
*   ***Proposed Edit:***
    *   Location: Overview, D1, D7, the plan's P3 phase, Verification Plan.
    *   Change: P3 runs the Goal 3 agent evaluation with the CLI plus SKILL.md first. The MCP server
        ships in v1 only if it improves convergence or an agent needs it. The rest of D1 stays: npm
        package, global install.

### [Issue 10] [`egm-comprehension`, `egm-design`, `egm-zoom-out`] - Severity: Major (CA-10)

*   **Affected Scope:** section 3 (292, 350-353), items 49 and 69.
*   **Discrepancy Description:** The MCP inputs and outputs are undefined in several cases, and the
    structured output may exceed the token budget.
*   **Rationale:** Every input case needs a defined outcome.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Removing inputs is simpler than specifying them, and inputs can be added later.
*   ***Proposed Edit:***
    *   Location: section 3 tool paragraph, item 49.
    *   Change:
        *   Text content only, with no `outputSchema`.
        *   Inputs: `path` (relative to the server's working directory) or `text` (one diagram);
            passing both is an input error.
        *   Drop `block` and `oldestMermaid`. `isError` only for tool or input problems.

### [Issue 11] [`egm-design`, `egm-codebase-details`] - Severity: Major (CA-11)

*   **Affected Scope:** section 3 (292, 320-324), section 5 (364-378), items 29, 43 and 59.
*   **Discrepancy Description:** `check` reads any path and echoes its content. Snippets are not marked
    as untrusted. Exports keep remote references.
*   **Rationale:** The tool is meant to be pre-approved, and repositories can carry injected text.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The brief required snippets to be marked as data (brief line 247), and the
    draft dropped it.
*   ***Proposed Edit:***
    *   Location: section 5, items 29, 43 and 59.
    *   Change:
        *   Allowlist file types after resolving the real path; regular files only.
        *   Wrap snippets as untrusted data.
        *   Log messages only at trace level.
        *   Strip remote references from SVG exports.

### [Issue 12] [`egm-design`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major (CA-12)

*   **Affected Scope:** item 26 (985-991), item 31, section 3 rules (347-348).
*   **Discrepancy Description:** Only jison errors are mapped. Typos are classed "unsupported", so
    agents are told not to fix them.
*   **Rationale:** This breaks the fix loop that Goal 3 measures.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Evidence was checked on 2026-11-11: Mermaid.js `loc` columns count from 0
    (Mermaid 3, Pele 4 for the same error), and twelve types use the Langium parser.
*   ***Proposed Edit:***
    *   Location: items 25, 26 and 31, section 3 rules.
    *   Change: Map four error shapes. An unknown first keyword is "invalid" with a "did you mean" hint
        (`detectType()`). Only known external types are "unsupported". Add one corpus case per shape.

### [Issue 13] [`egm-design`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major (CA-13)

*   **Affected Scope:** section 5 (366-368), item 55 (1083-1085), item 72.
*   **Discrepancy Description:** A nonce-only style policy would strip the renderers' inline styles.
*   **Rationale:** The preview would lose its colours, and the export would copy the broken styling.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Mermaid.js writes `<style>` and `style=""` into its SVG.
*   ***Proposed Edit:***
    *   Location: section 5, items 55, 59 and 72.
    *   Change: Scripts by nonce, inline styles allowed, and the remaining risk stated. PNG through a
        `data:` URL. Tests run under the production CSP.

### [Issue 14] [`egm-zoom-out` (stage 8), `egm-comprehension`, `egm-codebase-details`, `egm-style`] - Severity: Major (CA-14)

*   **Affected Scope:** Goal 5 (103-104), section 4 (359-360), item 53.
*   **Discrepancy Description:** Diagnostics check unsaved editor text, while the agent checks the
    saved file. Their scope also differs between section 4 and item 53.
*   **Rationale:** Goal 5 is false by design as written.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Changing the input is simpler than adding a channel between processes.
*   ***Proposed Edit:***
    *   Location: Goal 5, section 4, D2 status line, item 53.
    *   Change: Diagnostics run on the saved file (open, save, external change) for open documents plus
        changed workspace diagram files. The preview gives as-you-type feedback. Goal 5 is restated
        for the same saved file and versions.

### [Issue 15] [`egm-zoom-out`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major (CA-15) **[changes your decision: D4]**

*   **Affected Scope:** [Lines 535-557](../../designs/diagramist.md#L535-L557) (D4), items 33-34, 49,
    51 and 61, and the setting at 940.
*   **Discrepancy Description:** Five mechanisms are built around a value users can't find. It lives
    in three places, the flag is missing from `mcp`, and the table can't be kept current.
*   **Rationale:** It carries permanent API cost for little gain.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Pele supports every type in Mermaid 12.1.0. So "Mermaid.js passes, Pele says
    unsupported" is a free newer-type signal, and the beta-suffix warning covers the rest.
*   ***Proposed Edit:***
    *   Location: D4, items 17, 33, 34, 49, 51 and 61, Future Improvements.
    *   Change: Keep the beta warning and add the free signal. Move the table, setting, flag and input
        to Future Improvements.

### [Issue 16] [`egm-zoom-out`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major (CA-16)

*   **Affected Scope:** item 17 (939-946), section 5 (374-375), D2 badge (505-506), items 46, 56 and
    71.
*   **Discrepancy Description:**
    *   `allowImages` can't work.
    *   `linkSchemes` is redundant.
    *   `limits.*` and `checkTimeoutMs` make the editor and the agent disagree.
    *   `autoDirection` opts out of a goal.
    *   The badge relies on a signal Pele doesn't give.
*   **Rationale:** Setting keys are permanent once released.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** This removes code, tests and an inconsistency.
*   ***Proposed Edit:***
    *   Location: item 17, section 5, D2, items 46, 56 and 71.
    *   Change:
        *   Keep `preview.defaultRenderer` (default `mermaid`) and `diagnostics.enabled` (default
            `true`).
        *   Drop the rest and the badge.
        *   Name the keybinding and its `when` clause.

### [Issue 17] [`egm-zoom-out`, `egm-design`, `egm-codebase-details`, `egm-comprehension`] - Severity: Major (CA-17)

*   **Affected Scope:** D1 (459-464), D8 (644-649), items 60-63.
*   **Discrepancy Description:**
    *   Setup parses three agents' config files and needs an unlisted TOML parser.
    *   Disconnect can delete another agent's skill.
    *   Windows, Node version managers and EACCES are not handled.
    *   The agent commands are unverified.
*   **Rationale:** The setup path is fragile and has one destructive case.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The agents' own `mcp list` and `get` replace config parsing.
*   ***Proposed Edit:***
    *   Location: D1, D8, items 60-63 and 75, Risks.
    *   Change:
        *   Use each agent's own add, remove and list commands in a visible terminal, with a Windows
            form.
        *   Never delete the shared skill folder.
        *   Document EACCES and Node version managers.
        *   Reserve the npm name.
        *   Give a source and check date for each command, or mark it unverified, with a verification
            step.

### [Issue 18] [`egm-inventive-catalyst`, `egm-design`] - Severity: Major (CA-18)

*   **Affected Scope:** D1 (462-464), Goal 5, items 62 and 65.
*   **Discrepancy Description:** The auto-updating extension and the global checker drift apart
    silently.
*   **Rationale:** This breaks Goal 5 in normal use.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** One local `--version` call on activation is cheap.
*   ***Proposed Edit:***
    *   Location: D1, item 65.
    *   Change: On activation, compare `diagramist --version` with the extension's version and show a
        non-blocking notice with the update command.

### [Issue 19] [`egm-zoom-out`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major (CA-19)

*   **Affected Scope:** section 2 `blocks` (275), items 22-23.
*   **Discrepancy Description:** Hand-written fence detection drifts from CommonMark, and one indent
    value per block can't map columns.
*   **Rationale:** It would get positions wrong in exactly the cases the corpus covers.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** markdown-it is pure JS and runtime-neutral.
*   ***Proposed Edit:***
    *   Location: section 2, items 1, 10, 22 and 23.
    *   Change: Use markdown-it to find fences, keep a per-line UTF-16 offset map, add `.markdown`, and
        allow the parser in the import rules.

### [Issue 20] [`egm-design`, `egm-codebase-details`, `egm-inventive-catalyst`, `egm-style`] - Severity: Major (CA-20) **[changes an approved goal: Goal 6]**

*   **Affected Scope:** Goal 6 (110-111), CUJ 4 (192-193), D5 (564-578), items 35, 57-59.
*   **Discrepancy Description:**
    *   The export font is described three ways.
    *   There is no PNG size cap.
    *   It is undefined what happens with no panel open.
    *   There is no theme map table.
    *   The preview and export use different `htmlLabels` settings.
*   **Rationale:** The implementer would have to design export.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** A PNG is exact because it is drawn where the text was measured. A system font
    stack is honest for SVG.
*   ***Proposed Edit:***
    *   Location: Goal 6, CUJ 4, D5, items 35, 57, 58 and 59.
    *   Change:
        *   A system font stack, with the "fixed font" claim relaxed.
        *   Off-screen redraw in the chosen renderer and theme, with `htmlLabels: false`.
        *   Natural size × scale, with a canvas cap and a clear error.
        *   When no panel is open, open it, then export.
        *   The full theme table, with `styles.css` generated from it.

### [Issue 21] [`egm-design`, `egm-style`, `egm-implementation-readiness`] - Severity: Major (CA-21)

*   **Affected Scope:** D1 resource table (469-475), NFR (802-803), step 0 (856-864).
*   **Discrepancy Description:** The memory figures were measured on the old single-thread layout.
    Step 0 has no oracle, no size metric and no pinned candidates.
*   **Rationale:** The figures and the choice rule are not backed for the chosen design.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** These measurements belong in step 0.
*   ***Proposed Edit:***
    *   Location: D1, NFR, step 0 (P2).
    *   Change:
        *   Label the figures as single-thread.
        *   Step 0 measures resident memory, using hand-verified Mermaid.js expectations for a corpus
            subset as the oracle.
        *   Pin the candidates.
        *   Spell out the fallback packaging edits.

### [Issue 22] [`egm-comprehension`, `egm-codebase-details`, `egm-style`] - Severity: Major (CA-22)

*   **Affected Scope:** D6 (591-598), item 64.
*   **Discrepancy Description:** The checker's counts can never reach the diagnostic report.
*   **Rationale:** The report is promised content no code can deliver.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** This keeps the stateless checker and drops a promise the design can't keep.
*   ***Proposed Edit:***
    *   Location: D6, item 64, a new counts module in the item list.
    *   Change: The extension keeps per-window counts (checks run, errors by renderer and code) in one
        module. Define the report template and redaction rules. The checker keeps none.

### [Issue 23] [`egm-codebase-details`, `egm-implementation-readiness`, `egm-style`] - Severity: Major (CA-23)

*   **Affected Scope:** items 1, 7, 13-15 and 17.
*   **Discrepancy Description:** The dependency and tooling list is incomplete, and the version pins
    have no recorded evidence.
*   **Rationale:** The implementer would have to add packages that were never approved.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The pins were checked with `npm view` on 2026-11-11, but the evidence isn't in
    any file reviewers can read.
*   ***Proposed Edit:***
    *   Location: items 1, 7, 13, 14, 15 and 17, Additional Resources.
    *   Change:
        *   Add Mocha, `@playwright/test`, `@vitest/coverage-v8` and `zod` 4.
        *   State each bundle's module format, plus `type` and `main`.
        *   Record the version checks, including `pele` `engines >=20`.
        *   Define or drop `release:check`.
        *   CI runs `npm run package`; add `id-token: write` and the pre-release mechanisms.

### [Issue 24] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`] - Severity: Major (CA-24)

*   **Affected Scope:** items 12, 66-68, 71 and 81, and the path at 1156.
*   **Discrepancy Description:**
    *   Globs are used for hand-written files.
    *   Files are missing.
    *   Item 81 is marked "Create" for an existing file.
    *   The `.gitignore` item duplicates existing entries.
    *   A path is wrong.
*   **Rationale:** The standard requires an exact allowlist.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** These are mechanical corrections.
*   ***Proposed Edit:***
    *   Location: the item list.
    *   Change: Name every file, add the missing ones (CA-24), fix the actions and paths, and reduce
        item 12 to `coverage/`.

### [Issue 25] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`, `egm-design`] - Severity: Major (CA-25)

*   **Affected Scope:** items 66-73, Verification Plan (1211-1229), Goals 1, 4 and 7.
*   **Discrepancy Description:**
    *   Tests have no expected outcomes.
    *   Whole features are untested.
    *   Measures are unchecked.
    *   The offline test covers only the CLI.
*   **Rationale:** Golden files would just record whatever the code produces.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Six expected Pele behaviours were already verified on 2026-11-11.
*   ***Proposed Edit:***
    *   Location: items 66-73, Verification Plan.
    *   Change:
        *   Expected results per corpus case.
        *   The missing tests (CA-25).
        *   Each measure tested or relabelled as a target.
        *   Offline scope that matches Goal 7, with a fallback.
        *   A CI Node matrix of 20 and 22.
        *   Fixtures for Restricted Mode and the webview API stub.

### [Issue 26] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`] - Severity: Major (CA-26)

*   **Affected Scope:** item 48 (1050-1051), items 54, 56 and 58.
*   **Discrepancy Description:** Four message names, with no fields. Link clicks, ready, lock, scroll
    and unsaved state are missing.
*   **Rationale:** The protocol is needed by four items.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Both sides come from one build, so no version field is needed.
*   ***Proposed Edit:***
    *   Location: item 48.
    *   Change: List the ten messages with their fields (CA-26).

### [Issue 27] [`egm-style`, `egm-comprehension`, `egm-codebase-details`] - Severity: Major (CA-27)

*   **Affected Scope:** many lines (see consolidated report CA-27).
*   **Discrepancy Description:**
    *   Claims that are absolute or uncalibrated.
    *   Conflicting timings.
    *   An undefined "one command".
    *   Untested placements of the targets comment.
    *   Disconnect's scope.
    *   Registry claims that go beyond the listings.
    *   "No step leaves a decision".
    *   An incomplete reconciliation list.
    *   Naming inconsistencies.
*   **Rationale:** Readers and agents act on these sentences.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** These are editorial changes.
*   ***Proposed Edit:***
    *   Location: as listed in CA-27.
    *   Change: One calibration pass. Preview timing becomes "redraw after a 150 ms pause; the Pele
        preview is visible within 300 ms of the pause". Command titles use title case.

### [Issue 28] [`egm-structural`, `egm-comprehension`, `egm-design`, `egm-style`, `egm-zoom-out`] - Severity: Major (CA-28)

*   **Affected Scope:** lines 16, 138, 140-157, 221-222, 419, 451, 454-455, 646, 654-787, 791-846.
*   **Discrepancy Description:**
    *   Drafting leftovers and stale question numbers.
    *   Undefined EGM jargon.
    *   Wrong heading levels.
    *   Alternatives whose reasons are preferences rather than trade-offs.
    *   Alternative 5 left open.
*   **Rationale:** A reader of the public repository can't follow these.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Editorial changes. The Alternative 5 outcome is on record: the author approved
    the Alternatives section on 2026-11-11.
*   ***Proposed Edit:***
    *   Location: as listed.
    *   Change: One editorial pass as listed in CA-28.

### [Issue 29] [`egm-zoom-out`, `egm-codebase-details`, `egm-style`] - Severity: Nit (CA-29) **[changes an approved goal: Goal 4, for Mermaid.js colours]**

*   **Affected Scope:** section 6 (385-387), D2 (502, 507-509), item 65, Goal 3 measure, item 8.
*   **Discrepancy Description:**
    *   The activation self-test repeats CI and starts jsdom in every window.
    *   The status-line hash has nothing to compare against.
    *   Theming Mermaid.js with VS Code colours makes it look less like GitHub.
    *   The release gate is too wide.
*   **Rationale:** Each costs more than it returns.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** It removes work. The Mermaid.js theme change is the author's call, because
    Goal 4 says "VS Code's theme colours".
*   ***Proposed Edit:***
    *   Location: section 6, D2, items 8, 52 and 65, Goal 3.
    *   Change: As listed in CA-29.

### [Issue 30] [`egm-design`] - Severity: Nit (CA-30)

*   **Affected Scope:** section 8 (424-426), NFR rollout (807-816).
*   **Discrepancy Description:** There is no versioning rule for renderer upgrades that change
    verdicts.
*   **Rationale:** Verdicts and exit codes are an API for CI users.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** It's one sentence, and it matches the brief (lines 334-336).
*   ***Proposed Edit:***
    *   Location: NFR rollout.
    *   Change: A verdict-changing upgrade is at least a minor release, with a "Validator changes"
        entry. A renderer major version means a Diagramist major version.

### [Issue 31] [`egm-inventive-catalyst`] - Severity: Nit

*   **Affected Scope:** section 3 rules, SKILL.md.
*   **Discrepancy Description:** Extra error-finding in the fix loop (hiding a line), and a stop
    signal in results.
*   **Rationale:** Fewer rounds per diagram.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** A Nit. Measure first in the agent evaluation; it can be added later.
*   ***Proposed Edit:*** none.

### [Issue 32] [`egm-design`] - Severity: Nit (part of design 18)

*   **Affected Scope:** item 51 folder scans.
*   **Discrepancy Description:** `.gitignore` handling, `--exclude` and `.mdx`.
*   **Rationale:** Scans can pick up build output.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** Pre-commit passes file names. `.markdown` is covered by Issue 19.
*   ***Proposed Edit:*** none.

### [Issue 33] [`egm-structural`, `egm-design`] - Severity: Nit

*   **Affected Scope:** the whole document's formatting.
*   **Discrepancy Description:** Bullet markers, bold lead-ins, a template for decision records, link
    styles and anchors.
*   **Rationale:** Symmetry.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** Nits with no effect on meaning. Measures for Goals 5 and 6 come in Issue 25.
*   ***Proposed Edit:*** none.

### [Issue 34] [`egm-structural`, `egm-design`] - Severity: Major (part of structural 3 and design 13)

*   **Affected Scope:** Alternatives (654-787), D-section records.
*   **Discrepancy Description:** Every "Rejected by author" should link a decision record.
*   **Rationale:** The Alternatives Rule.
*   ***AI Suggestion:*** CONTEST (in part)
*   ***Justification:*** The feature-spec standard, which the reviewers read, forbids crediting a
    rejection to a *maintainer* without a link. The document's author is not an upstream maintainer,
    and "Rejected by author: <reason>" is the form EGM's drafting step prescribes. The valid part,
    stating reasons as trade-offs rather than preferences, is accepted in Issue 28.
*   ***Proposed Edit:*** none beyond Issue 28.
