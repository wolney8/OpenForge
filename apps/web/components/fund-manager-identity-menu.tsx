"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FundManagerSession } from "@/components/fund-manager-account-page";
import { APP_CONFIRMATION_OPEN_EVENT } from "@/lib/use-unsaved-changes-guard";

export function FundManagerIdentityMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [session, setSession] = useState<FundManagerSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const isOpen = openPathname === pathname;

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<FundManagerSession>;
      })
      .then((value) => {
        if (active) setSession(value);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsSessionLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeForAppConfirmation = () => setOpenPathname(null);
    window.addEventListener(APP_CONFIRMATION_OPEN_EVENT, closeForAppConfirmation);
    return () => {
      window.removeEventListener(APP_CONFIRMATION_OPEN_EVENT, closeForAppConfirmation);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPathname(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenPathname(null);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!session && isSessionLoading) {
    return (
      <span
        aria-label="Loading account controls"
        className="fund-manager-identity-trigger is-loading"
        data-pd-id="fund-manager-identity.loading"
        role="status"
      >
        <span aria-hidden="true" className="button-spinner" />
      </span>
    );
  }
  if (!session) return null;
  const initial = session.name.trim().charAt(0).toLocaleUpperCase() || "F";

  const logout = async () => {
    setIsLoggingOut(true);
    setLogoutError(false);
    try {
      const response = await fetch("/api/auth/logout", {
        credentials: "include",
        method: "POST",
      });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login?signed_out=1");
    } catch {
      setLogoutError(true);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="app-menu-shell fund-manager-identity-shell" ref={rootRef}>
      <button
        aria-controls="fund-manager-identity-menu"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Open account menu for ${session.name}, Fund Manager`}
        className="fund-manager-identity-trigger"
        data-pd-id="fund-manager-identity.trigger"
        onClick={() => setOpenPathname((current) => current === pathname ? null : pathname)}
        ref={triggerRef}
        title={`${session.name} · Fund Manager`}
        type="button"
      >
        <span aria-hidden="true" className="fund-manager-avatar">{initial}</span>
        <span className="table-chip table-chip-info fund-manager-role-chip">Fund Manager</span>
        <span aria-hidden="true" className="material-symbols-outlined">expand_more</span>
      </button>
      <section
        aria-label="Fund Manager account menu"
        className={`app-menu-panel app-menu-panel-right fund-manager-identity-panel${isOpen ? " is-open" : ""}`}
        data-pd-id="fund-manager-identity.menu"
        id="fund-manager-identity-menu"
        role="dialog"
      >
        <header className="fund-manager-identity-summary">
          <span aria-hidden="true" className="fund-manager-avatar">{initial}</span>
          <span>
            <strong>{session.name}</strong>
            <small>{session.email}</small>
          </span>
        </header>
        <span className="table-chip table-chip-info">Fund Manager</span>
        <Link
          className="profile-command-add-action"
          data-pd-id="fund-manager-identity.account"
          href="/account"
          onClick={() => setOpenPathname(null)}
        >
          <span aria-hidden="true" className="material-symbols-outlined">manage_accounts</span>
          <span>My Account</span>
        </Link>
        <button
          className="profile-command-add-action"
          data-pd-id="fund-manager-identity.logout"
          disabled={isLoggingOut}
          onClick={() => void logout()}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">logout</span>
          <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
        </button>
        {logoutError ? <p className="error-text" role="alert">Could not sign out. Please try again.</p> : null}
      </section>
    </div>
  );
}
