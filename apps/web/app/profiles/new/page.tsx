export default function NewProfilePage() {
  return (
    <main className="page-shell">
      <section className="content-panel stack">
        <span className="eyebrow">/profiles/new</span>
        <h1>Add profile</h1>
        <p className="lede">
          This shell reserves the profile-creation route. Form persistence, validation,
          and database writes are intentionally deferred to the next implementation slice.
        </p>
        <div className="meta-grid">
          <dl>
            <dt>MVP fields</dt>
            <dd>
              display name, profile code, email, phone, status, tracking start date,
              bankroll, notes, management fee, investment fee
            </dd>
          </dl>
          <dl>
            <dt>Safety rule</dt>
            <dd>No credentials or payment secrets stored here</dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
