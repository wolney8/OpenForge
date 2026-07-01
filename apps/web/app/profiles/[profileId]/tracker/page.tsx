import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackerModuleNav } from "@/components/tracker-module-nav";
import { getProfile } from "@/lib/tracker-data";
import { trackerModuleCards } from "@/lib/tracker-modules";

type TrackerPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function TrackerPage({ params }: TrackerPageProps) {
  const { profileId } = await params;
  const profile = await getProfile(profileId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page-shell stack">
      <section className="hero-panel stack">
        <span className="eyebrow">/profiles/{profile.profileId}/tracker</span>
        <h1>{profile.displayName} tracker shell</h1>
        <p className="lede">
          Route structure is now in place for the workbook-derived tracker modules.
          Financial values remain hidden until contract-backed logic lands.
        </p>
        <div className="badge">Profile context: {profile.profileCode}</div>
        <TrackerModuleNav activeHref="dashboard" profileId={profile.profileId} />
      </section>
      <section className="route-grid">
        {trackerModuleCards.map((route) => (
          <Link
            className="route-card stack"
            href={`/profiles/${profile.profileId}/tracker/${route.href}`}
            key={route.href}
          >
            <strong>{route.title}</strong>
            <p className="lede">{route.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
