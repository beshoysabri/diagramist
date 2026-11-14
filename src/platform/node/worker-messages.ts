// Messages between the coordinator and the check worker (Technical Plan section 3). Types only.
import type { RawVerdict } from "../../core/renderers/types.js";
import type { RendererId } from "../../core/result/schema.js";
import type { LogLevel } from "./logger.js";

export interface CheckRequest {
  type: "check";
  id: number;
  text: string;
}

export type ToWorker = CheckRequest;

export interface ReadyMessage {
  type: "ready";
  versions: Record<RendererId, string>;
}

/** One per renderer and block, Pele first, so a time-out can tell which renderer didn't finish. */
export interface ResultMessage {
  type: "result";
  id: number;
  renderer: RendererId;
  verdict: RawVerdict;
}

export interface LogMessage {
  type: "log";
  level: LogLevel;
  message: string;
}

export type FromWorker = ReadyMessage | ResultMessage | LogMessage;
