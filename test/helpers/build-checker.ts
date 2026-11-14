// Global setup for the "node" project: bundles the CLI and the check worker into out/test-dist, so
// the tests run the same worker code that ships.
import { join } from "node:path";
import { bundleChecker } from "../../scripts/build.mjs";

export default async function setup(): Promise<void> {
  await bundleChecker({ outDir: join(process.cwd(), "out/test-dist"), minify: false });
}
