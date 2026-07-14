import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="hero-panel stack">
        <BrandLogo className="brand-logo-login" priority />
        <span className="eyebrow">/login</span>
        <h1>Fund Manager login</h1>
        <p className="lede">
          MVP login is intentionally local-first and single-operator. Production auth,
          hosted SaaS sign-up, and subscriber self-service access remain deferred.
        </p>
        <div className="meta-grid">
          <dl>
            <dt>Operator mode</dt>
            <dd>One local Fund Manager</dd>
          </dl>
          <dl>
            <dt>Next route</dt>
            <dd>
              <Link className="button-link" href="/profiles">
                Go to profiles
              </Link>
            </dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
