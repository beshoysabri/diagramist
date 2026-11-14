// The MCP `check` tool's description (Technical Plan section 5). At most 80 words; a test counts them.
export const TOOL_DESCRIPTION =
  "Check Mermaid diagrams in a file with Mermaid.js and Pele. Call it after writing or editing any Mermaid diagram, " +
  "and fix errors until it passes. Results give the first error per renderer with its file line. Don't rewrite a " +
  "diagram for 'unsupported' or 'too-large' errors, or for warnings. After three failures on the same error, stop " +
  "and ask the user.";

export const PATH_DESCRIPTION = "A .md, .markdown, .mmd or .mermaid file, absolute or relative to the server's working directory.";
export const TEXT_DESCRIPTION = "One Mermaid diagram as text, instead of a file. Positions count from its first line.";
