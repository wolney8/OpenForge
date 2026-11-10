import { apiBaseUrl } from "@/lib/api";

type Profile = { profile_id: string; display_name: string; status?: string };
type SourceOpportunity = { opportunity_key: string; label: string; bookmaker: string; already_created: boolean; risk_warnings: string[] };
export type OwnedOpportunity = SourceOpportunity & { profileId: string; profileName: string };

/** Bounded authorised reads; a failed Profile is reported rather than counted as empty. */
export async function loadAuthorizedProfileOpportunities(scope: string | null): Promise<{ rows: OwnedOpportunity[]; failed: string[] }> {
  const response = await fetch(`${apiBaseUrl}/profiles`, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("Authorised Profiles could not be loaded.");
  const profiles = (await response.json() as Profile[]).filter(profile => (profile.status ?? "active").toLowerCase() !== "archived");
  if (scope && !profiles.some(profile => profile.profile_id === scope)) throw new Error("This Profile is unavailable or access has changed.");
  const selected = scope ? profiles.filter(profile => profile.profile_id === scope) : profiles;
  const rows: OwnedOpportunity[] = [];
  const failed: string[] = [];
  for (let index = 0; index < selected.length; index += 4) {
    const batch = selected.slice(index, index + 4);
    const results = await Promise.allSettled(batch.map(async profile => {
      const source = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${encodeURIComponent(profile.profile_id)}`, { cache: "no-store", credentials: "include" });
      if (!source.ok) throw new Error(profile.display_name);
      const values = await source.json() as SourceOpportunity[];
      if (!Array.isArray(values)) throw new Error(profile.display_name);
      return values.map(value => ({ ...value, profileId: profile.profile_id, profileName: profile.display_name }));
    }));
    results.forEach((result, offset) => result.status === "fulfilled" ? rows.push(...result.value) : failed.push(batch[offset].display_name));
  }
  return { rows, failed };
}
