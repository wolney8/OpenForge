import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackerModuleNav } from "@/components/tracker-module-nav";
import { getModuleRows, getProfile } from "@/lib/tracker-data";

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

  const sportsbookRows = await getModuleRows(profileId, "sportsbook-bets");
  const freeBetRows = await getModuleRows(profileId, "free-bets");
  const casinoRows = await getModuleRows(profileId, "casino-offers");
  const openSportsbook = sportsbookRows.filter((row) => row.status !== "Settled").length;
  const openFreeBets = freeBetRows.filter((row) => row.status !== "Settled").length;

  return (
    <main className="page-shell stack">
      <section className="hero-panel stack">
        <span className="eyebrow">Tracker dashboard shell</span>
        <h1>{profile.displayName}</h1>
        <p className="lede">
          This surface will later combine dashboard tooling, settings-driven controls,
          and profit metrics without losing workbook reporting semantics.
        </p>
        <TrackerModuleNav activeHref="dashboard" profileId={profile.profileId} />
      </section>
      <section className="stat-strip" aria-label="Tracker summary">
        <article className="stat-card">
          <span className="eyebrow">Sportsbook bets</span>
          <strong>{sportsbookRows.length}</strong>
          <p className="lede">{openSportsbook} not yet settled</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Free bets</span>
          <strong>{freeBetRows.length}</strong>
          <p className="lede">{openFreeBets} still open or prospecting</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Casino offers</span>
          <strong>{casinoRows.length}</strong>
          <p className="lede">Workbook-derived local seed rows loaded</p>
        </article>
      </section>
      <section className="content-panel stack">
        <div className="meta-grid">
          <dl>
            <dt>Profile status</dt>
            <dd>{profile.status}</dd>
          </dl>
          <dl>
            <dt>Cash snapshot</dt>
            <dd>{profile.currentCashSnapshot}</dd>
          </dl>
          <dl>
            <dt>Calculation state</dt>
            <dd>Visible rows only, no financial engine rendered yet</dd>
          </dl>
        </div>
        <div className="tracker-nav">
          <Link href={`/profiles/${profile.profileId}/tracker`}>All tracker routes</Link>
          <Link href="/profiles">Back to profiles</Link>
        </div>
      </section>
    </main>
  );
}
