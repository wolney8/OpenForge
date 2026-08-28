export const SESSION_SECURITY_PREFERENCE_EVENT = "pd-session-security-preference";
export const SESSION_ACTIVITY_STORAGE_KEY = "pd-session-activity";
export const SESSION_LOGOUT_STORAGE_KEY = "pd-session-logout";

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
