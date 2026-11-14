// The preview webview (design item 102). It draws every diagram of the file with the chosen renderer,
// keeps the last good drawing dimmed under an error, shows a status line, and talks to the host.
import { drawWithMermaid } from "../../../draw/mermaid-draw.js";
import type { MermaidTheme } from "../../../draw/mermaid-draw.js";
import { drawWithPele } from "../../../draw/pele-draw.js";
import type { PeleDrawing } from "../../../draw/pele-draw.js";
import type { HostToWebview, PreviewBlock, PreviewState, Renderer, WebviewToHost } from "../../../platform/messages.js";

export interface VsCodeApi {
  postMessage(message: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare const __MERMAID_VERSION__: string | undefined;
declare const __PELE_VERSION__: string | undefined;
const VERSIONS: Record<Renderer, string> = {
  mermaid: typeof __MERMAID_VERSION__ === "string" ? __MERMAID_VERSION__ : "",
  pele: typeof __PELE_VERSION__ === "string" ? __PELE_VERSION__ : "",
};
const NAMES: Record<Renderer, string> = { mermaid: "Mermaid.js", pele: "Pele" };

interface BlockView {
  section: HTMLElement;
  drawing: HTMLElement;
  error: HTMLElement;
  /** What the drawing currently shows, so an unchanged block isn't drawn again. */
  drawn: string | null;
  pele: PeleDrawing | null;
}

type RenderMessage = Extract<HostToWebview, { type: "render" }>;

export function start(vscode: VsCodeApi): void {
  document.body.innerHTML = `
    <header>
      <span class="switch" role="group" aria-label="Renderer">
        <button type="button" data-renderer="mermaid" aria-pressed="false">Mermaid.js</button>
        <button type="button" data-renderer="pele" aria-pressed="false">Pele</button>
      </span>
      <button type="button" id="lock" aria-pressed="false" title="Keep showing this file">Lock</button>
      <span id="status" aria-live="polite"></span>
    </header>
    <main id="blocks"></main>`;
  const main = document.getElementById("blocks")!;
  const status = document.getElementById("status")!;
  const lock = document.getElementById("lock")!;
  const views = new Map<number, BlockView>();
  let current: RenderMessage | null = null;
  let currentBlock = 1;
  let updatedAt = "";
  let generation = 0;

  const showStatus = () => {
    if (!current) return;
    const count = current.blocks.length;
    const parts = [current.fileName, count ? `diagram ${Math.min(currentBlock, count)} of ${count}` : "no diagrams", `${NAMES[current.renderer]} ${VERSIONS[current.renderer]}`.trim()];
    if (updatedAt) parts.push(`updated ${updatedAt}`);
    status.textContent = parts.join(" · ");
    if (current.unsaved) {
      const note = document.createElement("span");
      note.className = "unsaved";
      note.textContent = " · unsaved changes: agents and the Problems panel check the saved file";
      status.append(note);
    }
  };

  const remember = () => {
    if (current) vscode.setState({ uri: current.documentUri, block: currentBlock, v: 1 } satisfies PreviewState);
  };

  const viewFor = (block: PreviewBlock): BlockView => {
    let view = views.get(block.index);
    if (!view) {
      const section = document.createElement("section");
      section.className = "block";
      section.tabIndex = 0;
      section.dataset.index = String(block.index);
      section.innerHTML = `<div class="label"></div><div class="error" role="alert"></div><div class="drawing"></div>`;
      view = { section, drawing: section.querySelector(".drawing")!, error: section.querySelector(".error")!, drawn: null, pele: null };
      views.set(block.index, view);
    }
    view.section.querySelector(".label")!.textContent = `Diagram ${block.index}, line ${block.firstLine}`;
    view.section.setAttribute("aria-label", `Diagram ${block.index}, line ${block.firstLine}`);
    return view;
  };

  const report = (blockIndex: number, error: string | null) => {
    if (!current) return;
    vscode.postMessage(error === null
      ? { type: "status", documentUri: current.documentUri, blockIndex, state: "ok" }
      : { type: "status", documentUri: current.documentUri, blockIndex, state: "error", errorText: error });
  };

  async function draw(message: RenderMessage, block: PreviewBlock, view: BlockView, mine: number): Promise<void> {
    const theme: MermaidTheme = message.themeKind === "dark" || message.themeKind === "high-contrast" ? "dark" : "default";
    const key = `${message.renderer}\u0000${theme}\u0000${block.text}`;
    if (view.drawn === key) return;
    if (message.renderer === "pele") {
      // Pele's mount keeps its own last good drawing and shows its own error display.
      if (!view.pele) {
        view.drawing.replaceChildren();
        view.pele = drawWithPele(view.drawing, block.text, (error) => {
          view.error.textContent = error ? `Pele can't draw this diagram: ${error}` : "";
          view.section.classList.toggle("stale", Boolean(error));
          report(block.index, error);
        });
      } else {
        view.pele.update(block.text);
      }
      view.drawn = key;
      return;
    }
    view.pele?.destroy();
    view.pele = null;
    const scratch = document.createElement("div");
    try {
      await drawWithMermaid(scratch, block.text, theme);
      if (mine !== generation) return;
      view.drawing.replaceChildren(...scratch.childNodes);
      view.error.textContent = "";
      view.section.classList.remove("stale");
      view.drawn = key;
      report(block.index, null);
    } catch (error) {
      if (mine !== generation) return;
      const text = String((error as Error | undefined)?.message ?? error).split("\n").find((line) => line.trim()) ?? "Mermaid.js can't draw this diagram.";
      view.error.textContent = `Mermaid.js can't draw this diagram: ${text}`;
      // The last good drawing stays, dimmed, under the error.
      view.section.classList.add("stale");
      view.drawn = null;
      report(block.index, text);
    }
  }

  async function render(message: RenderMessage): Promise<void> {
    const mine = ++generation;
    const rendererChanged = current?.renderer !== message.renderer || current?.documentUri !== message.documentUri;
    current = message;
    for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-renderer]")) {
      button.setAttribute("aria-pressed", String(button.dataset.renderer === message.renderer));
    }
    lock.setAttribute("aria-pressed", String(message.locked));
    lock.textContent = message.locked ? "Locked" : "Lock";
    if (rendererChanged) {
      for (const view of views.values()) view.pele?.destroy();
      views.clear();
    }
    for (const index of [...views.keys()]) {
      if (!message.blocks.some((block) => block.index === index)) {
        views.get(index)!.pele?.destroy();
        views.delete(index);
      }
    }
    main.replaceChildren(...message.blocks.map((block) => viewFor(block).section));
    if (message.blocks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = `No Mermaid diagrams in ${message.fileName}.`;
      main.append(empty);
    }
    showStatus();
    remember();
    // One after another: Mermaid.js renders through shared state.
    for (const block of message.blocks) {
      if (mine !== generation) return;
      await draw(message, block, viewFor(block), mine);
    }
    if (mine !== generation) return;
    updatedAt = new Date().toLocaleTimeString();
    showStatus();
  }

  window.addEventListener("message", (event: MessageEvent<HostToWebview>) => {
    const message = event.data;
    if (message?.type === "render") void render(message);
    else if (message?.type === "scroll-to-block") {
      currentBlock = message.index;
      for (const [index, view] of views) view.section.classList.toggle("current", index === message.index);
      views.get(message.index)?.section.scrollIntoView({ block: "nearest" });
      showStatus();
      remember();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    const rendererButton = target?.closest<HTMLButtonElement>("button[data-renderer]");
    if (rendererButton) {
      vscode.postMessage({ type: "renderer-switch", renderer: rendererButton.dataset.renderer as Renderer });
      return;
    }
    if (target?.closest("#lock")) {
      vscode.postMessage({ type: "lock", locked: lock.getAttribute("aria-pressed") !== "true" });
      return;
    }
    // Links inside drawings open only through the host, after the user confirms.
    const link = target?.closest("a");
    if (link && main.contains(link)) {
      event.preventDefault();
      const href = link.getAttribute("href") ?? link.getAttribute("xlink:href");
      if (href) vscode.postMessage({ type: "link-click", href });
    }
  });

  vscode.postMessage({ type: "ready" });
}

