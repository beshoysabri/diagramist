// Design item 110: drawing the samples with both renderers breaks no rule of the page's
// Content-Security-Policy. One known exception: Mermaid.js gives sequence-diagram actors with `link`
// lines a click menu through inline `onclick` handlers, which the policy blocks as intended. Those
// menus don't open in the preview; the diagram itself still draws.
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
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

const hasActorMenus = (text: string) => /^\s*links?\s/m.test(text);
const violations = (page: Page) => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations.splice(0));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const found: string[] = [];
    (window as unknown as { __violations: string[] }).__violations = found;
    document.addEventListener("securitypolicyviolation", (event) => found.push(event.violatedDirective));
  });
});

test("no securitypolicyviolation events while drawing the samples", async ({ page }) => {
  await openPreview(page, harness.url);
  for (const renderer of ["mermaid", "pele"] as Renderer[]) {
    const blocks = SAMPLES.filter((sample) => renderer === "pele" || !hasActorMenus(sample.text)).map((sample, i) => ({ index: i + 1, firstLine: 1, text: sample.text }));
    await renderAndWait(page, renderMessage(blocks, renderer, `file:///workspace/${renderer}.md`));
    expect(await violations(page), renderer).toEqual([]);
  }
});

test("Mermaid.js actor menus are blocked, and only they are", async ({ page }) => {
  await openPreview(page, harness.url);
  const withMenus = SAMPLES.filter((sample) => hasActorMenus(sample.text)).map((sample, i) => ({ index: i + 1, firstLine: 1, text: sample.text }));
  expect(withMenus.length).toBeGreaterThan(0);
  const statuses = await renderAndWait(page, renderMessage(withMenus, "mermaid"));
  expect([...statuses.values()].every((status) => status.state === "ok")).toBe(true);
  expect(new Set(await violations(page))).toEqual(new Set(["script-src-attr"]));
  expect(await page.$$eval("*", (elements) => elements.filter((element) => [...element.attributes].some((a) => a.name.startsWith("on"))).length)).toBe(0);
});
