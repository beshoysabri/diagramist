# Release checklist

Design item 135. Work through it before pushing a `v<version>` tag.

## Before the tag

*   [ ] **Version:** `packages/diagramist/package.json` and `packages/vscode/package.json` have the
    same version, and the build checks that. An odd minor version (0.1, 0.3) is a pre-release.
*   [ ] **Changelog:** `CHANGELOG.md` has the version and its date, and a "Validator changes"
    section if any verdict changed.
*   [ ] **CI:** the CI workflow passes on the commit to be tagged, including the extension tests on
    macOS and Windows.
*   [ ] **Size:** `npm run package` passes its size gates. Both files must stay under 15 MB.
*   [ ] **Restricted Mode, by hand:** open an untrusted folder in VS Code. The Problems panel and the
    preview work; Connect, Check and Disconnect AI Agent refuse; the diagnostic report says agent
    setup wasn't checked.
*   [ ] **Agent evaluation:** if the tool description, `SKILL.md` or a renderer changed, rerun it
    (`test/fixtures/agent-eval/PROCEDURE.md`).
*   [ ] **The MCP server:** only if it ships (D7), a Windows smoke test with each agent.

## Releasing

1.  Push the tag: `git tag -a v<version> -m "diagramist <version>" && git push origin v<version>`.
2.  The Release workflow runs the tests, packs both packages, and then:
    *   **npm:** stages the package. Approve it at npmjs.com → account settings → Staged Packages.
    *   **Marketplace:** publishes the extension, through Trusted Publishing.
    *   **Open VSX:** publishes it too, if the `OVSX_PAT` secret is set.
3.  Check that each one went live: `npm view diagramist version`, and the extension pages on
    Marketplace and Open VSX.
