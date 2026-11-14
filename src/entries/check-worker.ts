// The check worker (design item 52). Installs the browser stand-in, loads both checks, and answers
// each check request with one result per renderer: Pele first, then Mermaid.js.
import { parentPort } from "node:worker_threads";
import type { RawVerdict } from "../core/renderers/types.js";
import { installDomStandin } from "../platform/node/dom-standin.js";
import { RENDERER_VERSIONS } from "../platform/node/versions.js";
import type { FromWorker, ToWorker } from "../platform/node/worker-messages.js";

const port = parentPort;
if (!port) throw new Error("check-worker must run as a worker thread");
const post = (message: FromWorker) => port.postMessage(message);

// Mermaid.js reads the browser objects when it loads, so it is imported only after they exist.
installDomStandin();
const { CHECK_MEASURER, checkWithPele } = await import("../core/renderers/pele/check.js");
const { checkWithMermaid } = await import("../core/renderers/mermaid/check.js");

// Test hook (design item 47): a pause before each check, to exercise the time limit.
const slowMs = process.env.DIAGRAMIST_TEST_HOOKS === "1" ? Number(process.env.DIAGRAMIST_TEST_SLOW_MS) || 0 : 0;

async function safely(check: () => Promise<RawVerdict>): Promise<RawVerdict> {
  try {
    return await check();
  } catch (error) {
    const message = String((error as Error | undefined)?.message ?? error).split("\n")[0] ?? "";
    return { outcome: "tool-error", code: "internal", message: message.slice(0, 200) };
  }
}

port.on("message", async (message: ToWorker) => {
  if (message.type !== "check") return;
  if (slowMs > 0) await new Promise((done) => setTimeout(done, slowMs));
  post({ type: "result", id: message.id, renderer: "pele", verdict: await safely(() => checkWithPele(message.text, CHECK_MEASURER)) });
  post({ type: "result", id: message.id, renderer: "mermaid", verdict: await safely(() => checkWithMermaid(message.text)) });
});

post({ type: "ready", versions: { ...RENDERER_VERSIONS } });
