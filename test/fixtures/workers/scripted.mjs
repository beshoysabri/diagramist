// A stand-in for the check worker. The diagram text tells it what to do:
//   "crash"       throws while checking;
//   "half"        answers for Pele only, then hangs;
//   "sleep:<ms>"  waits, then passes;
//   anything else passes at once.
import { parentPort } from "node:worker_threads";

const pass = { outcome: "pass", type: "fake" };
parentPort.on("message", async ({ id, text }) => {
  if (text === "crash") throw new Error("crashed while checking");
  if (text.startsWith("sleep:")) await new Promise((done) => setTimeout(done, Number(text.slice(6))));
  parentPort.postMessage({ type: "result", id, renderer: "pele", verdict: { ...pass, type: text } });
  if (text === "half") return;
  parentPort.postMessage({ type: "result", id, renderer: "mermaid", verdict: { ...pass, type: text } });
});
parentPort.postMessage({ type: "ready", versions: { mermaid: "fake", pele: "fake" } });
