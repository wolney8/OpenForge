import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { platformBrand } from "@/lib/brand";

const routes = [
  {
    href: "/login",
    title: "Login",
    summary: "Single-operator local-first authentication entry.",
  },
  {
    href: "/profiles",
    title: "Profiles",
    summary: "Fund Manager roster and aggregate control surface.",
  },
  {
    href: "/profiles/profile-demo-001/tracker/dashboard",
    title: "Tracker",
    summary: "Profile-scoped tracker workflows with workbook-derived summaries and settings.",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell stack">
      <section className="hero-panel split-hero">
        <div className="stack">
          <BrandLogo className="brand-logo-hero" priority />
          <span className="eyebrow">{platformBrand.name}</span>
          <h1>Profile-scoped tracker platform for workbook-first matched betting operations.</h1>
          <p className="lede">
            Use the local-first login, move into profiles, then open the selected tracker.
            Sportsbook bets, free bets, casino offers, cash adjustments, settings, and
            reporting now sit inside the same profile-scoped shell.
          </p>
          <div className="tracker-nav">
            <Link className="button-link" href="/login">
              Start at login
            </Link>
            <Link className="button-link" href="/profiles">
              Open profiles
            </Link>
          </div>
        </div>
        <aside className="shell-note stack" aria-label="Platform overview">
          <span className="eyebrow">Platform overview</span>
          <strong>Fund Manager control with isolated profile trackers</strong>
          <p className="lede">
            Each profile keeps separate tracker data, while the Fund Manager can move
            between profile dashboards, ledgers, settings, and reports from one local app.
          </p>
        </aside>
      </section>
      <section className="stat-strip" aria-label="Platform highlights">
        <article className="stat-card">
          <span className="eyebrow">Route model</span>
          <strong>Login → Profiles → Tracker</strong>
          <p className="lede">The app keeps the workbook-led workflow anchored to the selected profile.</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Tracker focus</span>
          <strong>Workbook parity first</strong>
          <p className="lede">Ledger flows are being translated to the web before UI expansion work.</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Theme</span>
          <strong>Light and dark</strong>
          <p className="lede">The shell now supports both for daily use and testing.</p>
        </article>
      </section>
      <section className="route-grid">
        {routes.map((route) => (
          <Link className="route-card stack" href={route.href} key={route.href}>
            <strong>{route.title}</strong>
            <p className="lede">{route.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
