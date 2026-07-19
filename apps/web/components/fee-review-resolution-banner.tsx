"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FeeReviewResolutionContext } from "@/lib/fee-review-session";

export function FeeReviewResolutionBanner({
  context,
  hasUnsavedChanges = false,
  onSaveAndLeave,
}: {
  context: FeeReviewResolutionContext;
  hasUnsavedChanges?: boolean;
  onSaveAndLeave?: () => Promise<boolean>;
}) {
  const guardDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingHref, setPendingHref] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    function interceptNavigation(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.dataset.feeReviewNavigation === "allowed") return;
      const destination = new URL(target.href, window.location.href);
      if (destination.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(destination.href);
      guardDialogRef.current?.showModal();
    }

    document.addEventListener("click", interceptNavigation, true);
    return () => document.removeEventListener("click", interceptNavigation, true);
  }, []);

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${context.month}-01T00:00:00Z`));

  return (
    <>
      <aside
        aria-label="Monthly fee review resolution session"
        className="fee-review-resolution-banner"
        data-pd-id="fee-review-resolution.banner"
      >
        <span aria-hidden="true" className="material-symbols-outlined">warning</span>
        <div>
          <strong>Resolving {monthLabel} Fee Review</strong>
          <span>{context.profileName} · {context.recordIds.length} blocking row{context.recordIds.length === 1 ? "" : "s"}</span>
        </div>
        <Link
          className="button-link fee-review-return-link"
          data-fee-review-navigation="allowed"
          data-pd-id="fee-review-resolution.return"
          href={context.returnHref}
        >
          <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
          Return to Monthly Fee Review
        </Link>
      </aside>

      <dialog
        aria-labelledby="fee-review-leave-title"
        className="confirmation-dialog"
        data-pd-id="fee-review-resolution.leave-dialog"
        ref={guardDialogRef}
      >
        <div className="stack">
          <h2 id="fee-review-leave-title">Leave Fee Review?</h2>
          <p>
            You are resolving blockers for {context.profileName}. Saved row changes are retained.
            {hasUnsavedChanges ? " This editor also contains unsaved changes." : ""}
          </p>
          {saveError ? <p className="validation-message" role="alert">{saveError}</p> : null}
          <div className="tracker-nav tracker-nav-right">
            <button
              className="button-link"
              onClick={() => guardDialogRef.current?.close()}
              type="button"
            >
              Stay and Finish
            </button>
            {hasUnsavedChanges ? (
              <button
                className="modal-primary-button"
                disabled={isSaving || !onSaveAndLeave}
                onClick={() => {
                  if (!onSaveAndLeave || !pendingHref) return;
                  setIsSaving(true);
                  setSaveError("");
                  void onSaveAndLeave().then((saved) => {
                    setIsSaving(false);
                    if (saved) window.location.assign(pendingHref);
                    else setSaveError("Complete the highlighted required fields before leaving.");
                  });
                }}
                type="button"
              >
                {isSaving ? "Saving" : "Save and Leave"}
              </button>
            ) : null}
            <button
              className={hasUnsavedChanges ? "button-link review-chip-danger" : "modal-primary-button"}
              onClick={() => {
                if (pendingHref) window.location.assign(pendingHref);
              }}
              type="button"
            >
              {hasUnsavedChanges ? "Discard Changes and Leave" : "End Fee Review and Leave"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
