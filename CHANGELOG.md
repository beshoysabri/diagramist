# Changelog

All notable changes to Diagramist: the `diagramist` npm package, the VS Code extension and the agent
skill, which share one version number. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

*   **Versions:** odd minor versions (0.1, 0.3) are pre-releases and even ones (0.2, 0.4) are
    stable.
*   **Validator changes:** a release that changes any verdict, for example by upgrading Mermaid.js
    or Pele, lists those changes under that heading.

## [Unreleased]

### Added

*   **The VS Code extension:**
    *   **Problems panel:** errors for saved diagram files, at the same positions as
        `diagramist check`.
    *   **Preview:** a live preview with Mermaid.js and Pele.
    *   **Export:** SVG and PNG, with light, dark or current-theme colours.
    *   **Agent setup:** "Connect AI Agent", "Check Agent Setup" and "Disconnect AI Agent" for
        Claude Code, Gemini CLI, Antigravity CLI and Codex.
    *   **Diagnostic report:** "Copy Diagnostic Report".
*   **The agent skill:** `skills/diagramist/SKILL.md`, shipped in the npm package and the
    extension. It tells agents when and how to check, and when to stop and ask.
*   **Agent guide:** `docs/agents.md`, for every agent, with sources.

## [0.1.1] - 2026-11-14

### Fixed

*   `diagramist check` exits with 2, not 0, when the program reading its output stops before checking
    is done (for example `| head`).

### Changed

*   Published from GitHub Actions through npm trusted publishing, with provenance.

## [0.1.0] - 2026-11-14

### Added

*   **The first preview of the checker:** `diagramist check <files or folders>` checks every
    Mermaid diagram with Mermaid.js 12.3.0 and Pele 1.13.0.
*   **Options:** `--json`, `--verbose`, `--self-test`, `--version` and `--help`.

[Unreleased]: https://github.com/beshoysabri/diagramist/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/beshoysabri/diagramist/tree/v0.1.1
[0.1.0]: https://www.npmjs.com/package/diagramist/v/0.1.0
