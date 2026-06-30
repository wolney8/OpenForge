import { findProfile, listModuleRows, listProfiles } from "./local-db";
import type { ProfileSummary, TrackerModuleKey, TrackerRow } from "./tracker-types";

export async function getProfiles(): Promise<ProfileSummary[]> {
  return listProfiles();
}

export async function getProfile(profileId: string): Promise<ProfileSummary | undefined> {
  return findProfile(profileId);
}

export async function getModuleRows(
  profileId: string,
  moduleKey: TrackerModuleKey
): Promise<TrackerRow[]> {
  return listModuleRows(profileId, moduleKey);
}
