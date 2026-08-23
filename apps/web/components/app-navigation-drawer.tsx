"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/brand-logo";
import { platformBrand } from "@/lib/brand";

type ProfileNavigationRecord = {
  profile_id: string;
  display_name: string;
  status?: string;
};

type AppNavigationDrawerProps = {
  activeProfileId: string;
  activeProfiles: ProfileNavigationRecord[];
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

export function AppNavigationDrawer({
  activeProfileId,
  activeProfiles,
  isInsideProfile,
  isOpen,
  onClose,
  profileName,
  profileSubtitle,
  triggerRef,
}: AppNavigationDrawerProps) {
  const pathname = usePathname() ?? "";
  const [profilesExpanded, setProfilesExpanded] = useState(false);
  const portalReady = useSyncExternalStore(
    subscribeToPortalAvailability,
    () => true,
    () => false
  );
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
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

  const profilesIsActive =
    pathname === "/profiles" ||
    pathname === "/profiles/new" ||
    (/^\/profiles\/[^/]+$/.test(pathname) && pathname !== "/profiles/requests");
  const profileShortcuts = activeProfiles.slice(0, 3);
  const hasMoreProfiles = activeProfiles.length > profileShortcuts.length;
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
          <Link
            aria-current={pathname === "/profiles" ? "page" : undefined}
            className={`app-navigation-drawer-link${pathname === "/profiles" ? " is-active" : ""}`}
            data-pd-id="app-navigation.fund-manager-dashboard"
            href="/profiles"
            onClick={onClose}
          >
            <span aria-hidden="true" className="material-symbols-outlined">space_dashboard</span>
            <span>Home</span>
          </Link>
          <div className="app-navigation-drawer-group">
            <button
              aria-controls="app-navigation-profile-shortcuts"
              aria-current={profilesIsActive ? "page" : undefined}
              aria-expanded={profilesExpanded}
              aria-label="Show profile dashboards"
              className={`app-navigation-drawer-link app-navigation-drawer-button${
                profilesIsActive ? " is-active" : ""
              }`}
              data-pd-id="app-navigation.profiles"
              onClick={() => setProfilesExpanded((current) => !current)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">group</span>
              <span>Profiles</span>
              <span aria-hidden="true" className="material-symbols-outlined app-navigation-drawer-expand-icon">
                {profilesExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
            <div
              className={`app-navigation-profile-shortcuts${profilesExpanded ? " is-open" : ""}`}
              id="app-navigation-profile-shortcuts"
            >
              {profileShortcuts.map((profile) => (
                <Link
                  aria-current={profile.profile_id === activeProfileId && pathname.includes("/tracker/dashboard") ? "page" : undefined}
                  className={`app-navigation-profile-link${
                    profile.profile_id === activeProfileId && pathname.includes("/tracker/dashboard")
                      ? " is-active"
                      : ""
                  }`}
                  data-pd-id={`app-navigation.profile.${profile.profile_id}`}
                  href={`/profiles/${profile.profile_id}/tracker/dashboard`}
                  key={profile.profile_id}
                  onClick={onClose}
                >
                  <span aria-hidden="true" className="material-symbols-outlined">dashboard</span>
                  <span>{profile.display_name}</span>
                </Link>
              ))}
              {hasMoreProfiles ? (
                <Link
                  className="app-navigation-profile-link"
                  data-pd-id="app-navigation.profiles.view-all"
                  href="/profiles"
                  onClick={onClose}
                >
                  <span aria-hidden="true" className="material-symbols-outlined">more_horiz</span>
                  <span>View all</span>
                </Link>
              ) : null}
              <Link
                aria-current={pathname === "/profiles/new" ? "page" : undefined}
                className={`app-navigation-profile-link${
                  pathname === "/profiles/new" ? " is-active" : ""
                }`}
                data-pd-id="app-navigation.profiles.add-profile"
                href="/profiles/new"
                onClick={onClose}
              >
                <span aria-hidden="true" className="material-symbols-outlined">add</span>
                <span>Add profile</span>
              </Link>
              {profileShortcuts.length === 0 ? (
                <Link
                  className="app-navigation-profile-link"
                  data-pd-id="app-navigation.profiles.view-all"
                  href="/profiles"
                  onClick={onClose}
                >
                  <span aria-hidden="true" className="material-symbols-outlined">group</span>
                  <span>View profiles</span>
                </Link>
              ) : null}
            </div>
          </div>
          <Link
            aria-current={pathname === "/profiles/requests" ? "page" : undefined}
            className={`app-navigation-drawer-link${pathname === "/profiles/requests" ? " is-active" : ""}`}
            data-pd-id="app-navigation.registration-requests"
            href="/profiles/requests"
            onClick={onClose}
          >
            <span aria-hidden="true" className="material-symbols-outlined">how_to_reg</span>
            <span>Registration requests</span>
          </Link>
          <Link
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={`app-navigation-drawer-link${pathname === "/settings" ? " is-active" : ""}`}
            data-pd-id="app-navigation.settings"
            href="/settings"
            onClick={onClose}
          >
            <span aria-hidden="true" className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>
          <Link
            aria-current={pathname === "/login" ? "page" : undefined}
            className={`app-navigation-drawer-link app-navigation-drawer-dev-link${
              pathname === "/login" ? " is-active" : ""
            }`}
            data-pd-id="app-navigation.logout"
            href="/login"
            onClick={onClose}
          >
            <span aria-hidden="true" className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </Link>
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
          </section>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}
