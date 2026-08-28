import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function PublicErrorState({
  action,
  message,
  title,
}: {
  action?: React.ReactNode;
  message: string;
  title: string;
}) {
  return (
    <main className="page-shell auth-page">
      <section className="hero-panel stack auth-panel" data-pd-id="public-error.panel">
        <BrandLogo className="brand-logo-login" priority />
        <h1>{title}</h1>
        <p className="lede">{message}</p>
        {action ?? (
          <Link className="button-link" href="/login">
            Return to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
