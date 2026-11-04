"use client";

import { AuthPresentation } from "@/components/auth-presentation";
import styles from "./design-lab-auth.module.css";

export type LabSessionState = "authenticated" | "signed-out" | "authenticating" | "cancelled" | "failed" | "denied" | "expired" | "validation-unavailable";

const detail: Record<Exclude<LabSessionState, "authenticated" | "authenticating" | "signed-out">, { title: string; body: string }> = {
  cancelled: { title: "Sign-in cancelled", body: "No lab session was started. You can try again." },
  failed: { title: "Sign-in failed", body: "No lab session was started. Your intended page is retained; try again." },
  denied: { title: "Identity not authorised", body: "This identity has no Fund Manager access. Signing in alone does not grant a role." },
  expired: { title: "Application session expired", body: "Sign in again to renew the application session. An existing Google session may return without another password prompt." },
  "validation-unavailable": { title: "We couldn't validate your session", body: "The validation service may be temporarily unavailable. Your previous session has not been declared expired." },
};

export function DesignLabAuth({ state, destination, onSignIn, onRetry, onScenario }: {
  state: LabSessionState;
  destination: string;
  onSignIn: () => void;
  onRetry: () => void;
  onScenario: (state: LabSessionState) => void;
}) {
  const message = state !== "authenticated" && state !== "authenticating" && state !== "signed-out" ? detail[state] : null;
  return <AuthPresentation inspectionId="lab.auth-screen" subtitle="Design Lab · simulated session" titleId="lab-auth-title">
      <h1 id="lab-auth-title">{message?.title ?? (state === "authenticating" ? "Signing in" : "Welcome back")}</h1>
      <p>{message?.body ?? (state === "authenticating" ? "Checking the simulated Fund Manager identity…" : `Return to ${destination} after sign-in.`)}</p>
      <div aria-live="polite" className={styles.status}>{state === "authenticating" ? <span className="button-spinner" aria-hidden="true" /> : null}{state === "validation-unavailable" ? "Validation temporarily unavailable" : state === "expired" ? "Application session invalid" : state === "denied" ? "Access denied" : "No real authentication action occurs here"}</div>
      <div className={styles.actions}>
        {state === "validation-unavailable" ? <button className={styles.secondary} onClick={onRetry} type="button">Retry validation</button> : null}
        <button className={styles.primary} disabled={state === "authenticating" || state === "denied"} onClick={onSignIn} type="button"><span aria-hidden="true" className={styles.googleMark}>G</span>{state === "expired" || state === "validation-unavailable" ? "Sign in again" : "Sign in with Google · simulation"}</button>
      </div>
      <details className={styles.scenarios}><summary>Explore session states</summary><div><button onClick={() => onScenario("cancelled")} type="button">Cancelled</button><button onClick={() => onScenario("failed")} type="button">Failed</button><button onClick={() => onScenario("denied")} type="button">Not authorised</button><button onClick={() => onScenario("expired")} type="button">Expired</button><button onClick={() => onScenario("validation-unavailable")} type="button">Temporary validation issue</button><button onClick={() => onScenario("signed-out")} type="button">Signed out</button></div></details>
  </AuthPresentation>;
}
