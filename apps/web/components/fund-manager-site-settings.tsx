export function FundManagerSiteSettings() {
  return (
    <section className="content-subpanel stack" data-pd-id="fund-manager-site-settings.section">
      <div>
        <span className="eyebrow">Fund Manager only</span>
        <h2>Site Settings</h2>
        <p className="field-hint">These controls are held until the authenticated hosted-runtime tranche. They do not change the current local platform.</p>
      </div>
      <div className="settings-card-grid">
        <article className="content-subpanel stack"><h3>Access and identity</h3><p className="field-hint">Fund Manager credentials, Google OAuth, roles and session policy.</p></article>
        <article className="content-subpanel stack"><h3>Profile administration</h3><p className="field-hint">Profile restrictions, deletion safeguards and onboarding rules.</p></article>
        <article className="content-subpanel stack"><h3>Platform integrations</h3><p className="field-hint">Stripe, email delivery, object storage and operational connections.</p></article>
        <article className="content-subpanel stack"><h3>Communications</h3><p className="field-hint">Announcements, mailshots and recipient-safe notification templates.</p></article>
      </div>
    </section>
  );
}
