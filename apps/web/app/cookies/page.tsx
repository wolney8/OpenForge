import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function CookiePolicyPage() {
  return (
    <main className="page-shell auth-page legal-page">
      <article className="hero-panel stack legal-panel" data-pd-id="legal.cookies">
        <BrandLogo className="brand-logo-login" priority />
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Cookie Policy</h1>
        </div>
        <p>
          Plum Duff currently uses only required cookies and browser storage. No analytics,
          advertising or marketing cookies are loaded.
        </p>
        <div className="table-shell legal-storage-table">
          <table className="data-table">
            <thead><tr><th>Technology</th><th>Category</th><th>Purpose</th><th>Duration</th></tr></thead>
            <tbody>
              <tr><td><code>pd_session</code></td><td>Strictly Necessary</td><td>Maintains authenticated access.</td><td>Configured session lifetime</td></tr>
              <tr><td><code>pd_oauth_state</code></td><td>Strictly Necessary</td><td>Protects the sign-in request.</td><td>10 minutes</td></tr>
              <tr><td>Theme and interface settings</td><td>Preferences</td><td>Remembers settings selected in this browser.</td><td>Until cleared</td></tr>
              <tr><td>Local workflow state</td><td>Strictly Necessary</td><td>Supports local drafts, notices and operational continuity.</td><td>Until cleared or replaced</td></tr>
              <tr><td>Session security preference</td><td>Strictly Necessary</td><td>Stores the selected inactivity setting before hosted persistence is available.</td><td>Until cleared or migrated</td></tr>
            </tbody>
          </table>
        </div>
        <p className="field-hint">
          Required technologies cannot be disabled while using authenticated service. If optional
          technologies are introduced later, they will not load before the relevant choice is made.
        </p>
        <Link className="button-link" href="/login">Return to sign in</Link>
      </article>
    </main>
  );
}
