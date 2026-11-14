// Design item 117: "Diagramist: Export Diagram…" run with arguments writes the file.
import * as assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { activate, fileUri, workspace } from "../helpers.js";

suite("Export", () => {
  suiteSetup(async () => {
    await activate();
  });

  test("writes an SVG with literal colours", async () => {
    const target = join(workspace, "exported.svg");
    const written = await vscode.commands.executeCommand<vscode.Uri>("diagramist.exportDiagram", { uri: fileUri("README.md").toString(), blockIndex: 1, renderer: "pele", format: "svg", theme: "light", target });
    assert.equal(written?.fsPath, vscode.Uri.file(target).fsPath);
    const svg = readFileSync(target, "utf8");
    assert.match(svg, /^<\?xml[^>]*>\n<svg/);
    assert.ok(!svg.includes("var("), "no CSS variables");
  });

  test("writes a PNG at the chosen scale", async () => {
    const target = join(workspace, "exported.png");
    await vscode.commands.executeCommand("diagramist.exportDiagram", { uri: fileUri("flow.mmd").toString(), blockIndex: 1, renderer: "mermaid", format: "png", theme: "dark", scale: 2, target });
    const png = readFileSync(target);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0);
  });

  test("writes nothing when Pele can't draw the diagram", async () => {
    const source = join(workspace, "gantt.mmd");
    await vscode.workspace.fs.writeFile(vscode.Uri.file(source), Buffer.from("gantt\n  dateFormat YYYY-MM-DD\n  section S\n  Task :a1, 2026-13-45, 3d\n"));
    const target = join(workspace, "gantt.pele.svg");
    const written = await vscode.commands.executeCommand("diagramist.exportDiagram", { uri: vscode.Uri.file(source).toString(), blockIndex: 1, renderer: "pele", format: "svg", theme: "light", target });
    assert.equal(written, undefined);
    assert.ok(!existsSync(target));
  });
});
