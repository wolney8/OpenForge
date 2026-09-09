export const AUTHENTICATED_SESSION_ENDED_EVENT = "pd-authenticated-session-ended";
export const BLACKJACK_SESSION_STORAGE_KEY = "calculator.blackjack.session.v1";

const SESSION_OWNED_STORAGE_KEYS = [BLACKJACK_SESSION_STORAGE_KEY] as const;

export function clearAuthenticatedSessionState(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of SESSION_OWNED_STORAGE_KEYS) window.sessionStorage.removeItem(key);
  } catch {
    // Restricted storage must not prevent an authoritative logout or expiry redirect.
  }
  window.dispatchEvent(new CustomEvent(AUTHENTICATED_SESSION_ENDED_EVENT));
}
