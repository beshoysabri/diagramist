# Diagramist packaging notes (phase P2)

**Status:** done on 2026-11-13. This file records the P2 gate from
[diagramist.md](diagramist.md#phase-p2-packaging-test): the results, the chosen browser stand-in,
the worker layout and the memory budget for risk R5.

**Decisions:**

1.  **Stand-in: linkedom 0.18.15.** Every candidate passes every case once bundled. linkedom uses
    the least memory on Linux, macOS and Windows, and has the smallest bundle.
2.  **Layout: one check worker** runs both renderers. Pele gets an explicit text measurer
    (width = characters × font size × 0.6).
3.  **Memory budget:** a checker process with a ready check worker stays under **256 MB resident**
    after checking the corpus and one diagram of every type, on Linux with Node 22 and 24.
4.  **Minimum versions:** Node 22.12 for the CLI, and VS Code 1.101 for the extension.

## How it was tested

`scripts/spike/bundle-mermaid-worker.mjs` (design item 41) builds each worker with esbuild 0.28.2:
one bundle, minified, ES module for Node 22.12. It then runs each layout in fresh Node processes
through `scripts/spike/harness.ts`. The harness starts the workers, checks every diagram, compares
each verdict with `test/fixtures/corpus/cases.json` using the unit tests' rules, and reports:

*   **Verdicts:**
    *   the 26 corpus diagrams (25 cases; one case has two diagrams);
    *   the 48 samples, one per diagram type, each of which must pass and report its type;
*   **Memory:** the whole process's resident memory (`process.memoryUsage().rss`), measured at
    three points: when the workers are ready, after the corpus, and after the samples. The samples
    load every diagram type, so the last figure is the worst case;
*   **Time:** the start-up time and the total check time;
*   **Worker output:** anything a worker printed;
*   **Network:** requests to a local server. Three probe diagrams point 14 resources at it:
    *   in labels: images, iframes, stylesheets, scripts, objects, CSS `@import`, SVG images and
        video posters;
    *   a `click` link;
    *   URLs in an `init` directive.

The renderers were Mermaid.js 12.3.0 and Pele 1.13.0. The candidates were jsdom 31.0.0, happy-dom
21.0.4 and linkedom 0.18.15. Each candidate installs the eight globals from design item 50; all
three provide every one.

**Where it ran:**

*   bshome (Linux x64, Node 22.22.1), median of 5 runs;
*   bshome on Node 22.12.0 and 22.15.1, one run each;
*   GitHub Actions, median of 3 runs: Linux on Node 22.12.0, 22.23.4 and 24.22.2, macOS arm64 on
    Node 22.23.4, and Windows x64 on Node 22.23.4
    ([run 43482143069](https://github.com/beshoysabri/diagramist/actions/runs/43482143069)).

## Results

### All layouts, on bshome

Linux x64, Node 22.22.1, median of 5 fresh processes. Memory is the resident memory of the whole
process, in MB.

| Layout | Mermaid.js corpus | Mermaid.js samples | Pele corpus | Pele samples | Start-up (ms) | Memory: ready / corpus / samples | Checks (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| No workers (baseline) | – | – | – | – | – | 65.2 / 65.2 / 65.2 | – |
| Pele worker only | – | – | 26/26 | 48/48 | 110 | 80.0 / 84.6 / 98.7 | 250 |
| Mermaid.js worker, no stand-in | 22/26 | 14/48 | – | – | 334 | 121.9 / 147.8 / 189.2 | 1,178 |
| jsdom: Mermaid.js worker | 26/26 | 48/48 | – | – | 858 | 192.6 / 214.1 / 253.6 | 1,325 |
| jsdom: two workers | 26/26 | 48/48 | 26/26 | 48/48 | 120 + 984 | 206.7 / 231.1 / 277.2 | 1,361 |
| jsdom: one worker | 26/26 | 48/48 | 26/26 | 48/48 | 896 | 210.9 / 242.3 / 276.2 | 1,567 |
| happy-dom: Mermaid.js worker | 26/26 | 48/48 | – | – | 470 | 143.7 / 164.1 / 207.0 | 1,395 |
| happy-dom: two workers | 26/26 | 48/48 | 26/26 | 48/48 | 112 + 530 | 158.1 / 180.7 / 230.8 | 1,402 |
| happy-dom: one worker | 26/26 | 48/48 | 26/26 | 48/48 | 531 | 147.3 / 169.4 / 216.8 | 1,626 |
| linkedom: Mermaid.js worker | 26/26 | 48/48 | – | – | 460 | 136.7 / 158.1 / 200.6 | 1,331 |
| linkedom: two workers | 26/26 | 48/48 | 26/26 | 48/48 | 116 + 450 | 151.1 / 175.0 / 224.6 | 1,436 |
| **linkedom: one worker** | 26/26 | 48/48 | 26/26 | 48/48 | 486 | 141.6 / 163.7 / 211.6 | 1,576 |

The one-worker rows use the Pele measurer. "Checks" is the time for every diagram with every
renderer in the layout: 74 checks with one renderer, 148 with both.

### Memory on each platform

Resident memory in MB after all samples, median of 3 fresh processes.

| Platform | Node | Baseline | jsdom | happy-dom | linkedom | linkedom, two workers | linkedom, one worker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Linux x64 (GitHub) | 22.12.0 | 54.2 | does not load | 199.6 | 193.8 | 221.6 | 206.0 |
| Linux x64 (GitHub) | 22.23.4 | 57.3 | 259.5 | 202.5 | 185.3 | 210.5 | 194.4 |
| Linux x64 (GitHub) | 24.22.2 | 65.9 | 278.3 | 231.5 | 209.0 | 239.5 | 227.4 |
| macOS arm64 (GitHub) | 22.23.4 | 53.0 | 248.1 | 194.2 | 187.8 | 211.1 | 201.6 |
| Windows x64 (GitHub) | 22.23.4 | 46.4 | 174.4 | 145.3 | 142.4 | 163.9 | 153.3 |
| Linux x64 (bshome, 5 runs) | 22.22.1 | 65.2 | 253.6 | 207.0 | 200.6 | 224.6 | 211.6 |

Every candidate passed every corpus case and sample on every platform, except jsdom on Node 22.12.0.
Windows reports less memory because it counts the working set.

### Bundle sizes

Minified, without licence comments.

| Bundle | Size | Gzipped |
| --- | --- | --- |
| Pele only | 0.72 MB | 0.27 MB |
| Mermaid.js, no stand-in | 5.43 MB | 1.54 MB |
| Mermaid.js with jsdom | 10.42 MB | 2.70 MB |
| Mermaid.js with happy-dom | 6.50 MB | 1.81 MB |
| Mermaid.js with linkedom | 5.88 MB | 1.68 MB |
| **Check worker: Pele, and Mermaid.js with linkedom** | 6.62 MB | 1.95 MB |

The largest parts of the check worker bundle are:

*   mermaid, 1.75 MB;
*   elkjs, 1.52 MB;
*   Pele, 0.74 MB;
*   @mermaid-js/parser, 0.66 MB;
*   Cytoscape, 0.46 MB;
*   KaTeX, 0.27 MB;
*   linkedom's CSS parser, 0.20 MB.

elkjs, Cytoscape and KaTeX only draw. Leaving them out is in the design's Future Improvements.

## Findings

1.  **A stand-in is required.** Without one, Mermaid.js's sanitizer, DOMPurify, can't start. Mermaid.js
    then fails 4 of the 26 corpus diagrams and 34 of the 48 samples ("addHook is not a function").
2.  **No stand-in made a network request,** on any platform. All three gave the same Mermaid.js
    verdicts on the probe diagrams: all three pass.
3.  **DOMPurify works properly only under jsdom.**
    *   **What each stand-in did** with
        `<img src=x onerror=alert(1)>Hi <b>there</b><script>alert(2)</script><a href="javascript:alert(3)">x</a>`:
        *   jsdom removed the handler, the script and the `javascript:` link;
        *   happy-dom says it supports DOMPurify, but kept the script and the `javascript:` link;
        *   under linkedom, DOMPurify reports no support and returns the text unchanged.
    *   **This doesn't matter for the checker.** Mermaid.js's verdicts don't depend on it: they were
        the same under all three stand-ins, and match Chromium on the corpus (`npm run verify:corpus`).
        The check worker never draws and never returns label text. The preview draws in VS Code's
        webview, a real browser with a real DOMPurify.
    *   **It is a reason never to draw in the check worker.**
4.  **jsdom is the weakest fit:**
    *   **Bundling:** it only bundles with a patch. Its XMLHttpRequest module looks for a helper file
        when it loads.
    *   **Node version:** it fails to load on Node 22.12.0 ("Cannot read properties of undefined
        (reading 'bind')"). Its HTTP library, undici 8, sets up zlib's zstd decompressor when it
        loads, and Node only added zstd in 22.15. jsdom 31 declares `^22.22.2 || ^24.15.0 || >=26`,
        which only VS Code 1.123 and later meet.
    *   **Size and memory:** it is the largest bundle and uses the most memory, 30 to 75 MB more than
        linkedom.
    *   **Output:** with jsdom present and no measurer, Pele triggers one "Not implemented:
        HTMLCanvasElement's getContext()" message.
5.  **Pele is happy in the shared worker.** It gives the same verdicts with and without the measurer
    under all three stand-ins, and prints nothing under happy-dom or linkedom. The measurer stays,
    so that verdicts never depend on a stand-in's canvas.
6.  **Speed:**
    *   **Mermaid.js:** about 40 ms for the first check, and at most about 120 ms for the first
        diagram of a new type.
    *   **Pele:** 6 ms for the first check, and at most 17 ms.
    *   **One worker or two:** running both renderers in one worker adds about 1 ms per diagram,
        since they take turns: 1,576 ms against 1,436 ms for 148 checks.

## Decisions

### Stand-in: linkedom 0.18.15

The design's rule is the lowest resident memory among the candidates that pass every case, with a
tie going to the smaller bundle. linkedom has the lowest memory on every platform and is also the
smallest bundle:

*   **Memory:** after all samples, 3 to 23 MB below happy-dom and 30 to 75 MB below jsdom.
*   **Engines:** it declares Node `>=16`, so it adds no constraint. It has no network code.
*   **In the repository:** `linkedom` 0.18.15 replaces `jsdom` in `dependencies`. happy-dom and jsdom
    are gone. `src/platform/node/dom-standin.ts` (design item 50) installs it, and the import rule
    `linkedom-only-in-dom-standin` keeps it there. The Mermaid.js unit tests install the same
    stand-in through `test/helpers/install-dom-standin.ts`.

### Layout: one check worker

One worker runs Pele, then Mermaid.js, for each block. Compared with a worker per renderer:

*   **Memory:** it saves 10 to 16 MB.
*   **Start-up:** there is one start-up instead of two.
*   **Speed:** it costs about 1 ms per diagram.
*   **Recovery:** a Pele time-out or crash now also restarts Mermaid.js, which takes 0.2 to 0.6 s.
    That is rare, and acceptable.

The worker posts one `result` per renderer, so after a time-out the coordinator knows which renderer
didn't finish (design, Technical Plan section 3). `checkWithPele` takes the measurer as an optional
argument.

### Memory budget (risk R5)

| Moment | Whole checker process | What the worker adds |
| --- | --- | --- |
| Before the worker starts | 53 to 66 MB | – |
| Worker ready | 124 to 143 MB | 65 to 85 MB |
| After typical diagrams (the corpus, mostly flowcharts) | 146 to 166 MB | 89 to 105 MB |
| After one diagram of every type | 194 to 228 MB | 135 to 165 MB |

These figures are for Linux and macOS, with one check worker and linkedom. The highest was Node 24
on Linux, at 227.4 MB.

**Budget:** under 256 MB resident after the corpus and every sample, on Linux with Node 22 and 24.
P3's `test:checker` asserts it and prints the measured value. The extension host pays the "worker
adds" column on top of its own memory.

### Minimum versions

*   **CLI:** Node 22.12, from Mermaid.js 12.3.0's engines. The bundled check worker passed on
    Node 22.12.0.
*   **Extension:** VS Code 1.101, the oldest whose extension host meets Node 22.12. It runs
    Electron 35.5.1 with Node 22.15.1, and the bundled check worker passed on Node 22.15.1. The
    manifest's `engines.vscode` becomes `^1.101.0`, and `@types/vscode` is pinned at 1.101.0.
*   **VS Code versions and their Node** (checked on 2026-11-13 from VS Code's `.npmrc` and Electron's
    release list):
    *   1.100, Node 20.19.0;
    *   1.101, Node 22.15.1;
    *   1.107, Node 22.21.1;
    *   1.113 to 1.122, Node 22.22.1;
    *   1.123, Node 24.15.0;
    *   1.145, Node 24.22.0.

### Packaging

Everything bundles, so the unbundled fallback in the design isn't needed:

*   **Size:** the check worker is 6.62 MB minified, or 1.95 MB gzipped, well inside the 15 MB packed
    limit.
*   **What P3's build needs** (design item 44):
    *   a `createRequire` banner for bundled CommonJS code;
    *   `canvas` kept external, because it is linkedom's optional dependency.

## Running it again

```sh
npm install --no-save jsdom@31.0.0 happy-dom@21.0.4
node scripts/spike/bundle-mermaid-worker.mjs --runs 5
```

The bundles and `results.json` go to `out/spike/`, which git ignores. To test another Node version,
run the script with that version of `node`. For example, `npx -p node@22.12.0 -- node
scripts/spike/bundle-mermaid-worker.mjs --runs 1`.
