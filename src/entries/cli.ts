// The `diagramist` command. The build adds the shebang line.
import { runCli } from "../features/checker/index.js";

// A reader that stops early (`diagramist check … | head`) is not an error.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code !== "EPIPE") throw error;
  process.exit(process.exitCode ?? 0);
});

process.exitCode = await runCli(process.argv);
