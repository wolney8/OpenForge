import { notFound } from "next/navigation";
import { TrackerSummaryShell } from "@/components/tracker-summary-shell";
import { getProfile } from "@/lib/tracker-data";
import type { Metadata } from "next";

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
      <TrackerSummaryShell profileId={profile.profileId} profileTitle={`${profile.profileCode} ${profile.displayName.split(/\s+/u)[0]}`} variant="dashboard" />
    </main>
  );
}

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const { profileId } = await params;
  const profile = await getProfile(profileId);
  return { title: profile ? `${profile.profileCode} ${profile.displayName.split(/\s+/u)[0]} Operations · Plum Duff` : "Profile Operations · Plum Duff" };
}
