// Runs the check worker (Technical Plan section 3). The worker starts on the first request and
// gets a start-up budget. Each block gets a time limit, counted from when a ready worker receives
// it. After a time-out or a crash the worker is stopped, and the next request starts a fresh one.
import { Worker } from "node:worker_threads";
import { LIMITS, RENDERERS } from "../../core/policy/policy.js";
import type { RawVerdict } from "../../core/renderers/types.js";
import type { RendererId } from "../../core/result/schema.js";
import type { Logger } from "./logger.js";
import type { FromWorker, ToWorker } from "./worker-messages.js";

/** `fifo` for the CLI and MCP server: never drops a request. `latest-wins` for diagnostics. */
export type QueueMode = "fifo" | "latest-wins";

export interface PoolOptions {
  workerUrl: URL;
  mode?: QueueMode;
  startupMs?: number;
  blockMs?: number;
  /** Queue size in `latest-wins` mode. */
  slots?: number;
  /** The worker's environment; tests use it to turn on the slow hook. */
  env?: NodeJS.ProcessEnv;
  logger?: Logger;
}

export type Verdicts = Record<RendererId, RawVerdict>;
export type PoolOutcome = { status: "done"; verdicts: Verdicts } | { status: "superseded" };

export interface CheckKey {
  /** Requests with the same key replace each other in `latest-wins` mode. */
  key: string;
  /** Only an older generation is replaced. */
  generation: number;
}

interface Job {
  text: string;
  key: CheckKey | undefined;
  settle: (outcome: PoolOutcome) => void;
}

interface Running {
  worker: Worker;
  ready: boolean;
  stopped: boolean;
  /** Called when the worker exits or fails; set while starting or checking. */
  onFailure: ((why: string) => void) | null;
  onResult: ((renderer: RendererId, verdict: RawVerdict) => void) | null;
  currentId: number;
}

export class WorkerPool {
  private readonly options: Required<Omit<PoolOptions, "env" | "logger">> & Pick<PoolOptions, "env" | "logger">;
  private readonly queue: Job[] = [];
  private running: Running | null = null;
  private busy = false;
  private closed = false;
  private nextId = 1;

  constructor(options: PoolOptions) {
    this.options = {
      mode: "fifo",
      startupMs: LIMITS.workerStartupMs,
      blockMs: LIMITS.blockMs,
      slots: LIMITS.diagnosticsQueue,
      ...options,
    };
  }

  /** Checks one diagram with both renderers. */
  check(text: string, key?: CheckKey): Promise<PoolOutcome> {
    if (this.closed) return Promise.resolve({ status: "done", verdicts: failAll("crash", "The checker is shutting down.") });
    return new Promise((settle) => {
      if (this.options.mode === "latest-wins") this.makeRoom(key);
      this.queue.push({ text, key, settle });
      void this.drain();
    });
  }

  /** Stops the worker. Requests that haven't started end as superseded. */
  async close(): Promise<void> {
    this.closed = true;
    for (const job of this.queue.splice(0)) job.settle({ status: "superseded" });
    await this.stop();
  }

  private makeRoom(key: CheckKey | undefined): void {
    if (key) {
      for (let i = this.queue.length - 1; i >= 0; i--) {
        const queued = this.queue[i]!;
        if (queued.key?.key === key.key && queued.key.generation < key.generation) {
          this.queue.splice(i, 1);
          queued.settle({ status: "superseded" });
        }
      }
    }
    while (this.queue.length >= this.options.slots) this.queue.shift()!.settle({ status: "superseded" });
  }

  private async drain(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      for (let job = this.queue.shift(); job; job = this.queue.shift()) job.settle(await this.run(job.text));
    } finally {
      this.busy = false;
    }
  }

  private async run(text: string): Promise<PoolOutcome> {
    const running = await this.start();
    if (typeof running === "string") return { status: "done", verdicts: failAll(running === "start-timeout" ? "start-timeout" : "crash", startMessage(running, this.options.startupMs)) };

    const id = this.nextId++;
    const verdicts: Partial<Verdicts> = {};
    return new Promise<PoolOutcome>((settle) => {
      const finish = (code: "timeout" | "crash" | null, why: string) => {
        clearTimeout(timer);
        running.onResult = null;
        running.onFailure = null;
        for (const renderer of RENDERERS) verdicts[renderer] ??= { outcome: "tool-error", code: code ?? "crash", message: why };
        settle({ status: "done", verdicts: verdicts as Verdicts });
      };
      const timer = setTimeout(() => {
        this.options.logger?.log("warn", `A diagram check took longer than ${this.options.blockMs} ms; restarting the worker.`);
        finish("timeout", `The check took longer than ${this.options.blockMs.toLocaleString("en-US")} ms.`);
        void this.stop();
      }, this.options.blockMs);
      running.currentId = id;
      running.onResult = (renderer, verdict) => {
        verdicts[renderer] = verdict;
        if (RENDERERS.every((r) => verdicts[r])) finish(null, "");
      };
      running.onFailure = (why) => finish("crash", `The checker's worker stopped: ${why}`);
      running.worker.postMessage({ type: "check", id, text } satisfies ToWorker);
    });
  }

  /** Returns the ready worker, or why it couldn't start: "start-timeout" or the failure. */
  private start(): Promise<Running | string> {
    if (this.running?.ready) return Promise.resolve(this.running);
    const { workerUrl, env, logger, startupMs } = this.options;
    const worker = new Worker(workerUrl, { ...(env ? { env } : {}), stdout: true, stderr: true });
    const running: Running = { worker, ready: false, stopped: false, onFailure: null, onResult: null, currentId: 0 };
    this.running = running;
    // Anything a renderer prints may carry diagram text, which is untrusted: trace level only.
    const forward = (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split("\n")) if (line.trim()) logger?.log("trace", `worker: ${line}`);
    };
    worker.stdout.on("data", forward);
    worker.stderr.on("data", forward);
    worker.on("message", (message: FromWorker) => {
      if (message.type === "result" && message.id === running.currentId) running.onResult?.(message.renderer, message.verdict);
      else if (message.type === "log") logger?.log(message.level, `worker: ${message.message}`);
      else if (message.type === "ready") {
        running.ready = true;
        logger?.log("debug", `check worker ready (Mermaid.js ${message.versions.mermaid}, Pele ${message.versions.pele})`);
      }
    });
    const fail = (why: string) => {
      if (running.stopped) return;
      running.stopped = true;
      if (this.running === running) this.running = null;
      logger?.log("warn", `The check worker stopped: ${why}`);
      running.onFailure?.(why);
    };
    worker.on("error", (error) => fail(String(error?.message ?? error)));
    worker.on("exit", (code) => fail(`exit code ${code}`));

    return new Promise((settle) => {
      const timer = setTimeout(() => {
        running.onFailure = null;
        void this.stop();
        settle("start-timeout");
      }, startupMs);
      running.onFailure = (why) => {
        clearTimeout(timer);
        settle(why);
      };
      worker.on("message", (message: FromWorker) => {
        if (message.type !== "ready" || running.stopped) return;
        clearTimeout(timer);
        running.onFailure = null;
        settle(running);
      });
    });
  }

  /** Stops the worker. A start or check still waiting on it ends with `why`. */
  private async stop(why = "the checker is shutting down"): Promise<void> {
    const running = this.running;
    if (!running) return;
    this.running = null;
    running.stopped = true;
    running.onFailure?.(why);
    await running.worker.terminate();
  }
}

function failAll(code: string, message: string): Verdicts {
  const verdicts = {} as Verdicts;
  for (const renderer of RENDERERS) verdicts[renderer] = { outcome: "tool-error", code, message };
  return verdicts;
}

function startMessage(why: string, startupMs: number): string {
  return why === "start-timeout"
    ? `The checker's worker didn't start within ${startupMs.toLocaleString("en-US")} ms.`
    : `The checker's worker couldn't start: ${why}`;
}
