export const COOKIE_NOTICE_ACKNOWLEDGED_KEY = "pd-required-storage-notice";
export const COOKIE_NOTICE_OPEN_EVENT = "pd-cookie-notice-open";

export function hasAcknowledgedRequiredStorage(): boolean {
  return typeof window !== "undefined" &&
    window.localStorage.getItem(COOKIE_NOTICE_ACKNOWLEDGED_KEY) === "acknowledged";
}

export function acknowledgeRequiredStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_NOTICE_ACKNOWLEDGED_KEY, "acknowledged");
}
