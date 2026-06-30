import Link from "next/link";

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
    summary: "Profile-scoped tracker shell with route placeholders only.",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell stack">
      <section className="hero-panel split-hero">
        <div className="stack">
          <span className="eyebrow">OpenForge scaffold</span>
          <h1>Profile-scoped operations shell with the reporting and tracker boundary preserved.</h1>
          <p className="lede">
            The shell now establishes the route model, Material-aligned design tokens,
            WCAG-focused interaction states, and local-first structure without exposing
            any untested financial calculations.
          </p>
          <div className="tracker-nav">
            <Link className="button-link" href="/login">
              Start at login
            </Link>
            <div className="badge">Shell only</div>
          </div>
        </div>
        <aside className="shell-note stack" aria-label="Scaffold status">
          <span className="eyebrow">Current phase</span>
          <strong>M5 shell foundation</strong>
          <p className="lede">
            Profiles and tracker modules are navigable. Workbook logic, live imports,
            and persisted ledger data are still deferred.
          </p>
        </aside>
      </section>
      <section className="stat-strip" aria-label="Platform boundaries">
        <article className="stat-card">
          <span className="eyebrow">Profiles</span>
          <strong>Isolated</strong>
          <p className="lede">Each profile remains a separate tracker container.</p>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Calculations</span>
          <strong>Contract-led</strong>
          <p className="lede">No money values appear until fixture-backed logic exists.</p>
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
