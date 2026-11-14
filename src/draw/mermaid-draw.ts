// Draws a diagram with Mermaid.js in the browser (design item 99). The preview keeps Mermaid's default
// HTML labels so it looks like GitHub; exports turn them off.
import mermaid from "mermaid";
import { FONT_STACK } from "./theme-map.js";

export type MermaidTheme = "default" | "dark";

let configured: string | null = null;
let counter = 0;

export async function drawWithMermaid(element: HTMLElement, text: string, theme: MermaidTheme, options: { htmlLabels?: boolean } = {}): Promise<SVGSVGElement> {
  const config = JSON.stringify({ theme, htmlLabels: options.htmlLabels ?? true });
  if (configured !== config) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
      fontFamily: FONT_STACK,
      htmlLabels: options.htmlLabels ?? true,
      flowchart: { htmlLabels: options.htmlLabels ?? true },
    });
    configured = config;
  }
  const id = `diagramist-mermaid-${++counter}`;
  try {
    const { svg, bindFunctions } = await mermaid.render(id, text);
    // Parse in an inert document and drop inline event handlers (sequence diagrams' actor menus use
    // them), so the page never holds script attributes; its CSP would block them anyway.
    const parsed = new DOMParser().parseFromString(svg, "text/html");
    for (const node of parsed.querySelectorAll("*")) {
      for (const attribute of [...node.attributes]) if (attribute.name.toLowerCase().startsWith("on")) node.removeAttribute(attribute.name);
    }
    const source = parsed.querySelector("svg");
    if (!source) throw new Error("Mermaid.js returned no drawing.");
    const drawn = document.importNode(source, true);
    element.replaceChildren(drawn);
    bindFunctions?.(element);
    return drawn;
  } finally {
    // Mermaid.js leaves its scratch container, #d<id>, behind when rendering fails.
    document.getElementById(`d${id}`)?.remove();
  }
}
