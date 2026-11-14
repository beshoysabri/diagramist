// The `diagramist` command. The build adds the shebang line.
import { runCli } from "../features/checker/index.js";

// A reader that stops early (`diagramist check … | head`) ends the run quietly. If checking wasn't
// finished, exit 2 (a tool problem), so that a pipeline with `set -o pipefail` doesn't count it as clean.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code !== "EPIPE") throw error;
  process.exit(typeof process.exitCode === "number" ? process.exitCode : 2);
});

process.exitCode = await runCli(process.argv);
