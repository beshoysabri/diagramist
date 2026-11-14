// Checks files and text for the CLI, the MCP server and the extension's diagnostics (Technical Plan
// section 3): reads and validates the file, finds its diagrams, resolves each one's targets, checks
// them in the check worker one after another, and builds the result.
import { blockFromText, findBlocks } from "../../core/blocks/find-blocks.js";
import type { Block } from "../../core/blocks/find-blocks.js";
import { buildBlockResult, buildCheckResult, fileProblemResult } from "../../core/result/build-result.js";
import type { CheckMeta } from "../../core/result/build-result.js";
import type { BlockResult, CheckResult, Notice } from "../../core/result/schema.js";
import { resolveTargets } from "../../core/targets/targets.js";
import { readDiagramFile } from "./read-file.js";
import { WorkerPool } from "./worker-pool.js";
import type { PoolOptions } from "./worker-pool.js";

export interface CoordinatorOptions extends PoolOptions {
  meta: CheckMeta;
  /** Relative paths are resolved against it; defaults to the process's working directory. */
  cwd?: string;
}

export interface CheckOptions {
  /** In `latest-wins` mode, a newer check with the same key replaces this one. */
  key?: string;
}

export class Coordinator {
  private readonly pool: WorkerPool;
  private readonly meta: CheckMeta;
  private readonly cwd: string | undefined;
  private readonly generations = new Map<string, number>();

  constructor(options: CoordinatorOptions) {
    const { meta, cwd, ...pool } = options;
    this.pool = new WorkerPool(pool);
    this.meta = meta;
    this.cwd = cwd;
  }

  /** Checks every diagram in a file. Resolves to null if a newer check with the same key replaced it. */
  async checkFile(path: string, options: CheckOptions = {}): Promise<CheckResult | null> {
    const generation = this.nextGeneration(options.key);
    const read = await readDiagramFile(path, this.cwd);
    if (!read.ok) return fileProblemResult(this.meta, read.path, read.status, read.message);
    const blocks = await this.checkBlocks(findBlocks(read.text, read.kind), [], options.key, generation);
    return blocks && buildCheckResult(this.meta, read.path, blocks);
  }

  /** Checks one diagram given as text. Positions count from its first line. */
  async checkText(text: string, options: CheckOptions = {}): Promise<CheckResult | null> {
    const generation = this.nextGeneration(options.key);
    const { block, notices } = blockFromText(text);
    const blocks = await this.checkBlocks([block], notices, options.key, generation);
    return blocks && buildCheckResult(this.meta, null, blocks);
  }

  close(): Promise<void> {
    return this.pool.close();
  }

  private async checkBlocks(blocks: Block[], notices: Notice[], key: string | undefined, generation: number): Promise<BlockResult[] | null> {
    const results: BlockResult[] = [];
    for (const block of blocks) {
      if (key !== undefined && this.generations.get(key) !== generation) return null;
      const outcome = await this.pool.check(block.text, key === undefined ? undefined : { key, generation });
      if (outcome.status === "superseded") return null;
      results.push(buildBlockResult(block, resolveTargets(block), outcome.verdicts, notices));
    }
    return results;
  }

  private nextGeneration(key: string | undefined): number {
    if (key === undefined) return 0;
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);
    return generation;
  }
}
