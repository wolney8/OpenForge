const demographicFields = [
  ["Full Name", "Profile holder's legal or preferred name"],
  ["Email Address", "Profile contact email"],
  ["Phone Number", "Profile contact number"],
  ["Address Line 1", "Primary address"],
  ["Address Line 2", "Additional address information"],
  ["Town / City", "Town or city"],
  ["County", "County or region"],
  ["Postcode", "Postal code"],
] as const;

const financialFields = [
  ["Date Of Birth", "Identity and account eligibility"],
  ["National Insurance Number", "Future regulated financial administration"],
  ["Tax Reference", "Future reporting reference"],
  ["Primary Bank", "Profile's preferred bank relationship"],
] as const;

function StubField({ label, purpose }: { label: string; purpose: string }) {
  return (
    <label className="field-control">
      <span>{label}</span>
      <input aria-describedby={`demographics-${label.replaceAll(" ", "-").toLowerCase()}`} disabled value="" />
      <small id={`demographics-${label.replaceAll(" ", "-").toLowerCase()}`}>{purpose}</small>
    </label>
  );
}

export function ProfileDemographicsSettings() {
  return (
    <section aria-label="Profile demographics" className="stack" data-pd-id="profile-settings.demographics">
      <section className="content-subpanel stack">
        <div><span className="eyebrow">Profile Details</span><h2>Demographics</h2></div>
        <p className="field-hint">These fields are reserved for the secured Profile identity workflow and are not editable yet.</p>
        <div className="form-grid">
          {demographicFields.map(([label, purpose]) => <StubField key={label} label={label} purpose={purpose} />)}
        </div>
      </section>
      <section className="content-subpanel stack">
        <div><span className="eyebrow">Protected Details</span><h2>Financial And Identity</h2></div>
        <p className="field-hint">Sensitive values will require owner authorization, encrypted persistence and audit controls before activation.</p>
        <div className="form-grid">
          {financialFields.map(([label, purpose]) => <StubField key={label} label={label} purpose={purpose} />)}
        </div>
      </section>
    </section>
  );
}
