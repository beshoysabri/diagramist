# Agent evaluation results, v0.1

Design item 72. The procedure is in [PROCEDURE.md](PROCEDURE.md), and the raw records, one line per
diagram, are in [results-v0.1/](results-v0.1/).

**Run on 2026-11-14 with Claude Code only:**

*   **Versions:** Claude Code 2.1.311 with model `claude-sonnet-5-5`, and Diagramist built from
    commit c4d53e5 of branch `v0.1` (0.1.1 plus the skill and the MCP server). The renderers were
    Mermaid.js 12.3.0 and Pele 1.13.0.
*   **Still to run:** Gemini CLI, Antigravity CLI and Codex. They need the owner's logins.

## How it ran

`scripts/agent-eval/run-claude.mjs` automates PROCEDURE.md:

*   **Sessions:** one headless session (`claude -p`) per diagram, in a new folder under `/tmp`.
*   **Isolation:** only project settings load (`--setting-sources project`), so there is no user
    CLAUDE.md, no personal skills or plugins, and no MCP servers other than Diagramist's
    (`--strict-mcp-config`).
*   **Tools:** Read, Edit, Write, Bash and Skill. Only Diagramist and file edits are pre-approved
    (`--permission-mode dontAsk`).
*   **Prompts:** a headless session can't ask, so anything else is denied and recorded. Those
    denials stand in for permission prompts (U2).
*   **The runs:**
    *   **CLI:** the skill is in the folder's `.claude/skills/`, and `Bash(diagramist check *)` is
        pre-approved.
    *   **MCP:** `diagramist mcp` is passed with `--mcp-config`, and `mcp__diagramist__check` is
        pre-approved. There is no skill.

## Summary

| Run | Fixed | Fixed within three checks | Median checks | Same as intended fix | Denied tool uses | Median result size | Cost (USD) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-cli | 30/30 | 30/30 (100%) | 1 | 22/30 | 1 | 89 characters | 1.17 |
| claude-mcp | 30/30 | 30/30 (100%) | 1 | 23/30 | 0 | 136 characters | 0.88 |

*   **Fixing:** every diagram was fixed, in both runs, within three checks. That is 100% against
    Goal 3's target of 90%, and nobody needed the stop-after-three rule.
*   **Checks:** without the skill (MCP run), Claude Code more often checked once before fixing and
    once after: 13 of 30 sessions took two checks, against 8 of 30 with the skill.
*   **Meaning kept**, judged by hand on every fix that differs from the intended one: 29 of 30 in the
    CLI run and 30 of 30 in the MCP run. The differences:
    *   **Changed (CLI run, `timeline-missing-colon`):** the event "Launch" became part of the period
        name, `2027 Launch`, instead of `2027 : Launch`.
    *   **Kept:** these differed from the intended fix but kept the meaning:
        *   other names for a node called `end`;
        *   an unlabelled `alt`;
        *   a new `backend` group, instead of moving the service into `api`;
        *   a value of 1 for the missing Sankey value;
        *   `space:1` or `space` for `space:x`;
        *   an empty ER label `""`.

## U1: what a result costs

*   **Passing result:** one line, 89 characters through Bash and 136 through MCP, which wraps it.
    That's about 25 to 35 tokens.
*   **First failing result:** a median of 573 characters (CLI) or 667 (MCP), and at most 861. That's
    about 150 to 220 tokens.
*   **Context:** these are small next to a session's median input of about 30,000 tokens, which is
    mostly Claude Code's own system prompt, read from cache.

## U2: permission prompts

*   **CLI:** `Bash(diagramist check *)` covered every check but one. That one was
    `sed -i … && diagramist check diagram.md`: a joined command runs without asking only if every
    part is allowed, and `sed` wasn't. The skill now says to run the check as its own command.
*   **MCP:** `mcp__diagramist__check` covered every call.

## D7: does the MCP server ship?

*   **Claude Code: no.** The MCP server didn't raise the share fixed within three checks (100% in
    both runs), and the CLI can be pre-approved, so neither condition of D7's rule holds.
*   **Overall:** D7 stays open until Gemini CLI, Antigravity CLI and Codex have run. The server ships
    only if one of them meets the rule.

## Per run

### claude-cli

2.1.311 (Claude Code), model `claude-sonnet-5-5`, diagramist 0.1.1 (Mermaid.js 12.3.0, Pele 1.13.0).

| Diagram | Fixed | Checks | First pass | Same as intended fix | Denied |
| --- | --- | --- | --- | --- | --- |
| `flow-unclosed-bracket` | yes | 1 | 1 | yes | – |
| `flow-end-node` | yes | 1 | 1 | no | – |
| `flow-parentheses-in-label` | yes | 1 | 1 | yes | – |
| `flow-single-dash-arrow` | yes | 1 | 1 | yes | – |
| `flow-misspelled-type` | yes | 1 | 1 | yes | – |
| `flow-subgraph-without-end` | yes | 1 | 1 | yes | – |
| `flow-quotes-in-label` | yes | 1 | 1 | yes | – |
| `flow-space-in-id` | yes | 1 | 1 | no | – |
| `flow-unclosed-brace` | yes | 1 | 1 | yes | – |
| `flow-slash-comment` | yes | 1 | 1 | yes | – |
| `seq-alt-without-end` | yes | 1 | 1 | yes | – |
| `seq-missing-colon` | yes | 1 | 1 | yes | – |
| `seq-bad-arrow` | yes | 1 | 1 | yes | – |
| `seq-deactivate-inactive` | yes | 2 | 2 | no | – |
| `seq-else-outside-alt` | yes | 2 | 2 | no | – |
| `class-angle-generics` | yes | 1 | 1 | yes | – |
| `er-missing-label` | yes | 1 | 1 | yes | – |
| `state-single-dash` | yes | 1 | 1 | yes | – |
| `class-unclosed-brace` | yes | 1 | 1 | yes | – |
| `er-bad-cardinality` | yes | 3 | 3 | yes | Bash: sed -i 's/||--o ORDER/||--o{ ORDER/' diagram.md && diagramist check diagram.md |
| `gantt-missing-colon` | yes | 1 | 1 | yes | – |
| `gantt-misspelled-keyword` | yes | 1 | 1 | yes | – |
| `mindmap-two-roots` | yes | 2 | 2 | yes | – |
| `mindmap-unclosed-bracket` | yes | 1 | 1 | yes | – |
| `timeline-missing-colon` | yes | 2 | 2 | no | – |
| `xychart-unclosed-list` | yes | 1 | 1 | yes | – |
| `sankey-missing-value` | yes | 2 | 2 | no | – |
| `packet-missing-colon` | yes | 1 | 1 | yes | – |
| `architecture-unknown-group` | yes | 2 | 2 | no | – |
| `block-bad-space` | yes | 2 | 2 | no | – |

### claude-mcp

2.1.311 (Claude Code), model `claude-sonnet-5-5`, diagramist 0.1.1 (Mermaid.js 12.3.0, Pele 1.13.0).

| Diagram | Fixed | Checks | First pass | Same as intended fix | Denied |
| --- | --- | --- | --- | --- | --- |
| `flow-unclosed-bracket` | yes | 1 | 1 | yes | – |
| `flow-end-node` | yes | 2 | 2 | no | – |
| `flow-parentheses-in-label` | yes | 1 | 1 | yes | – |
| `flow-single-dash-arrow` | yes | 1 | 1 | yes | – |
| `flow-misspelled-type` | yes | 1 | 1 | yes | – |
| `flow-subgraph-without-end` | yes | 2 | 2 | yes | – |
| `flow-quotes-in-label` | yes | 1 | 1 | yes | – |
| `flow-space-in-id` | yes | 1 | 1 | no | – |
| `flow-unclosed-brace` | yes | 1 | 1 | yes | – |
| `flow-slash-comment` | yes | 1 | 1 | yes | – |
| `seq-alt-without-end` | yes | 1 | 1 | yes | – |
| `seq-missing-colon` | yes | 1 | 1 | yes | – |
| `seq-bad-arrow` | yes | 1 | 1 | yes | – |
| `seq-deactivate-inactive` | yes | 2 | 2 | no | – |
| `seq-else-outside-alt` | yes | 2 | 2 | no | – |
| `class-angle-generics` | yes | 2 | 2 | yes | – |
| `er-missing-label` | yes | 2 | 2 | no | – |
| `state-single-dash` | yes | 2 | 2 | yes | – |
| `class-unclosed-brace` | yes | 1 | 1 | yes | – |
| `er-bad-cardinality` | yes | 2 | 2 | yes | – |
| `gantt-missing-colon` | yes | 1 | 1 | yes | – |
| `gantt-misspelled-keyword` | yes | 1 | 1 | yes | – |
| `mindmap-two-roots` | yes | 2 | 2 | yes | – |
| `mindmap-unclosed-bracket` | yes | 1 | 1 | yes | – |
| `timeline-missing-colon` | yes | 2 | 2 | yes | – |
| `xychart-unclosed-list` | yes | 1 | 1 | yes | – |
| `sankey-missing-value` | yes | 2 | 2 | no | – |
| `packet-missing-colon` | yes | 1 | 1 | yes | – |
| `architecture-unknown-group` | yes | 2 | 2 | yes | – |
| `block-bad-space` | yes | 2 | 2 | no | – |
