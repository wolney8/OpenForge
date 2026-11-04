"use client";

import { useState } from "react";
import { GoogleBrandIcon } from "@/components/google-brand-icon";
import styles from "./design-lab-auth.module.css";

export function RealAuthSignIn({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  return <a
    aria-busy={pending}
    className={styles.primary}
    data-pd-id="auth.google.sign-in"
    href={`/api/auth/google/login?next=${encodeURIComponent(next)}`}
    onClick={(event) => {
      if (pending) event.preventDefault();
      else setPending(true);
    }}
  >
    {pending ? <span aria-hidden="true" className="button-spinner" /> : <GoogleBrandIcon />}
    <span>{pending ? "Connecting to Google…" : "Sign in with Google"}</span>
  </a>;
}
