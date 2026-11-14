// `diagramist --self-test` (Technical Plan section 5): checks every sample with both renderers.
import { RENDERER_NAMES, RENDERERS } from "../../core/policy/policy.js";
import { SAMPLES } from "../../core/samples/samples.js";
import type { Coordinator } from "../../platform/node/coordinator.js";
import { RENDERER_VERSIONS } from "../../platform/node/versions.js";

/** Returns 0 when every sample passes both renderers with its expected type, and 2 otherwise. */
export async function runSelfTest(coordinator: Coordinator, write: (text: string) => void): Promise<0 | 2> {
  const failures: string[] = [];
  for (const sample of SAMPLES) {
    const result = await coordinator.checkText(sample.text);
    const block = result?.blocks[0];
    if (!block) {
      failures.push(`${sample.keyword}: no result`);
      continue;
    }
    for (const renderer of RENDERERS) {
      const problem = block.results[renderer].errors[0];
      if (problem) failures.push(`${sample.keyword}: ${RENDERER_NAMES[renderer]} ${problem.code}: ${problem.message}`);
    }
    if (block.results.mermaid.outcome === "pass" && block.type !== sample.mermaidType) {
      failures.push(`${sample.keyword}: Mermaid.js reports type ${block.type}, expected ${sample.mermaidType}`);
    }
  }
  const versions = `Mermaid.js ${RENDERER_VERSIONS.mermaid} and Pele ${RENDERER_VERSIONS.pele}`;
  if (failures.length === 0) {
    write(`Self-test passed: ${SAMPLES.length} sample diagrams, one per type, checked with ${versions}.\n`);
    return 0;
  }
  write(`Self-test failed: ${failures.length} problem(s) in ${SAMPLES.length} sample diagrams checked with ${versions}.\n`);
  for (const failure of failures) write(`  ${failure}\n`);
  return 2;
}
