import { apiBaseUrl } from "@/lib/api";

type Profile = { profile_id: string; display_name: string; status?: string };
type SourceOpportunity = { opportunity_key: string; period_key?: string; label: string; bookmaker: string; already_created: boolean; risk_warnings: string[]; source?: "quick_action" | "signup_account"; ledger_type?: "Sportsbook" | "Free Bets"; recurrence?: "One Off" | "Weekly"; kind?: "Reload" | "Signup" | "Free Bet"; target_record_id?: string };
export type OwnedOpportunity = SourceOpportunity & { profileId: string; profileName: string };

export function opportunityReviewTitle(label: string): string {
  return /^review\b/i.test(label.trim()) ? label.trim() : `Review ${label.trim()}`;
}

export function opportunityReviewGuidance(item: Pick<OwnedOpportunity, "source" | "already_created">): string {
  if (item.already_created) return "A source record is already linked. Check its current state in this Profile's Accounts workflow.";
  return item.source === "signup_account"
    ? "Check the recorded Account signup status and current provider terms before deciding what to do. Availability is unverified."
    : "Review this Profile's saved opportunity source and current provider terms before acting. Availability is unverified.";
}

/** Exact occurrence identity reviewed by the annotation source resolver. Missing period is unsupported. */
export function opportunityAnnotationOccurrence(item: OwnedOpportunity, includeCreated = false): string | null {
  if (!item.profileId || !item.opportunity_key || !item.period_key || item.already_created && !includeCreated) return null;
  return `profile-opportunity:${item.profileId}:${item.opportunity_key}:${item.period_key}`;
}

export function opportunityViewKey(item: OwnedOpportunity): string {
  return opportunityAnnotationOccurrence(item, true) ?? `untracked-opportunity:${item.profileId}:${item.opportunity_key}`;
}

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
