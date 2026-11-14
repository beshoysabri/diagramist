# Security

Please report vulnerabilities privately, through GitHub's
[private vulnerability reporting](https://github.com/beshoysabri/diagramist/security/advisories/new)
for this repository, not in a public issue.

Useful things to include: the version (`diagramist --version`, or the extension's version), your
operating system, and a diagram or file that shows the problem.

Diagramist bundles [Mermaid.js](https://github.com/mermaid-js/mermaid) and
[Pele](https://github.com/obsidianmd/pele). A vulnerability in one of them belongs with that project's
own security policy. If it affects Diagramist, a report here as well helps us update quickly.

## What Diagramist promises

*   **No network:** it makes no network requests at run time, and calls no AI model.
*   **Diagrams aren't run:** they are parsed and drawn. In the VS Code preview, a Content Security
    Policy allows no scripts but the preview's own, and loads no remote content.
*   **Files read:** the checker reads only `.md`, `.markdown`, `.mmd` and `.mermaid` files, up to
    1 MB of UTF-8, after resolving the real path.
*   **Untrusted output:** diagram text in results is labelled untrusted.

A way around any of these is a vulnerability.
