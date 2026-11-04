import { AuthPresentation } from "@/components/auth-presentation";
import { RealAuthSignIn } from "@/components/real-auth-sign-in";
import { normalizePostAuthDestination } from "@/lib/auth-redirect";
import Link from "next/link";
import styles from "@/components/design-lab-auth.module.css";

const errorMessages: Record<string, string> = {
  invalid_oauth_state: "Sign-in couldn't be completed. Please try again.",
  oauth_configuration_unavailable: "Sign-in isn't available right now. Please try again.",
  oauth_exchange_failed: "Sign-in couldn't be completed. Please try again.",
  oauth_identity_failed: "Sign-in couldn't be completed. Please try again.",
  oauth_provider_denied: "Sign-in wasn't completed. Please try again.",
  oauth_session_failed: "Sign-in couldn't be completed. Please try again.",
  not_authorized: "Access unavailable. Contact the administrator.",
  session_expired: "Your session ended. Sign in to continue.",
  session_validation_unavailable: "We couldn't validate your session. Try again or sign in.",
};

const errorTitles: Record<string, string> = {
  not_authorized: "Access unavailable",
  oauth_configuration_unavailable: "Sign-in unavailable",
  oauth_provider_denied: "Sign-in cancelled",
  session_expired: "Session expired",
  session_validation_unavailable: "Session check unavailable",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? errorMessages[params.error] : null;
  const next = normalizePostAuthDestination(
    typeof params.next === "string" ? params.next : undefined
  );
  const signedOut = params.signed_out === "1";
  const title = error && typeof params.error === "string"
    ? errorTitles[params.error] ?? "Sign-in failed"
    : "Welcome back";

  return (
    <AuthPresentation inspectionId="auth.login.panel" subtitle="Secure sign-in" titleId="auth-login-title">
        <h1 id="auth-login-title">{title}</h1>
        <p>{next === "/design-lab" ? "Return to Design Lab after sign-in." : "Return to Plum Duff after sign-in."}</p>
        <div aria-live="polite" className={styles.status}>
          {error ? <span role="alert">{error}</span> : signedOut ? <span role="status">You have signed out.</span> : "Use your approved Google account."}
        </div>
        <div className={styles.actions}>
          <RealAuthSignIn next={next} />
        </div>
        <Link className={styles.registration} data-pd-id="auth.registration" href="/register">
          Register for an account
        </Link>
    </AuthPresentation>
  );
}
