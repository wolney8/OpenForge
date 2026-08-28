import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function RegisterPage() {
  return (
    <main className="page-shell auth-page">
      <section className="hero-panel stack auth-panel" data-pd-id="auth.registration.panel">
        <BrandLogo className="brand-logo-login" priority />
        <h1>Registration</h1>
        <p className="lede">Registration is not available yet.</p>
        <Link className="button-link" data-pd-id="auth.registration.back" href="/login">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
