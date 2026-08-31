import { findProfile, listModuleRows, listProfiles } from "./local-db";
import { AUTH_SESSION_COOKIE } from "./auth-session";
import { getServerApiBaseUrl, serverAuthenticationRequired } from "./api";
import type { ProfileSummary, TrackerModuleKey, TrackerRow } from "./tracker-types";

type ApiProfile = {
  profile_id: string;
  display_name: string;
  profile_code: string;
  status: ProfileSummary["status"];
  tracking_start_date: string;
  management_fee_percent: string;
  investment_fee_percent: string;
  current_cash_snapshot: string;
};

export type ProfileOnboardingSettings = {
  profile_id: string;
  enabled_modules: Array<TrackerModuleKey | "each-way-extra-places">;
  onboarding_status: string;
};

function mapApiProfile(profile: ApiProfile): ProfileSummary {
  return {
    profileId: profile.profile_id,
    displayName: profile.display_name,
    profileCode: profile.profile_code,
    status: profile.status,
    trackingStartDate: profile.tracking_start_date,
    managementFeePercent: profile.management_fee_percent,
    investmentFeePercent: profile.investment_fee_percent,
    currentCashSnapshot: profile.current_cash_snapshot,
  };
}

async function authenticatedApiFetch(path: string): Promise<Response> {
  let sessionToken = "";
  try {
    const { cookies } = await import("next/headers");
    sessionToken = (await cookies()).get(AUTH_SESSION_COOKIE)?.value ?? "";
  } catch {
    // Unit tests and local static tooling can run outside a Next request context.
  }
  const headers = new Headers();
  if (sessionToken) headers.set("Cookie", `${AUTH_SESSION_COOKIE}=${sessionToken}`);
  return fetch(`${getServerApiBaseUrl()}${path}`, {
    cache: "no-store",
    headers,
  });
}

function allowLocalFallback(): boolean {
  return !serverAuthenticationRequired();
}

export async function getProfiles(): Promise<ProfileSummary[]> {
  try {
    const response = await authenticatedApiFetch("/profiles");
    if (!response.ok) throw new Error("Profiles API unavailable");
    return ((await response.json()) as ApiProfile[]).map(mapApiProfile);
  } catch (error) {
    if (!allowLocalFallback()) throw error;
    return listProfiles();
  }
}

export async function getProfile(profileId: string): Promise<ProfileSummary | undefined> {
  try {
    const response = await authenticatedApiFetch(`/profiles/${profileId}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error("Profile API unavailable");
    return mapApiProfile((await response.json()) as ApiProfile);
  } catch (error) {
    if (!allowLocalFallback()) throw error;
    return findProfile(profileId);
  }
}

export async function getProfileOnboarding(
  profileId: string
): Promise<ProfileOnboardingSettings | null> {
  try {
    const response = await authenticatedApiFetch(`/profiles/${profileId}/onboarding`);
    if (!response.ok) return null;
    return (await response.json()) as ProfileOnboardingSettings | null;
  } catch (error) {
    if (!allowLocalFallback()) throw error;
    return null;
  }
}

export async function getModuleRows(
  profileId: string,
  moduleKey: TrackerModuleKey
): Promise<TrackerRow[]> {
  // Hosted workflow shells load their records from the authenticated API.
  // The SQLite seed is a local-development fallback and cannot run in Vercel's
  // read-only server bundle.
  if (!allowLocalFallback()) return [];
  return listModuleRows(profileId, moduleKey);
}
