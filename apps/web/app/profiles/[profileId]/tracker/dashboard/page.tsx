import { notFound } from "next/navigation";
import { ProfileFlexibleNav } from "@/components/profile-flexible-nav";
import { TrackerSummaryShell } from "@/components/tracker-summary-shell";
import { getProfile } from "@/lib/tracker-data";

type DashboardPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { profileId } = await params;
  const profile = await getProfile(profileId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page-shell stack">
      <section className="hero-panel stack tracker-hero tracker-hero-compact">
        <ProfileFlexibleNav profileId={profile.profileId} />
      </section>
      <TrackerSummaryShell profileId={profile.profileId} variant="dashboard" />
    </main>
  );
}
