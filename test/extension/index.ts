// The Mocha runner VS Code loads for the extension tests (design item 89): TDD interface, 30 s timeout.
import { join } from "node:path";
import Mocha from "mocha";

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", timeout: 30_000, color: true });
  mocha.addFile(join(__dirname, "suites.cjs"));
  await mocha.loadFilesAsync();
  await new Promise<void>((resolve, reject) => mocha.run((failures) => (failures ? reject(new Error(`${failures} extension test(s) failed`)) : resolve())));
}
