export const SESSION_SECURITY_PREFERENCE_EVENT = "pd-session-security-preference";
export const SESSION_ACTIVITY_STORAGE_KEY = "pd-session-activity";
export const SESSION_LOGOUT_STORAGE_KEY = "pd-session-logout";
export const MEANINGFUL_SESSION_ACTIVITY_EVENTS = [
  "keydown",
  "pointerdown",
  "touchstart",
] as const;

let sessionExpiryRedirectStarted = false;

export function redirectExpiredSession(response: Response): boolean {
  if (response.status !== 401 || typeof window === "undefined") return false;
  if (!sessionExpiryRedirectStarted) {
    sessionExpiryRedirectStarted = true;
    window.localStorage.setItem(SESSION_LOGOUT_STORAGE_KEY, String(Date.now()));
    window.location.replace("/login?error=session_expired");
  }
  return true;
}

export const SESSION_TIMEOUT_OPTIONS = [15, 30, 60, 120, 240] as const;
export type SessionTimeoutMinutes = (typeof SESSION_TIMEOUT_OPTIONS)[number];

export type SessionSecurityPreference = {
  autoLogoutEnabled: boolean;
  timeoutMinutes: SessionTimeoutMinutes;
};

export const DEFAULT_SESSION_SECURITY_PREFERENCE: SessionSecurityPreference = {
  autoLogoutEnabled: false,
  timeoutMinutes: 30,
};

export function sessionSecurityPreferenceKey(email: string): string {
  return `pd-session-security:${email.trim().toLocaleLowerCase()}`;
}

export function normalizeSessionSecurityPreference(
  value: unknown
): SessionSecurityPreference {
  if (!value || typeof value !== "object") return DEFAULT_SESSION_SECURITY_PREFERENCE;
  const record = value as Record<string, unknown>;
  const timeoutMinutes = SESSION_TIMEOUT_OPTIONS.includes(
    Number(record.timeoutMinutes) as SessionTimeoutMinutes
  )
    ? (Number(record.timeoutMinutes) as SessionTimeoutMinutes)
    : DEFAULT_SESSION_SECURITY_PREFERENCE.timeoutMinutes;
  return {
    autoLogoutEnabled: record.autoLogoutEnabled === true,
    timeoutMinutes,
  };
}

export function parseSessionSecurityPreference(
  value: string | null
): SessionSecurityPreference {
  if (!value) return DEFAULT_SESSION_SECURITY_PREFERENCE;
  try {
    return normalizeSessionSecurityPreference(JSON.parse(value));
  } catch {
    return DEFAULT_SESSION_SECURITY_PREFERENCE;
  }
}

export function inactivityRemainingMs({
  lastActivityAt,
  now,
  timeoutMinutes,
}: {
  lastActivityAt: number;
  now: number;
  timeoutMinutes: SessionTimeoutMinutes;
}): number {
  return lastActivityAt + timeoutMinutes * 60_000 - now;
}

export function loadSessionSecurityPreference(email: string): SessionSecurityPreference {
  if (typeof window === "undefined") return DEFAULT_SESSION_SECURITY_PREFERENCE;
  return parseSessionSecurityPreference(
    window.localStorage.getItem(sessionSecurityPreferenceKey(email))
  );
}

export function saveSessionSecurityPreference(
  email: string,
  preference: SessionSecurityPreference
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    sessionSecurityPreferenceKey(email),
    JSON.stringify(normalizeSessionSecurityPreference(preference))
  );
  window.dispatchEvent(
    new CustomEvent(SESSION_SECURITY_PREFERENCE_EVENT, { detail: { email } })
  );
}

export async function loadPersistedSessionSecurityPreference(): Promise<SessionSecurityPreference | null> {
  try {
    const response = await fetch("/api/auth/security-preference", {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      auto_logout_enabled?: unknown;
      configured?: unknown;
      timeout_minutes?: unknown;
    };
    if (payload.configured === false) return null;
    return normalizeSessionSecurityPreference({
      autoLogoutEnabled: payload.auto_logout_enabled,
      timeoutMinutes: payload.timeout_minutes,
    });
  } catch {
    return null;
  }
}

export async function persistSessionSecurityPreference(
  preference: SessionSecurityPreference
): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/security-preference", {
      body: JSON.stringify({
        auto_logout_enabled: preference.autoLogoutEnabled,
        timeout_minutes: preference.timeoutMinutes,
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    return response.ok;
  } catch {
    return false;
  }
}
