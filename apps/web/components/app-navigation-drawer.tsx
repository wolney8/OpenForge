"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/brand-logo";
import { platformBrand } from "@/lib/brand";

type AppNavigationDrawerProps = {
  activeProfileId: string;
  isInsideProfile: boolean;
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  profileSubtitle: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
const subscribeToPortalAvailability = () => () => undefined;

const navigationItems = [
  { id: "home", href: "/profiles?view=performance", label: "Home", icon: "space_dashboard" },
  { id: "profiles", href: "/profiles?view=profiles", label: "Profiles", icon: "group" },
  {
    id: "registration-requests",
    href: "/profiles/requests",
    label: "Registration Requests",
    icon: "how_to_reg",
  },
  {
    id: "account-catalogue",
    href: "/settings#catalogue",
    label: "Account Catalogue",
    icon: "account_balance",
  },
  { id: "notifications", href: "/notifications", label: "Notifications", icon: "notifications" },
  { id: "reports", href: "/profiles?view=reports", label: "Reports", icon: "summarize" },
  { id: "settings", href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function AppNavigationDrawer({
  activeProfileId,
  isInsideProfile,
  isOpen,
  onClose,
  profileName,
  profileSubtitle,
  triggerRef,
}: AppNavigationDrawerProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [locationHash, setLocationHash] = useState("");
  const portalReady = useSyncExternalStore(
    subscribeToPortalAvailability,
    () => true,
    () => false
  );
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const syncHash = () => setLocationHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const appFrame = document.querySelector<HTMLElement>(".app-frame");
    const skipLink = document.querySelector<HTMLElement>(".skip-link");
    const triggerElement = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    appFrame?.setAttribute("inert", "");
    skipLink?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      appFrame?.removeAttribute("inert");
      skipLink?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => triggerElement?.focus());
    };
  }, [isOpen, onClose, triggerRef]);

  if (!portalReady) return null;

  const currentView = searchParams.get("view") ?? "profiles";
  const itemIsActive = (id: (typeof navigationItems)[number]["id"]) => {
    if (id === "home") return pathname === "/profiles" && currentView === "performance";
    if (id === "profiles") return pathname === "/profiles" && currentView === "profiles";
    if (id === "registration-requests") return pathname === "/profiles/requests";
    if (id === "account-catalogue") {
      return pathname === "/settings" && locationHash === "#catalogue";
    }
    if (id === "notifications") return pathname === "/notifications";
    if (id === "reports") return pathname === "/profiles" && currentView === "reports";
    return id === "settings" && pathname === "/settings";
  };

  return createPortal(
    <div
      aria-hidden={!isOpen}
      className={`app-navigation-drawer-backdrop${isOpen ? " is-open" : ""}`}
      data-pd-id="app-navigation.backdrop"
      inert={isOpen ? undefined : true}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <aside
        aria-label="Plum Duff navigation"
        aria-modal="true"
        className="app-navigation-drawer"
        data-pd-id="app-navigation.drawer"
        id="app-navigation-drawer"
        ref={drawerRef}
        role="dialog"
      >
        <header className="app-navigation-drawer-header">
          <div className="app-navigation-drawer-brand">
            <span aria-hidden="true" className="app-navigation-drawer-logo">
              <BrandLogo variant="mark" />
            </span>
            <div>
              <p className="eyebrow">{platformBrand.name}</p>
              <h2>Navigation</h2>
            </div>
          </div>
          <button
            aria-label="Close navigation drawer"
            className="icon-button app-navigation-drawer-close"
            data-pd-id="app-navigation.close"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </header>

        <nav aria-label="Primary navigation" className="app-navigation-drawer-list">
          {navigationItems.map((item) => {
            const isActive = itemIsActive(item.id);
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`app-navigation-drawer-link${isActive ? " is-active" : ""}`}
                data-pd-id={`app-navigation.${item.id}`}
                href={item.href}
                key={item.id}
                onClick={onClose}
              >
                <span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            className="app-navigation-drawer-link app-navigation-drawer-button app-navigation-drawer-logout"
            data-pd-id="app-navigation.logout"
            disabled={isLoggingOut}
            onClick={() => {
              setIsLoggingOut(true);
              setLogoutError(false);
              void fetch("/api/auth/logout", { method: "POST", credentials: "include" })
                .then((response) => {
                  if (!response.ok) throw new Error("Logout failed");
                  router.replace("/login?signed_out=1");
                })
                .catch(() => {
                  setLogoutError(true);
                  setIsLoggingOut(false);
                });
            }}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">logout</span>
            <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
          </button>
          {logoutError ? (
            <p className="error-text" role="alert">Could not sign out. Please try again.</p>
          ) : null}
        </nav>

        {isInsideProfile ? (
          <section
            aria-label="Current profile context"
            className="app-navigation-drawer-context"
            data-pd-id="app-navigation.profile-context"
          >
            <span>Current profile</span>
            <strong>{profileName}</strong>
            <small>{profileSubtitle}</small>
            <Link href={`/profiles/${activeProfileId}/tracker/dashboard`} onClick={onClose}>
              Open dashboard
            </Link>
          </section>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}
