import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/tracker-data";

const trackerRoutes = [
  {
    href: "dashboard",
    title: "Dashboard",
    summary: "Combined operational summary and profit metrics shell.",
  },
  {
    href: "accounts",
    title: "Accounts",
    summary: "Profile-scoped bookmaker and exchange account view placeholder.",
  },
  {
    href: "sportsbook-bets",
    title: "Sportsbook Bets",
    summary: "Qualifying and mug-bet workflow placeholder.",
  },
  {
    href: "free-bets",
    title: "Free Bets",
    summary: "SNR and SR free-bet workflow placeholder.",
  },
  {
    href: "casino-offers",
    title: "Casino Offers",
    summary: "Casino offer workflow placeholder.",
  },
  {
    href: "cash-adjustments",
    title: "Cash Adjustments",
    summary: "Signed adjustments, deductions, and bankroll events placeholder.",
  },
  {
    href: "reports",
    title: "Reports",
    summary: "Date-range and formal report view placeholder.",
  },
  {
    href: "profit-tracker",
    title: "Profit Tracker",
    summary: "Workbook-style P&L drilldown placeholder.",
  },
];

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
      </section>
      <section className="route-grid">
        {trackerRoutes.map((route) => (
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
