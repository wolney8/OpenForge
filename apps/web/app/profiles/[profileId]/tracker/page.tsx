import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/tracker-data";

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

  redirect(`/profiles/${profile.profileId}/tracker/sportsbook-bets`);
}
