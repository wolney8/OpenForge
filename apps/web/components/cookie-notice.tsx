"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  acknowledgeRequiredStorage,
  COOKIE_NOTICE_OPEN_EVENT,
  hasAcknowledgedRequiredStorage,
} from "@/lib/storage-consent";

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(!hasAcknowledgedRequiredStorage()));
    const reopen = () => setOpen(true);
    window.addEventListener(COOKIE_NOTICE_OPEN_EVENT, reopen);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(COOKIE_NOTICE_OPEN_EVENT, reopen);
    };
  }, []);

  if (!open) return null;
  return (
    <aside
      aria-label="Cookie information"
      className="cookie-notice content-panel"
      data-pd-id="cookie-notice"
    >
      <p>Required cookies and browser storage keep sign-in secure and remember your settings.</p>
      <div className="tracker-nav tracker-nav-right">
        <Link className="button-link" href="/cookies">Cookie Policy</Link>
        <button
          className="modal-primary-button"
          data-pd-id="cookie-notice.acknowledge"
          onClick={() => {
            acknowledgeRequiredStorage();
            setOpen(false);
          }}
          type="button"
        >
          Understood
        </button>
      </div>
    </aside>
  );
}
