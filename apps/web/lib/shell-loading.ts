export const SHELL_LOADING_START_EVENT = "plum-duff:shell-loading-start";
export const SHELL_LOADING_END_EVENT = "plum-duff:shell-loading-end";
export const SHELL_ROUTE_TRANSITION_START_EVENT = "plum-duff:route-transition-start";
export const SHELL_ROUTE_TRANSITION_END_EVENT = "plum-duff:route-transition-end";

export function beginShellLoading() {
  window.dispatchEvent(new Event(SHELL_LOADING_START_EVENT));
}

export function endShellLoading() {
  window.dispatchEvent(new Event(SHELL_LOADING_END_EVENT));
}

export function beginRouteTransition() {
  window.dispatchEvent(new Event(SHELL_ROUTE_TRANSITION_START_EVENT));
}

export function endRouteTransition() {
  window.dispatchEvent(new Event(SHELL_ROUTE_TRANSITION_END_EVENT));
}
