import { findProfile, listModuleRows, listProfiles } from "./local-db";
import { apiBaseUrl } from "./api";
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

export async function getProfiles(): Promise<ProfileSummary[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/profiles`, { cache: "no-store" });
    if (!response.ok) throw new Error("Profiles API unavailable");
    return ((await response.json()) as ApiProfile[]).map(mapApiProfile);
  } catch {
    return listProfiles();
  }
}

export async function getProfile(profileId: string): Promise<ProfileSummary | undefined> {
  try {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}`, { cache: "no-store" });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error("Profile API unavailable");
    return mapApiProfile((await response.json()) as ApiProfile);
  } catch {
    return findProfile(profileId);
  }
}

export async function getProfileOnboarding(
  profileId: string
): Promise<ProfileOnboardingSettings | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/onboarding`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as ProfileOnboardingSettings | null;
  } catch {
    return null;
  }
}

export async function getModuleRows(
  profileId: string,
  moduleKey: TrackerModuleKey
): Promise<TrackerRow[]> {
  return listModuleRows(profileId, moduleKey);
}
