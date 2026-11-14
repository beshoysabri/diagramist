// Where the tests find the bundles: out/test-dist for the "node" project (built by its global setup),
// and packages/diagramist/dist for the "checker" project (built by `npm run test:checker`).
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const testWorkerUrl = pathToFileURL(join(process.cwd(), "out/test-dist/check-worker.mjs"));
export const fakeWorkerUrl = (name: string) => pathToFileURL(join(process.cwd(), "test/fixtures/workers", `${name}.mjs`));
export const builtCli = join(process.cwd(), "packages/diagramist/dist/cli.mjs");
