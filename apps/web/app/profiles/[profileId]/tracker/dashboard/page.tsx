import { notFound } from "next/navigation";
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
      <TrackerSummaryShell profileId={profile.profileId} variant="dashboard" />
    </main>
  );
}
