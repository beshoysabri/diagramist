// Design item 108: stands in for VS Code's acquireVsCodeApi() in the webview tests, recording every
// message the webview posts and the state it saves.
interface Recorded {
  messages: unknown[];
  state: unknown;
}

const recorded: Recorded = { messages: [], state: undefined };
(window as unknown as { __diagramist: Recorded }).__diagramist = recorded;
(window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
  postMessage: (message: unknown) => void recorded.messages.push(message),
  getState: () => recorded.state,
  setState: (state: unknown) => void (recorded.state = state),
});
