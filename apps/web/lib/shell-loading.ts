export const SHELL_LOADING_START_EVENT = "plum-duff:shell-loading-start";
export const SHELL_LOADING_END_EVENT = "plum-duff:shell-loading-end";

export function beginShellLoading() {
  window.dispatchEvent(new Event(SHELL_LOADING_START_EVENT));
}

export function endShellLoading() {
  window.dispatchEvent(new Event(SHELL_LOADING_END_EVENT));
}
