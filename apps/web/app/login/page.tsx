import { BrandLogo } from "@/components/brand-logo";
import { GoogleBrandIcon } from "@/components/google-brand-icon";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  invalid_oauth_state: "The sign-in request expired or could not be verified. Please try again.",
  oauth_exchange_failed: "Google could not complete sign-in. Please try again.",
  oauth_identity_failed: "Google identity details could not be verified.",
  not_authorized: "This Google account is not authorised to manage Plum Duff.",
};

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/profiles?view=performance";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? errorMessages[params.error] : null;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const signedOut = params.signed_out === "1";

  return (
    <main className="page-shell auth-page">
      <section className="hero-panel stack auth-panel" data-pd-id="auth.login.panel">
        <BrandLogo className="brand-logo-login" priority />
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {signedOut ? <p className="success-text" role="status">You have signed out.</p> : null}
        <a
          className="modal-primary-button auth-google-button"
          data-pd-id="auth.google.sign-in"
          href={`/api/auth/google/login?next=${encodeURIComponent(next)}`}
        >
          <GoogleBrandIcon />
          <span>Sign in with Google</span>
        </a>
        <Link className="auth-registration-link" data-pd-id="auth.registration" href="/register">
          Register for an account
        </Link>
      </section>
    </main>
  );
}
