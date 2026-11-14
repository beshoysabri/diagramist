# Checking diagrams in CI and before commits

`diagramist check` exits with 1 when a diagram has an error, and with 2 when a file can't be checked,
so it can stop a commit or fail a CI job. Warnings and notices never change the exit code.

## A pre-commit hook

Save this as `.git/hooks/pre-commit` and make it executable (`chmod +x .git/hooks/pre-commit`). It
checks the Markdown and Mermaid files staged for the commit:

```sh
#!/bin/sh
# Check the Mermaid diagrams in the files staged for this commit.
git diff --cached --name-only -z --diff-filter=ACM -- '*.md' '*.markdown' '*.mmd' '*.mermaid' |
  xargs -0 -r diagramist check
```

It checks each file as it is on disk. If you staged only part of a file, the unstaged part is
checked too.

## GitHub Actions

```yaml
name: Diagrams

on: [push, pull_request]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: "22"
      # Pin the version, so a new release never changes a verdict without a commit.
      - run: npm install -g diagramist@0.1.1
      - run: diagramist check .
```

`diagramist check .` checks every `.md`, `.markdown`, `.mmd` and `.mermaid` file in the repository,
skipping `node_modules` and hidden folders.

### Errors as annotations

GitHub can show each problem on the pull request's changed lines. Save this as
`.github/diagramist-matcher.json`:

```json
{
  "problemMatcher": [
    {
      "owner": "diagramist",
      "pattern": [
        {
          "regexp": "^(.+?):(\\d+):(\\d+): (error|warning) \\[(.+?)\\] (.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "code": 5,
          "message": 6
        }
      ]
    }
  ]
}
```

Then add a step before the check:

```yaml
      - run: echo "::add-matcher::.github/diagramist-matcher.json"
```

Problems without a position (`<file>:<line>: error …`) still appear in the job log; only positioned
ones become annotations.
