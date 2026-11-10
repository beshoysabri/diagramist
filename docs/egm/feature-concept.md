# Feature concept: Pele Diagrams for VS Code

* **Author:** Beshoy Sabri
* **Date:** 2026-11-11
* **Status:** anchored working hypothesis, confirmed by the author as the input for an EGM
  brainstorm review (`egm-brainstorm`, Step 2).

## Anchored hypothesis

Pele Diagrams for VS Code is a public, open-source VS Code extension that previews Mermaid diagrams
with Obsidian's Pele library and offers Pele's render-and-check as tools that AI agents in VS Code
(Claude Code, Gemini CLI, Codex) can call. An agent writes a diagram, gets exact line-and-column
errors, fixes them, and the user watches the preview update. The extension calls no AI model itself,
and the code is organized one folder per feature.

## What the author said

* **Origin:** the first request was a "Gemini CLI, local-based" diagramming tool built on Pele,
  "packaged into a UI". The author then proposed a VS Code extension instead of a standalone app.
* **Use:** general use, not tied to an employer. The author wants VS Code to help them "diagram
  nicely".
* **Where they type:** in VS Code.
* **AI tools:** it must let any AI coding tool interact with it, "whether Claude Code on VS Code or
  Gemini CLI on VS Code". It should support Gemini CLI, Claude (Claude Code) and Codex.
* **Audience:** the project will be public. Some people may use it for work.
* **Code layout:** feature-based architecture.
* **Name:** "Pele Diagrams for VS Code".

## Renderer

Pele (https://pele.run, https://github.com/obsidianmd/pele, npm package `pele`, version 1.13.0 on
2026-11-11, MIT licence) renders Mermaid text to SVG themed with CSS variables. It was built for
Obsidian. Copies of its documentation are kept in the project's `.egm-context/` folder for reviewers.
