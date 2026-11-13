// Goal 7's measure: any attempted outbound connection fails the run
// (docs/designs/diagramist.md, Goals and Verification Plan).
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { afterAll } from "vitest";

const attempts: string[] = [];

function blocked(name: string) {
  return (...args: unknown[]): never => {
    const target = args.map((a) => (typeof a === "string" || typeof a === "number" ? String(a) : "")).filter(Boolean);
    attempts.push(`${name}(${target.join(", ")})`);
    throw new Error(`network-guard: ${name} is blocked in tests`);
  };
}

const patches: Array<[Record<string, unknown>, string]> = [
  [net as unknown as Record<string, unknown>, "connect"],
  [net as unknown as Record<string, unknown>, "createConnection"],
  [tls as unknown as Record<string, unknown>, "connect"],
  [dns as unknown as Record<string, unknown>, "lookup"],
  [http as unknown as Record<string, unknown>, "request"],
  [http as unknown as Record<string, unknown>, "get"],
  [https as unknown as Record<string, unknown>, "request"],
  [https as unknown as Record<string, unknown>, "get"],
];
for (const [module, name] of patches) module[name] = blocked(name);
(globalThis as Record<string, unknown>).fetch = blocked("fetch");

afterAll(() => {
  if (attempts.length > 0) {
    throw new Error(`network-guard: ${attempts.length} attempted connection(s): ${attempts.join("; ")}`);
  }
});
