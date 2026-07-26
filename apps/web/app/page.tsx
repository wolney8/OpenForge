import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { platformBrand } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="page-shell stack">
      <section className="hero-panel split-hero">
        <div className="stack">
          <BrandLogo className="brand-logo-hero" priority />
          <span className="eyebrow">{platformBrand.name}</span>
          <h1>Fund Manager dashboard for matched betting tracker operations.</h1>
          <p className="lede">
            Review profile performance, open daily tracker work, and keep reports,
            account settings, backups, and fee reviews in one place.
          </p>
          <div className="tracker-nav">
            <Link className="button-link" href="/login">
              Login
            </Link>
            <Link className="button-link" href="/profiles">
              Open profiles
            </Link>
          </div>
        </div>
        <aside className="shell-note stack" aria-label="Platform overview">
          <span className="eyebrow">Today</span>
          <strong>Profiles first, tracker work second</strong>
          <p className="lede">
            Start from the profile dashboard, then move into the selected profile
            when a ledger row, report, backup, or account setting needs action.
          </p>
        </aside>
      </section>
      <section className="stat-strip" aria-label="Platform highlights">
        <article className="stat-card">
          <span className="eyebrow">Start</span>
          <strong>Profiles</strong>
          <p className="lede">Compare profile performance and open action queues.</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Track</span>
          <strong>Ledgers</strong>
          <p className="lede">Enter sportsbook, free-bet, casino, and cash activity.</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Review</span>
          <strong>Reports and fees</strong>
          <p className="lede">Check P&L, unresolved rows, backups, and fee status.</p>
        </article>
      </section>
    </main>
  );
}
