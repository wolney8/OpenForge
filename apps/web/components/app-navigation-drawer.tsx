"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
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

  const navigationItems = [
    {
      href: "/login",
      icon: "login",
      label: "Login",
      isActive: pathname === "/login",
      pdId: "app-navigation.login",
    },
    {
      href: "/profiles",
      icon: "group",
      label: "Profiles",
      isActive:
        pathname === "/profiles" ||
        pathname === "/profiles/new" ||
        /^\/profiles\/[^/]+$/.test(pathname),
      pdId: "app-navigation.profiles",
    },
    {
      href: `/profiles/${activeProfileId}/tracker/sportsbook-bets`,
      icon: "sports",
      label: "Tracker",
      isActive: /^\/profiles\/[^/]+\/tracker(?:\/|$)/.test(pathname),
      pdId: "app-navigation.tracker",
    },
    {
      href: "/settings",
      icon: "settings",
      label: "Settings",
      isActive: pathname === "/settings",
      pdId: "app-navigation.settings",
    },
  ];

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
          {navigationItems.map((item) => (
            <Link
              aria-current={item.isActive ? "page" : undefined}
              className={`app-navigation-drawer-link${item.isActive ? " is-active" : ""}`}
              data-pd-id={item.pdId}
              href={item.href}
              key={item.href}
              onClick={onClose}
            >
              <span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
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
