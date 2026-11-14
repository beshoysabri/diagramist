// Design item 106: the webview tests run in Chromium, the engine behind VS Code's webviews. On bshome
// set DIAGRAMIST_CHROMIUM=/snap/bin/chromium; in CI, `npx playwright install chromium` provides it.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    browserName: "chromium",
    launchOptions: { executablePath: process.env.DIAGRAMIST_CHROMIUM || undefined, args: ["--no-sandbox"] },
    trace: "off",
  },
});
