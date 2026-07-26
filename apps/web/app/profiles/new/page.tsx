export default function NewProfilePage() {
  return (
    <main className="page-shell">
      <section className="content-panel stack">
        <span className="eyebrow">Profiles</span>
        <h1>Add profile</h1>
        <p className="lede">
          Create a new subscriber profile and keep its tracker data isolated from
          every other profile.
        </p>
        <div className="meta-grid">
          <dl>
            <dt>Profile setup</dt>
            <dd>Identity, contact, bankroll, fees, and tracking start date</dd>
          </dl>
          <dl>
            <dt>Data boundary</dt>
            <dd>Tracker rows stay isolated to the selected profile</dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
