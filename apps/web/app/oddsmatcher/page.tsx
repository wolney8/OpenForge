import { OddsMatcherShell } from "@/components/oddsmatcher-shell";

export const metadata = { title: "Oddsmatcher · Plum Duff" };

export default async function OddsMatcherPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const profileId = typeof query.profileId === "string" ? query.profileId : null;
  return <OddsMatcherShell initialProfileId={profileId} />;
}
