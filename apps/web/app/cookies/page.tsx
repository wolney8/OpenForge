import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <main className="page-shell auth-page legal-page">
      <article className="hero-panel stack legal-panel" data-pd-id="legal.cookies">
        <h1>Cookie Policy</h1>
        <p>
          Plum Duff currently uses only required cookies and browser storage. No analytics,
          advertising or marketing cookies are loaded.
        </p>
        <div className="table-shell legal-storage-table">
          <table className="data-table">
            <colgroup><col /><col /><col /><col /></colgroup>
            <thead><tr><th>Technology</th><th>Category</th><th>Purpose</th><th>Duration</th></tr></thead>
            <tbody>
              <tr><td><code>pd_session</code></td><td>Strictly Necessary</td><td>Keeps you signed in.</td><td>Session lifetime</td></tr>
              <tr><td><code>pd_oauth_state</code></td><td>Strictly Necessary</td><td>Secures sign-in.</td><td>10 minutes</td></tr>
              <tr><td>Theme and interface</td><td>Preferences</td><td>Remembers browser settings.</td><td>Until cleared</td></tr>
              <tr><td>Local workflow state</td><td>Strictly Necessary</td><td>Keeps temporary workflow state.</td><td>Until cleared</td></tr>
              <tr><td>Session security</td><td>Strictly Necessary</td><td>Remembers inactivity settings.</td><td>Until cleared</td></tr>
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
