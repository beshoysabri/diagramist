// Public API of the core. The core has no dependency on VS Code, Node or a browser page.
export { blockFromText, fileKind, findBlocks, normalizeText } from "./blocks/find-blocks.js";
export type { Block, FileKind } from "./blocks/find-blocks.js";
export { findKeyword, firstKeyword, isBetaKeyword, KEYWORDS, suggestKeyword } from "./compat/keywords.js";
export type { DiagramKeyword } from "./compat/keywords.js";
export { hintFor, lineLateHint } from "./hints/hints.js";
export { CHECK_DEPTH, DEFAULT_TARGETS, FIXED_NOW, LIMITS, MERMAID_CHECK_CONFIG, PELE_CHECK_OPTIONS, RENDERER_NAMES, RENDERERS } from "./policy/policy.js";
export { toFilePosition } from "./positions/map-position.js";
export type { RawPosition, RawVerdict } from "./renderers/types.js";
export { buildBlockResult, buildCheckResult, fileProblemResult } from "./result/build-result.js";
export type { CheckMeta } from "./result/build-result.js";
export { formatText } from "./result/format-text.js";
export type { FormatOptions } from "./result/format-text.js";
export { checkResultJsonSchema } from "./result/schema.js";
export type * from "./result/schema.js";
export { SAMPLES } from "./samples/samples.js";
export type { Sample } from "./samples/samples.js";
export { parseTargets, resolveTargets } from "./targets/targets.js";
export type { TargetsResolution } from "./targets/targets.js";
