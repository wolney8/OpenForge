"use client";

import { useState } from "react";
import styles from "./design-lab-subscriber-preview.module.css";

type Review = "invited" | "accepted" | "submitted" | "needs-information" | "approved" | "declined" | "linked" | "granted";
export function DesignLabSubscriberPreview({ onBack }: { onBack: () => void }) {
  const [review, setReview] = useState<Review>("invited");
  return <section className={styles.preview} data-pd-id="lab.subscriber-preview">
    <button className={styles.back} onClick={onBack} type="button">← Back to Profiles</button>
    <header><span>Representative preview · CP-056</span><h2>Invited subscriber review</h2><p>Private Fund Manager decision and restricted subscriber view are shown separately. No invitation, Profile or grant is written.</p></header>
    <ol className={styles.flow}><li>Invitation</li><li>Accept</li><li>Application</li><li>Manager review</li><li>Explicit link/grant</li><li>Restricted access</li></ol>
    <div className={styles.card}><h3>Synthetic application</h3><dl><div><dt>Applicant</dt><dd>Subscriber Example · subscriber@example.invalid</dd></div><div><dt>Request</dt><dd>Managed Profile; no funding operation</dd></div><div><dt>Status</dt><dd>{review.replaceAll("-", " ")}</dd></div></dl>
      <div className={styles.actions}>
        {review === "invited" ? <button onClick={() => setReview("accepted")} type="button">Simulate acceptance</button> : null}
        {review === "accepted" ? <button onClick={() => setReview("submitted")} type="button">Submit minimal application · simulation</button> : null}
        {review === "submitted" || review === "needs-information" ? <><button onClick={() => setReview("approved")} type="button">Approve · simulation</button><button onClick={() => setReview("needs-information")} type="button">Request information</button><button onClick={() => setReview("declined")} type="button">Decline · simulation</button></> : null}
        {review === "approved" ? <button onClick={() => setReview("linked")} type="button">Link Pending Managed Profile · simulation</button> : null}
        {review === "linked" ? <button onClick={() => setReview("granted")} type="button">Grant read-only access · simulation</button> : null}
        {review === "declined" ? <button onClick={() => setReview("invited")} type="button">Restart synthetic scenario</button> : null}
      </div>
    </div>
    {review === "approved" || review === "linked" || review === "granted" ? <div className={styles.card}><h3>Provisioning boundary</h3><p>Approval alone does not activate a Profile or grant access. The Profile remains Pending until a separate governed action.</p></div> : null}
    {review === "granted" ? <div className={styles.card} data-pd-id="lab.subscriber-restricted"><h3>Subscriber projection · read only</h3><p>Only the linked Profile name, code, status, start date and confirmed fee statements may be visible. No statement is an empty state, not £0.00.</p><p>Other Profiles, Fund Manager notes, operational ledgers and draft statements are unavailable.</p></div> : null}
  </section>;
}
