function UnavailableField({ label }: { label: string }) {
  return (
    <div className="profile-future-setting-row">
      <span>{label}</span>
      <span className="table-chip table-chip-muted">Not available</span>
    </div>
  );
}

export function ProfileSecuritySettings() {
  return (
    <section aria-label="Profile security settings" className="content-subpanel stack" data-pd-id="profile-settings.security">
      <div><span className="eyebrow">Future Access</span><h2>Security</h2></div>
      <p className="field-hint">Authentication and session details will become available after the owner-only OAuth security gate is implemented.</p>
      <div className="profile-future-settings-list">
        {[
          "Authentication state",
          "OAuth provider",
          "Last login",
          "Session status",
          "MFA status",
          "Security events",
        ].map((label) => <UnavailableField key={label} label={label} />)}
      </div>
    </section>
  );
}

export function ProfileSubscriberSettings() {
  return (
    <section aria-label="Profile subscriber settings" className="content-subpanel stack" data-pd-id="profile-settings.subscriber">
      <div><span className="eyebrow">Future Relationship</span><h2>Subscriber</h2></div>
      <p className="field-hint">Subscriber registration and access are not active. These fields define the future Profile-to-Subscriber boundary without creating placeholder identities.</p>
      <div className="profile-future-settings-list">
        {[
          "Linked Subscriber",
          "Subscriber access",
          "Application status",
          "Onboarding status",
          "Approval status",
          "Assigned Fund Manager",
          "Subscription tier",
          "Subscriber portal",
        ].map((label) => <UnavailableField key={label} label={label} />)}
      </div>
    </section>
  );
}
