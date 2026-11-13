// Setup file for the "mermaid" Vitest project: the same browser stand-in the check worker installs.
import { installDomStandin } from "../../src/platform/node/dom-standin.js";

installDomStandin();
