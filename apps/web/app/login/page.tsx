import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="hero-panel stack">
        <BrandLogo className="brand-logo-login" priority />
        <span className="eyebrow">Fund Manager</span>
        <h1>Fund Manager login</h1>
        <p className="lede">
          Sign in to manage profiles, tracker ledgers, reports, backups, and fee reviews.
        </p>
        <div className="meta-grid">
          <dl>
            <dt>Workspace</dt>
            <dd>Fund Manager</dd>
          </dl>
          <dl>
            <dt>Continue</dt>
            <dd>
              <Link className="button-link" href="/profiles">
                Open profiles
              </Link>
            </dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
