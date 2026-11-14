// Helpers for driving the preview page in the webview tests.
import type { Page } from "@playwright/test";
import type { HostToWebview, PreviewBlock, Renderer, WebviewToHost } from "../../src/platform/messages.js";

type Status = Extract<WebviewToHost, { type: "status" }>;
type RenderMessage = Extract<HostToWebview, { type: "render" }>;

export async function openPreview(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __diagramist?: { messages: Array<{ type: string }> } }).__diagramist?.messages.some((m) => m.type === "ready"));
}

export function renderMessage(blocks: PreviewBlock[], renderer: Renderer, documentUri = "file:///workspace/test.md"): RenderMessage {
  return { type: "render", documentUri, fileName: "test.md", blocks, renderer, themeKind: "light", unsaved: false, locked: false };
}

/** Sends a host message, then waits until every block has reported its latest status. */
export async function renderAndWait(page: Page, message: RenderMessage): Promise<Map<number, Status>> {
  await page.evaluate(() => void ((window as unknown as { __diagramist: { messages: unknown[] } }).__diagramist.messages.length = 0));
  await page.evaluate((m) => window.postMessage(m, "*"), message);
  const indexes = message.blocks.map((block) => block.index);
  await page.waitForFunction(
    (wanted) => {
      const seen = new Set((window as unknown as { __diagramist: { messages: Array<{ type: string; blockIndex?: number }> } }).__diagramist.messages.filter((m) => m.type === "status").map((m) => m.blockIndex));
      return wanted.every((index) => seen.has(index));
    },
    indexes,
    { timeout: 90_000 },
  );
  const messages = await page.evaluate(() => (window as unknown as { __diagramist: { messages: unknown[] } }).__diagramist.messages);
  const latest = new Map<number, Status>();
  for (const m of messages as WebviewToHost[]) if (m.type === "status") latest.set(m.blockIndex, m);
  return latest;
}
