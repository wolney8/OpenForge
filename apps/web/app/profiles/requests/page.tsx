export default function ProfileRegistrationRequestsPage() {
  return (
    <main className="page-shell stack">
      <section className="content-panel stack">
        <span className="eyebrow">Fund Manager</span>
        <h1>Registration Requests</h1>
        <p className="lede">
          Review new subscriber requests before creating or activating profile trackers.
        </p>
        <div className="meta-grid">
          <dl>
            <dt>Pending requests</dt>
            <dd>No registration workflow has been connected yet.</dd>
          </dl>
          <dl>
            <dt>Next step</dt>
            <dd>Registration intake, document review, and funding approval are planned as a dedicated workflow.</dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
