import Link from "next/link";
import { getProfiles } from "@/lib/tracker-data";

export default async function ProfilesPage() {
  const profiles = await getProfiles();

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
      <section className="route-grid">
        {profiles.map((profile) => (
          <article className="route-card stack" key={profile.profileId}>
            <strong>{profile.displayName}</strong>
            <div className="badge">{profile.status}</div>
            <dl>
              <dt>Profile code</dt>
              <dd>{profile.profileCode}</dd>
            </dl>
            <dl>
              <dt>Tracking start</dt>
              <dd>{profile.trackingStartDate}</dd>
            </dl>
            <dl>
              <dt>Fees</dt>
              <dd>
                Management {profile.managementFeePercent}% / Investment{" "}
                {profile.investmentFeePercent}%
              </dd>
            </dl>
            <div className="tracker-nav">
              <Link href={`/profiles/${profile.profileId}`}>View profile</Link>
              <Link href={`/profiles/${profile.profileId}/tracker`}>
                Open tracker
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
