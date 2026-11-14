// Design item 111: every --pele-* variable the bundled Pele reads has an entry in the theme map, so
// no part of a Pele drawing is left unthemed by accident.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportStyle, previewCss, THEME_MAP } from "../../src/draw/theme-map.js";

const pele = readFileSync(join(process.cwd(), "node_modules/pele/dist/pele.js"), "utf8");
const mapped = new Set(THEME_MAP.map((entry) => entry.variable));

describe("the theme map", () => {
  it("covers every --pele-* variable in the bundled Pele", () => {
    const used = new Set(pele.match(/--pele-[a-z0-9-]*[a-z0-9]/g));
    // Series colours are built as "--pele-series-" + n; the map covers series 1 to 8.
    used.delete("--pele-series");
    for (let n = 1; n <= 8; n++) used.add(`--pele-series-${n}`);
    expect([...used].filter((name) => !mapped.has(name)).sort()).toEqual([]);
  });

  it("follows VS Code's theme in the preview, with high-contrast borders", () => {
    const css = previewCss();
    expect(css).toContain("--pele-bg: var(--vscode-editor-background);");
    expect(css).toMatch(/body\.vscode-high-contrast[^{]*\{[^}]*--pele-line: var\(--vscode-contrastBorder\);/);
  });

  it("uses fixed colours for exports, with no CSS variables", () => {
    for (const theme of ["light", "dark"] as const) {
      const style = exportStyle(theme);
      expect(style).toContain("--pele-bg: #");
      expect(style).not.toContain("var(");
    }
  });
});
