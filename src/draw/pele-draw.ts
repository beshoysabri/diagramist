// Draws a diagram with Pele in the browser (design item 98), with the checks' fixed options and the
// shared font stack. Pele's own error display shows inside the element; errors are also reported.
import { mount, render } from "pele";
import type { Mounted } from "pele";
import { PELE_CHECK_OPTIONS } from "../core/policy/policy.js";
import { FONT_STACK } from "./theme-map.js";

export interface PeleDrawing {
  update(text: string): void;
  destroy(): void;
}

export function drawWithPele(element: HTMLElement, text: string, onResult: (error: string | null) => void): PeleDrawing {
  let reported = false;
  const message = (error: unknown) => String((error as Error | undefined)?.message ?? error).split("\n")[0] || "Pele can't draw this diagram.";
  const options = {
    ...PELE_CHECK_OPTIONS,
    fontFamily: FONT_STACK,
    onRender: () => {
      reported = true;
      onResult(null);
    },
    onError: (error: unknown) => {
      reported = true;
      onResult(message(error));
    },
  };
  const mounted: Mounted = mount(element, text, options);
  // mount() draws at once; report the outcome if it didn't call back.
  if (!reported) onResult(mounted.error === undefined ? null : message(mounted.error));
  return {
    update: (next) => mounted.update(next, options),
    destroy: () => mounted.destroy(),
  };
}

/** Pele's SVG at natural size, for exports (design item 115). Throws Pele's error when it can't draw. */
export function renderPeleSvg(text: string): { svg: string; width: number; height: number } {
  const result = render(text, { ...PELE_CHECK_OPTIONS, responsive: false, fontFamily: FONT_STACK });
  return { svg: result.svg, width: result.width, height: result.height };
}
