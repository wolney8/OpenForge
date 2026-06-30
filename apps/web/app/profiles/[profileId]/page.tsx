import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/tracker-data";

type ProfilePageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { profileId } = await params;
  const profile = await getProfile(profileId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="content-panel stack">
        <span className="eyebrow">/profiles/{profile.profileId}</span>
        <h1>{profile.displayName}</h1>
        <p className="lede">
          This profile surface is a control checkpoint before entering the isolated
          tracker workspace.
        </p>
        <div className="meta-grid">
          <dl>
            <dt>Profile code</dt>
            <dd>{profile.profileCode}</dd>
          </dl>
          <dl>
            <dt>Status</dt>
            <dd>{profile.status}</dd>
          </dl>
          <dl>
            <dt>Current cash snapshot</dt>
            <dd>{profile.currentCashSnapshot}</dd>
          </dl>
        </div>
        <div className="tracker-nav">
          <Link href={`/profiles/${profile.profileId}/tracker`}>Enter tracker</Link>
          <Link href="/profiles">Back to roster</Link>
        </div>
      </section>
    </main>
  );
}
