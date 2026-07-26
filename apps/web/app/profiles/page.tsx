import { CrossProfileAnalytics } from "@/components/cross-profile-analytics";
import { getProfiles } from "@/lib/tracker-data";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const profiles = await getProfiles();
  const analyticsProfiles = profiles.map((profile) => ({
    profileId: profile.profileId,
    displayName: profile.displayName,
    profileCode: profile.profileCode,
    status: profile.status,
    trackingStartDate: profile.trackingStartDate,
    managementFeePercent: profile.managementFeePercent,
    investmentFeePercent: profile.investmentFeePercent,
  }));

  return (
    <main className="page-shell stack">
      <section className="hero-panel split-hero">
        <div className="stack">
          <span className="eyebrow">Fund Manager</span>
          <h1>Profiles and combined analytics</h1>
          <p className="lede">
            Review profile performance, action queues, exposure, fees, and formal
            reports before opening a profile tracker.
          </p>
        </div>
        <aside className="shell-note stack profile-dashboard-hero-summary" aria-label="Profile dashboard summary">
          <span className="eyebrow">Active profiles</span>
          <strong>{profiles.filter((profile) => profile.status.toLowerCase() === "active").length} / {profiles.length}</strong>
          <p className="lede">Open a profile row below to work on its tracker.</p>
        </aside>
      </section>
      <CrossProfileAnalytics
        initialDetailProfileId={typeof query.profile === "string" ? query.profile : undefined}
        initialFeeReviewMonth={typeof query.feeReview === "string" ? query.feeReview : undefined}
        initialOpportunityId={typeof query.opportunity === "string" ? query.opportunity : undefined}
        profiles={analyticsProfiles}
      />
    </main>
  );
}
