"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/brand-logo";
import { platformBrand } from "@/lib/brand";
import { recordRecentProfile, resolveRecentProfiles } from "@/lib/recent-profiles";

type ProfileNavigationRecord = {
  profile_id: string;
  display_name: string;
  status?: string;
};

type AppNavigationDrawerProps = {
  activeProfileId: string;
  availableProfiles: ProfileNavigationRecord[];
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
  { id: "dashboard", href: "/", label: "Dashboard", icon: "space_dashboard" },
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
  { id: "reports", href: "/reports", label: "Reports", icon: "summarize" },
] as const;

export function AppNavigationDrawer({
  activeProfileId,
  availableProfiles,
  isInsideProfile,
  isOpen,
  onClose,
  profileName,
  profileSubtitle,
  triggerRef,
}: AppNavigationDrawerProps) {
  const pathname = usePathname() ?? "";
  const [locationHash, setLocationHash] = useState("");
  const [profilesExpanded, setProfilesExpanded] = useState(pathname.startsWith("/profiles"));
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
  const recentProfiles = resolveRecentProfiles(window.localStorage, availableProfiles);

  const itemIsActive = (id: (typeof navigationItems)[number]["id"]) => {
    if (id === "dashboard") return pathname === "/" || pathname === "/performance";
    if (id === "registration-requests") return pathname === "/profiles/requests";
    if (id === "account-catalogue") {
      return pathname === "/settings" && locationHash === "#catalogue";
    }
    if (id === "reports") return pathname === "/reports";
    return false;
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
          {navigationItems.slice(0, 1).map((item) => {
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
          <div className="app-navigation-drawer-profile-group">
            <button
              aria-expanded={profilesExpanded}
              className={`app-navigation-drawer-link app-navigation-drawer-button${pathname.startsWith("/profiles") ? " is-active" : ""}`}
              data-pd-id="app-navigation.profiles"
              onClick={() => setProfilesExpanded((current) => !current)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">group</span>
              <span>Profiles</span>
              <span aria-hidden="true" className="material-symbols-outlined app-navigation-expand-icon">
                {profilesExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
            {profilesExpanded ? (
              <div className="app-navigation-profile-links" data-pd-id="app-navigation.recent-profiles">
                {recentProfiles.map((profile) => (
                  <Link
                    className="app-navigation-drawer-link app-navigation-drawer-sublink"
                    data-pd-id={`app-navigation.profile.${profile.profile_id}`}
                    href={`/profiles/${profile.profile_id}/tracker/dashboard`}
                    key={profile.profile_id}
                    onClick={() => {
                      recordRecentProfile(window.localStorage, {
                        profileId: profile.profile_id,
                        displayName: profile.display_name,
                      });
                      onClose();
                    }}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">person</span>
                    <span>{profile.display_name}</span>
                  </Link>
                ))}
                <Link className="app-navigation-drawer-link app-navigation-drawer-sublink" data-pd-id="app-navigation.profiles.view-all" href="/profiles" onClick={onClose}>
                  <span aria-hidden="true" className="material-symbols-outlined">list</span>
                  <span>View all Profiles</span>
                </Link>
                <Link className="app-navigation-drawer-link app-navigation-drawer-sublink" data-pd-id="app-navigation.profiles.add" href="/profiles/new" onClick={onClose}>
                  <span aria-hidden="true" className="material-symbols-outlined">person_add</span>
                  <span>Add Profile</span>
                </Link>
              </div>
            ) : null}
          </div>
          {navigationItems.slice(1).map((item) => {
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
