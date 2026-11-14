# Agent evaluation procedure

Design item 71. The evaluation answers three questions for Claude Code, Gemini CLI and Codex:

*   **Goal 3:** how often does an agent fix a broken diagram within three checks? The target is 90%.
*   **U1 and U2:** what does a check result cost the agent's model in tokens, and can the check run
    without a permission prompt?
*   **D7:** does the MCP server earn its place in v1? It ships if, for at least one agent:
    *   it raises the share fixed within three checks by 10 percentage points or more over the CLI;
        or
    *   the agent can't run `diagramist check` without a prompt on every call, while the MCP tool can
        be pre-approved.

It runs on the owner's agent accounts, so it starts only when the owner says so.

## Setup

*   **Machine:** Linux, with the agents' current versions. Record each agent's version and model.
*   **Diagramist:** install the version under test globally, either from npm
    (`npm install -g diagramist@<version>`) or from a build of this repository
    (`npm run build`, then `npm install -g ./packages/diagramist`).
*   **The set:** [`diagrams.json`](diagrams.json) has 30 diagrams:
    *   10 flowcharts;
    *   5 sequence diagrams;
    *   5 class, state or ER diagrams;
    *   5 Gantt, timeline or mindmap diagrams;
    *   5 beta or newer types.

    Each has one planted error that Mermaid.js rejects, and the intended fix.
    `test/node/agent-eval-set.test.ts` keeps that true.
*   **Isolation:** one fresh session per diagram, in a new empty folder that holds only `diagram.md`:
    a heading, one sentence, and the broken diagram in a ` ```mermaid ` fence. No memory or history
    carries over between sessions.
*   **Permissions:** allow file edits in that folder, and pre-approve only Diagramist: its command
    in run 1, its MCP tool in run 2. Deny anything else the agent asks for, and record it. The
    commands for each agent are in [`docs/agents.md`](../../../docs/agents.md).

## The prompt

The same for every agent, run and diagram:

> The Mermaid diagram in diagram.md doesn't render on GitHub. Fix it so that it does, without
> changing what it shows. Check your work with Diagramist before you finish.

## The two runs

1.  **CLI:** the skill is copied into the agent's skills folder, and `diagramist check` is
    pre-approved. The MCP server is not registered.
2.  **MCP:** the MCP server is registered (`diagramist mcp`) and its `check` tool is pre-approved.
    The skill is not installed.

Run all 30 diagrams with one agent before moving to the next agent.

## What to record per diagram

| Field | How |
| --- | --- |
| Fixed | `diagramist check diagram.md` exits 0 after the session |
| Checks to pass | Diagramist calls in the transcript, up to the first passing one |
| Within three | Fixed with at most three checks |
| Stopped and asked | After three failed checks on the same error, the agent stopped and asked |
| Meaning kept | The diagram shows the same nodes, edges and labels as the intended fix; judged by hand |
| Result tokens | Tokens of each check result as the agent reports them, else its length in characters (U1) |
| Prompts | Permission prompts the agent raised despite the pre-approval (U2) |

Also record the agent's version, its model, and the date of the run.

## Results

Write them to `results-v<version>.md` next to this file (design item 72):

*   one table per agent and run;
*   a summary with the share fixed within three checks per agent and run;
*   the D7 outcome, which is also recorded in `docs/designs/diagramist.md`.
