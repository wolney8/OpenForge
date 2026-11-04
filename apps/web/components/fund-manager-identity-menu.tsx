"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthoritativeSession } from "@/components/session-bootstrap-gate";
import { useTheme } from "@/components/theme-provider";
import { clearAuthenticatedSessionState } from "@/lib/authenticated-session-state";
import { APP_CONFIRMATION_OPEN_EVENT } from "@/lib/use-unsaved-changes-guard";
import { backLayThemeOptions } from "@/components/back-lay-theme-toggle";
import labStyles from "@/components/design-lab-connected.module.css";
import { DesignLabHeaderOverlay } from "@/components/design-lab-header-overlay";

export function FundManagerIdentityMenu({ uxV2 = false }: { uxV2?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const session = useAuthoritativeSession();
  const { theme, toggleTheme, backLayTheme, setBackLayTheme } = useTheme();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const isOpen = openPathname === pathname;

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
      clearAuthenticatedSessionState();
      router.replace("/login?signed_out=1");
    } catch {
      setLogoutError(true);
      setIsLoggingOut(false);
    }
  };

  const v2Menu = <div className={labStyles.menuBody} data-pd-id="fund-manager-identity.menu" id="fund-manager-identity-menu">
    <div className={labStyles.menuIdentity}><span aria-hidden="true" className={labStyles.menuAvatar}>{initial}</span><div><strong>{session.name}</strong><small>{session.email}</small><Link data-pd-id="fund-manager-identity.account" href="/account" onClick={() => setOpenPathname(null)}>Manage account</Link></div></div>
    <div className={labStyles.menuGroup}>
      <Link className={labStyles.menuRow} data-pd-id="fund-manager-identity.add-profile" href="/profiles/new" onClick={() => setOpenPathname(null)}><span aria-hidden="true" className="material-symbols-outlined">person_add</span><span>Add Profile</span></Link>
      <Link className={labStyles.menuRow} data-pd-id="fund-manager-identity.settings" href="/settings" onClick={() => setOpenPathname(null)}><span aria-hidden="true" className="material-symbols-outlined">settings</span><span>Settings</span></Link>
      <button aria-checked={theme === "dark"} className={`${labStyles.menuSwitch} material-switch${theme === "dark" ? " is-selected" : ""}`} data-pd-id="fund-manager-identity.dark-mode" onClick={toggleTheme} role="switch" type="button"><span aria-hidden="true" className="material-symbols-outlined">dark_mode</span><span>Dark mode</span><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span></button>
      <fieldset className="ux-v2-back-lay-group" data-pd-id="fund-manager-identity.back-lay-colours"><legend>Back/Lay colours</legend>{backLayThemeOptions.map(option => <label className={labStyles.menuRow} key={option.value}><input checked={backLayTheme === option.value} name="v2-back-lay-colours" onChange={() => setBackLayTheme(option.value)} type="radio" value={option.value} /><span><strong>{option.label}</strong><small>{option.value === "smarkets" ? "Back green / Lay blue" : "Back blue / Lay pink"}</small></span><span aria-hidden="true" className={`back-lay-theme-swatch back-lay-theme-swatch-${option.value}`} /></label>)}</fieldset>
    </div>
    <div className={labStyles.menuGroup}><button className={`${labStyles.menuRow} ${labStyles.menuDanger}`} data-pd-id="fund-manager-identity.logout" disabled={isLoggingOut} onClick={() => void logout()} type="button"><span aria-hidden="true" className="material-symbols-outlined">logout</span><span>{isLoggingOut ? "Signing out..." : "Logout"}</span></button></div>
    {logoutError ? <p className="error-text" role="alert">Could not sign out. Please try again.</p> : null}
  </div>;

  return (
    <div className="app-menu-shell fund-manager-identity-shell" ref={rootRef}>
      <button
        aria-controls={!uxV2 || isOpen ? "fund-manager-identity-menu" : undefined}
        aria-expanded={isOpen}
        aria-haspopup={uxV2 ? undefined : "dialog"}
        aria-label={`Open account menu for ${session.name}, Fund Manager`}
        className={`fund-manager-identity-trigger${uxV2 ? ` ux-v2-identity-trigger ${labStyles.iconButton} ${labStyles.avatarButton}` : ""}`}
        data-pd-id="fund-manager-identity.trigger"
        onClick={() => setOpenPathname((current) => current === pathname ? null : pathname)}
        ref={triggerRef}
        title={`${session.name} · Fund Manager`}
        type="button"
      >
        {uxV2 ? initial : <><span aria-hidden="true" className="fund-manager-avatar">{initial}</span><span className="table-chip table-chip-info fund-manager-role-chip">Fund Manager</span><span aria-hidden="true" className="material-symbols-outlined">expand_more</span></>}
      </button>
      {uxV2 ? isOpen ? <DesignLabHeaderOverlay anchorRef={triggerRef} label="Fund Manager account menu" onClose={() => setOpenPathname(null)} preferredWidth={460}>{v2Menu}</DesignLabHeaderOverlay> : null : <section
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
        <Link
          className="profile-command-add-action"
          data-pd-id="fund-manager-identity.settings"
          href="/settings"
          onClick={() => setOpenPathname(null)}
        >
          <span aria-hidden="true" className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </Link>
        <Link
          className="profile-command-add-action"
          data-pd-id="fund-manager-identity.notifications"
          href="/notifications"
          onClick={() => setOpenPathname(null)}
        >
          <span aria-hidden="true" className="material-symbols-outlined">notifications</span>
          <span>Notifications</span>
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
      </section>}
    </div>
  );
}
