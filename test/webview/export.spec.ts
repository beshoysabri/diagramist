// Design item 116: PNG size is natural size × scale; the PNG size limit; SVG files carry no CSS
// variables and no remote references; and Pele refuses to export a diagram it can't draw.
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { ExportFormat, ExportTheme, Renderer, WebviewToHost } from "../../src/platform/messages.js";
import { startHarness } from "./harness.js";
import type { Harness } from "./harness.js";
import { openPreview, renderAndWait, renderMessage } from "./page.js";

let harness: Harness;
test.beforeAll(async () => {
  harness = await startHarness();
});
test.afterAll(async () => {
  await harness.close();
});

type Answer = Extract<WebviewToHost, { type: "export-bytes" | "export-error" }>;
let next = 0;

async function exportBlock(page: Page, blockIndex: number, renderer: Renderer, format: ExportFormat, scale = 1, theme: ExportTheme = "light"): Promise<Answer> {
  const requestId = `test-${++next}`;
  await page.evaluate((m) => window.postMessage(m, "*"), { type: "export-request", requestId, blockIndex, renderer, format, theme, scale });
  const handle = await page.waitForFunction(
    (id) => (window as unknown as { __diagramist: { messages: Array<{ type: string; requestId?: string }> } }).__diagramist.messages.find((m) => (m.type === "export-bytes" || m.type === "export-error") && m.requestId === id),
    requestId,
    { timeout: 60_000 },
  );
  return (await handle.jsonValue()) as Answer;
}

const svgText = (answer: Answer) => {
  if (answer.type !== "export-bytes") throw new Error(`export failed: ${answer.message}`);
  return Buffer.from(answer.base64, "base64").toString("utf8");
};
const pngSize = (answer: Answer) => {
  if (answer.type !== "export-bytes") throw new Error(`export failed: ${answer.message}`);
  const bytes = Buffer.from(answer.base64, "base64");
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

const DIAGRAM = { index: 1, firstLine: 3, text: 'flowchart LR\n  A[Start] --> B{Ready?}\n  B -->|yes| C[Ship]\n  click C href "https://example.com/ship"' };

for (const renderer of ["mermaid", "pele"] as Renderer[]) {
  test(`${renderer}: a PNG is the natural size times the scale`, async ({ page }) => {
    await openPreview(page, harness.url);
    await renderAndWait(page, renderMessage([DIAGRAM], renderer));
    const svg = svgText(await exportBlock(page, 1, renderer, "svg"));
    const width = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]);
    const height = Number(/<svg[^>]*\sheight="([\d.]+)"/.exec(svg)?.[1]);
    expect(width).toBeGreaterThan(0);
    for (const scale of [1, 2, 3]) {
      expect(pngSize(await exportBlock(page, 1, renderer, "png", scale)), `scale ${scale}`).toEqual({ width: Math.round(width * scale), height: Math.round(height * scale) });
    }
  });

  test(`${renderer}: an SVG has literal colours and no remote references`, async ({ page }) => {
    await openPreview(page, harness.url);
    await renderAndWait(page, renderMessage([DIAGRAM], renderer));
    for (const theme of ["light", "dark", "current"] as ExportTheme[]) {
      const svg = svgText(await exportBlock(page, 1, renderer, "svg", 1, theme));
      expect(svg, theme).toMatch(/^<\?xml[^>]*>\n<svg/);
      expect(svg, theme).not.toContain("var(--pele");
      expect(svg, theme).not.toContain("var(");
      expect(svg, theme).not.toMatch(/href="(https?:)?\/\//);
      expect(svg, theme).not.toContain("example.com");
    }
  });
}

test("refuses a PNG over the size limit", async ({ page }) => {
  await openPreview(page, harness.url);
  await renderAndWait(page, renderMessage([DIAGRAM], "pele"));
  const answer = await exportBlock(page, 1, "pele", "png", 100);
  expect(answer).toMatchObject({ type: "export-error" });
  expect((answer as Extract<Answer, { type: "export-error" }>).message).toContain("over the limit of 16,384 per side and 100,000,000 in total");
});

test("refuses a Pele export of a diagram Pele can't draw", async ({ page }) => {
  await openPreview(page, harness.url);
  // Mermaid.js draws this Sankey diagram; Pele rejects the value "abc" (corpus case sankey-abc).
  const sankey = { index: 1, firstLine: 1, text: "sankey\n  a,b,abc" };
  await renderAndWait(page, renderMessage([sankey], "pele"));
  const answer = await exportBlock(page, 1, "pele", "svg");
  expect(answer).toMatchObject({ type: "export-error" });
  expect((answer as Extract<Answer, { type: "export-error" }>).message).toMatch(/^Pele can't draw this diagram, so it can't export it: .* Fix the diagram, or export it with Mermaid\.js\.$/);
  expect((await exportBlock(page, 1, "mermaid", "svg")).type).toBe("export-bytes");
});
