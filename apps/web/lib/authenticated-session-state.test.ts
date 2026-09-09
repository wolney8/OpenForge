import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTHENTICATED_SESSION_ENDED_EVENT,
  BLACKJACK_SESSION_STORAGE_KEY,
  clearAuthenticatedSessionState,
} from "./authenticated-session-state";

describe("authenticated-session-owned browser state", () => {
  beforeEach(() => sessionStorage.clear());

  it("clears Blackjack state and signals consumers only on authoritative termination", () => {
    const listener = vi.fn();
    window.addEventListener(AUTHENTICATED_SESSION_ENDED_EVENT, listener);
    sessionStorage.setItem(BLACKJACK_SESSION_STORAGE_KEY, "synthetic-session-state");

    clearAuthenticatedSessionState();

    expect(sessionStorage.getItem(BLACKJACK_SESSION_STORAGE_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTHENTICATED_SESSION_ENDED_EVENT, listener);
  });
});
