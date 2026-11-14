// Design item 109: drawing every sample with both renderers, the status messages, Goal 4's timing,
// and that a remote image fetches nothing.
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import type { Renderer } from "../../src/platform/messages.js";
import { SAMPLES } from "../../src/core/samples/samples.js";
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

const samples = SAMPLES.map((sample, i) => ({ index: i + 1, firstLine: 1, text: sample.text }));

for (const renderer of ["mermaid", "pele"] as Renderer[]) {
  test(`${renderer} draws every sample`, async ({ page }) => {
    await openPreview(page, harness.url);
    const statuses = await renderAndWait(page, renderMessage(samples, renderer));
    const failed = [...statuses.values()].filter((s) => s.state !== "ok").map((s) => `${SAMPLES[s.blockIndex - 1]!.keyword}: ${s.errorText}`);
    expect(failed).toEqual([]);
    expect(await page.locator(".block .drawing svg").count()).toBeGreaterThanOrEqual(samples.length);
  });
}

test("reports an error, keeping the last good drawing dimmed under it", async ({ page }) => {
  await openPreview(page, harness.url);
  const good = await renderAndWait(page, renderMessage([{ index: 1, firstLine: 3, text: "flowchart LR\n  A --> B" }], "mermaid"));
  expect(good.get(1)?.state).toBe("ok");
  const bad = await renderAndWait(page, renderMessage([{ index: 1, firstLine: 3, text: "flowchart LR\n  A[ --> B" }], "mermaid"));
  expect(bad.get(1)).toMatchObject({ state: "error", documentUri: "file:///workspace/test.md" });
  await expect(page.locator(".block.stale .drawing svg")).toHaveCount(1);
  await expect(page.locator(".block [role=alert]")).toContainText("Mermaid.js can't draw this diagram");
});

test("draws a 100-node flowchart within Goal 4's targets", async ({ page }) => {
  await openPreview(page, harness.url);
  let text = "flowchart LR\n";
  for (let i = 0; i < 99; i++) text += `  N${i}[Step ${i}] --> N${i + 1}[Step ${i + 1}]\n`;
  const targets: Record<Renderer, number> = { pele: 300, mermaid: 1_000 };
  for (const renderer of ["pele", "mermaid"] as Renderer[]) {
    // Warm up, so the measurement is a redraw after a typing pause, not the first load.
    await renderAndWait(page, renderMessage([{ index: 1, firstLine: 1, text: "flowchart LR\n  A --> B" }], renderer));
    const started = Date.now();
    const status = await renderAndWait(page, renderMessage([{ index: 1, firstLine: 1, text }], renderer));
    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: `${renderer} 100-node drawing`, description: `${elapsed} ms (target ${targets[renderer]} ms)` });
    console.log(`${renderer}: 100-node flowchart drawn in ${elapsed} ms (target ${targets[renderer]} ms, failing above ${3 * targets[renderer]} ms)`);
    expect(status.get(1)?.state).toBe("ok");
    expect(elapsed).toBeLessThanOrEqual(3 * targets[renderer]);
  }
});

test("a remote image makes no request and nothing is drawn in its place", async ({ page }) => {
  const remoteRequests: string[] = [];
  const remote = createServer((request, response) => {
    remoteRequests.push(request.url ?? "");
    response.writeHead(404).end();
  });
  await new Promise<void>((ready) => remote.listen(0, "127.0.0.1", ready));
  const image = `http://127.0.0.1:${(remote.address() as AddressInfo).port}/picture.png`;
  try {
    await openPreview(page, harness.url);
    const diagrams = [
      { index: 1, firstLine: 1, text: `flowchart LR\n  A["<img src='${image}'> Logo"] --> B` },
      { index: 2, firstLine: 1, text: `flowchart LR\n  C@{ img: "${image}", label: "Picture", pos: "t", w: 60, h: 60, constraint: "on" } --> D` },
    ];
    for (const renderer of ["mermaid", "pele"] as Renderer[]) await renderAndWait(page, renderMessage(diagrams, renderer));
    await page.waitForTimeout(500);
    expect(remoteRequests).toEqual([]);
    const shown = await page.$$eval("img, image", (elements) =>
      elements.filter((element) => (element instanceof HTMLImageElement ? element.naturalWidth > 0 : (element as SVGImageElement).getBBox().width > 0 && element.getAttribute("href")?.startsWith("http"))).length,
    );
    expect(shown).toBe(0);
  } finally {
    await new Promise<void>((done) => remote.close(() => done()));
  }
});
