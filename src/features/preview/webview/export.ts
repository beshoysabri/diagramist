// Exports one diagram (design item 115, D5). It redraws the diagram off-screen at natural size with
// the chosen renderer and theme, writes the computed colours and fonts onto every element so that the
// file needs no CSS variables, drops remote links, and returns SVG text or a PNG drawn on a canvas.
import { drawWithMermaid } from "../../../draw/mermaid-draw.js";
import { renderPeleSvg } from "../../../draw/pele-draw.js";
import { exportStyle } from "../../../draw/theme-map.js";
import type { ExportFormat, ExportTheme, Renderer, ThemeKind } from "../../../platform/messages.js";

export const PNG_LIMITS = { side: 16_384, pixels: 100_000_000 } as const;

const INLINED = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "opacity", "color", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline"];
const BACKGROUND: Record<"light" | "dark", string> = { light: "#ffffff", dark: "#1e1e1e" };

export interface ExportRequest {
  text: string;
  renderer: Renderer;
  format: ExportFormat;
  theme: ExportTheme;
  scale: number;
  /** VS Code's theme, for theme "current". */
  themeKind: ThemeKind;
}

/** Returns the file's bytes as base64. Throws an Error with a user-facing message when it can't. */
export async function exportDiagram(request: ExportRequest): Promise<string> {
  const dark = request.theme === "dark" || (request.theme === "current" && (request.themeKind === "dark" || request.themeKind === "high-contrast"));
  const holder = document.createElement("div");
  // In the preview's .diagram class, Pele follows VS Code's colours; a fixed palette overrides them.
  holder.className = "diagram";
  holder.setAttribute("style", `position: absolute; left: -100000px; top: 0; ${request.theme === "current" ? "" : exportStyle(request.theme)}`);
  document.body.append(holder);
  try {
    let svg: SVGSVGElement;
    if (request.renderer === "pele") {
      let drawn: ReturnType<typeof renderPeleSvg>;
      try {
        drawn = renderPeleSvg(request.text);
      } catch (error) {
        throw new Error(`Pele can't draw this diagram, so it can't export it: ${firstLine(error)} Fix the diagram, or export it with Mermaid.js.`);
      }
      holder.innerHTML = drawn.svg;
      svg = holder.querySelector("svg")!;
    } else {
      try {
        svg = await drawWithMermaid(holder, request.text, dark ? "dark" : "default", { htmlLabels: false });
      } catch (error) {
        throw new Error(`Mermaid.js can't draw this diagram: ${firstLine(error)}`);
      }
    }
    const { width, height, x, y } = naturalSize(svg);
    const background = request.theme === "current" ? getComputedStyle(document.body).backgroundColor : BACKGROUND[dark ? "dark" : "light"];
    const file = standalone(svg, { width, height, x, y, background });
    if (request.format === "svg") return utf8ToBase64(file);
    return await toPng(file, width, height, request.scale);
  } finally {
    holder.remove();
  }
}

function naturalSize(svg: SVGSVGElement): { width: number; height: number; x: number; y: number } {
  const box = svg.viewBox?.baseVal;
  if (box && box.width > 0 && box.height > 0) return { width: box.width, height: box.height, x: box.x, y: box.y };
  const rect = svg.getBBox();
  return { width: rect.width, height: rect.height, x: rect.x, y: rect.y };
}

/** A copy of the drawing that renders the same anywhere: literal colours, no variables, no remote links. */
function standalone(svg: SVGSVGElement, size: { width: number; height: number; x: number; y: number; background: string }): string {
  const elements = [svg, ...svg.querySelectorAll<SVGElement>("*")];
  const styles = elements.map((element) => {
    if (element instanceof SVGStyleElement || element.closest("title, desc")) return null;
    const computed = getComputedStyle(element);
    return INLINED.map((property) => `${property}: ${computed.getPropertyValue(property)}`).join("; ");
  });
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const copies = [copy, ...copy.querySelectorAll<SVGElement>("*")];
  copies.forEach((element, i) => {
    const style = styles[i];
    for (const attribute of [...element.attributes]) {
      const remote = (attribute.name === "href" || attribute.name === "xlink:href") && !/^(#|data:)/i.test(attribute.value);
      if (remote || attribute.value.includes("var(")) element.removeAttribute(attribute.name);
    }
    if (style) element.setAttribute("style", style);
  });
  // Drop style rules that still name a variable; the computed values above already cover them.
  for (const style of copy.querySelectorAll("style")) {
    if (style.textContent?.includes("var(")) style.textContent = style.textContent.replace(/[^{}]*\{[^{}]*var\([^{}]*\}/g, "");
  }
  copy.setAttribute("width", String(size.width));
  copy.setAttribute("height", String(size.height));
  copy.setAttribute("viewBox", `${size.x} ${size.y} ${size.width} ${size.height}`);
  const backdrop = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  for (const [name, value] of Object.entries({ x: size.x, y: size.y, width: size.width, height: size.height, fill: size.background })) backdrop.setAttribute(name, String(value));
  copy.insertBefore(backdrop, copy.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}\n`;
}

async function toPng(file: string, width: number, height: number, scale: number): Promise<string> {
  const pixelsWide = Math.round(width * scale);
  const pixelsHigh = Math.round(height * scale);
  if (pixelsWide > PNG_LIMITS.side || pixelsHigh > PNG_LIMITS.side || pixelsWide * pixelsHigh > PNG_LIMITS.pixels) {
    throw new Error(
      `At scale ${scale} the PNG would be ${pixelsWide.toLocaleString("en-US")} × ${pixelsHigh.toLocaleString("en-US")} pixels, over the limit of 16,384 per side and 100,000,000 in total. Choose a smaller scale, or export SVG.`,
    );
  }
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = pixelsWide;
  canvas.height = pixelsHigh;
  canvas.getContext("2d")!.drawImage(image, 0, 0, pixelsWide, pixelsHigh);
  return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function firstLine(error: unknown): string {
  const text = String((error as Error | undefined)?.message ?? error).trim();
  const line = text.split("\n").find((part) => part.trim()) ?? text;
  return /[.!?]$/.test(line) ? line : `${line}.`;
}
