"use client";

import Link from "next/link";
import { PublicErrorState } from "@/components/public-error-state";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PublicErrorState
      action={
        <div className="tracker-nav public-error-actions">
          <button className="modal-primary-button" onClick={reset} type="button">Try again</button>
          <Link className="button-link" href="/login">Return to sign in</Link>
        </div>
      }
      message="Please try again or return to sign in."
      title="Unable to continue"
    />
  );
}
