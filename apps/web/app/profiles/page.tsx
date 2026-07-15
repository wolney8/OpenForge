import Link from "next/link";
import { CrossProfileAnalytics } from "@/components/cross-profile-analytics";
import { getProfiles } from "@/lib/tracker-data";

export default async function ProfilesPage() {
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
          <span className="eyebrow">/profiles</span>
          <h1>Profiles are isolated tracker containers.</h1>
          <p className="lede">
            The Fund Manager view is a roster and aggregate control screen.
            Operational row entry and workbook workflow remain inside the selected
            profile tracker.
          </p>
          <div className="tracker-nav">
            <Link className="button-link" href="/profiles/new">
              Add profile
            </Link>
          </div>
        </div>
        <aside className="shell-note stack" aria-label="Combined analytics note">
          <span className="eyebrow">Combined analytics</span>
          <strong>Aggregate only</strong>
          <p className="lede">
            Cross-profile comparisons belong here. Mixed row editing does not.
          </p>
        </aside>
      </section>
      <CrossProfileAnalytics profiles={analyticsProfiles} />
    </main>
  );
}
