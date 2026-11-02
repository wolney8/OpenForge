"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { destinationForPath, shellDestinations, type ShellDestination } from "@/lib/fund-manager-destinations";
import { beginRouteTransition } from "@/lib/shell-loading";
import { confirmUnsavedTrackerChanges } from "@/lib/use-unsaved-changes-guard";

const originStorageKey = "plum-duff:ux-v2-source-origin";
const scrollRestoreKey = "plum-duff:ux-v2-scroll-restore";
type Origin = { href: string; label: string; target: string; scrollY: number };

function useShellNavigation() {
  const router = useRouter();
  return useCallback(async (event: MouseEvent<HTMLAnchorElement>, href: string, after?: () => void) => {
    event.preventDefault();
    if (!(await confirmUnsavedTrackerChanges())) return;
    after?.();
    beginRouteTransition();
    router.push(href);
  }, [router]);
}

function NavLink({ item, profileId, pathname, locationHash, onNavigate }: {
  item: ShellDestination; profileId: string | null; pathname: string; locationHash: string; onNavigate?: () => void;
}) {
  const navigate = useShellNavigation();
  const href = item.href(profileId);
  const active = destinationForPath(pathname, locationHash)?.id === item.id;
  if (!href) return <span aria-disabled="true" className="ux-v2-nav-link is-unavailable" title="Select a Profile to open this destination"><span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span></span>;
  return <Link aria-current={active ? "page" : undefined} className={`ux-v2-nav-link${active ? " is-active" : ""}`} data-pd-id={`ux-v2.nav.${item.id}`} href={href} onClick={(event) => void navigate(event, href, onNavigate)}><span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span></Link>;
}

export function FundManagerUxV2Sidebar({ profileId, mobileOpen, onMobileClose, triggerRef }: {
  profileId: string | null; mobileOpen: boolean; onMobileClose: () => void; triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname() ?? "";
  const [locationHash, setLocationHash] = useState("");
  const [trackerExpanded, setTrackerExpanded] = useState<boolean | null>(null);
  const trackerIsExpanded = trackerExpanded ?? pathname.includes("/tracker/");
  const [moreExpanded, setMoreExpanded] = useState<boolean | null>(null);
  const currentMore = destinationForPath(pathname, locationHash)?.group === "more" ? destinationForPath(pathname, locationHash) : null;
  const moreIsExpanded = moreExpanded ?? Boolean(currentMore);
  const sidebarRef = useRef<HTMLElement | null>(null);
  useEffect(() => { const sync = () => setLocationHash(window.location.hash); const frame = requestAnimationFrame(sync); window.addEventListener("hashchange", sync); return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", sync); }; }, [pathname]);
  useEffect(() => { const frame = requestAnimationFrame(() => setMoreExpanded(null)); return () => cancelAnimationFrame(frame); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLElement>("button")?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onMobileClose(); return; }
      if (event.key !== "Tab") return;
      const nodes = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? []);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); requestAnimationFrame(() => triggerElement?.focus()); };
  }, [mobileOpen, onMobileClose, triggerRef]);
  const group = (name: ShellDestination["group"]) => shellDestinations.filter((item) => item.group === name);
  return <>
    <div className={`ux-v2-sidebar-scrim${mobileOpen ? " is-open" : ""}`} onMouseDown={onMobileClose} />
    <aside aria-label="Fund Manager navigation" className={`ux-v2-sidebar${mobileOpen ? " is-mobile-open" : ""}`} data-pd-id="ux-v2.sidebar" id="ux-v2-sidebar" ref={sidebarRef}>
      <div className="ux-v2-sidebar-mobile-heading"><strong>Navigation</strong><button aria-label="Close navigation" className="icon-button" onClick={onMobileClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
      <nav aria-label="Primary navigation" className="ux-v2-nav-stack">
        {group("primary").filter((item) => item.id !== "reports").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}
        <button aria-expanded={trackerIsExpanded} className={`ux-v2-nav-link ux-v2-nav-group${pathname.includes("/tracker/") ? " is-group-active" : ""}`} data-pd-id="ux-v2.nav.tracker" onClick={() => setTrackerExpanded(!trackerIsExpanded)} type="button"><span aria-hidden="true" className="material-symbols-outlined">view_list</span><span>Tracker</span><span aria-hidden="true" className="material-symbols-outlined ux-v2-nav-chevron">{trackerIsExpanded ? "expand_less" : "expand_more"}</span></button>
        {trackerIsExpanded ? <div className="ux-v2-nav-children">{group("tracker").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}</div> : null}
        {group("primary").filter((item) => item.id === "reports").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}
        <button aria-expanded={moreIsExpanded} className={`ux-v2-nav-link ux-v2-nav-group${currentMore ? " is-group-active" : ""}`} data-pd-id="ux-v2.nav.more" onClick={() => setMoreExpanded(!moreIsExpanded)} type="button"><span aria-hidden="true" className="material-symbols-outlined">more_horiz</span><span>{!moreIsExpanded && currentMore ? `See More · ${currentMore.label}` : "See More"}</span><span aria-hidden="true" className="material-symbols-outlined ux-v2-nav-chevron">{moreIsExpanded ? "expand_less" : "expand_more"}</span></button>
        {moreIsExpanded ? <div className="ux-v2-nav-children">{group("more").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}</div> : null}
      </nav>
    </aside>
  </>;
}

export function FundManagerUxV2Launcher() {
  const navigate = useShellNavigation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: globalThis.MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("mousedown", pointer); window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", pointer); window.removeEventListener("keydown", key); };
  }, [open]);
  return <div className="app-menu-shell ux-v2-launcher-root" ref={rootRef}>
    <button aria-controls="ux-v2-launcher-panel" aria-expanded={open} aria-haspopup="dialog" aria-label="Open application launcher" className="icon-button" data-pd-id="ux-v2.launcher.trigger" onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">apps</span></button>
    {open ? <section aria-label="Application launcher" className="ux-v2-launcher-panel" data-pd-id="ux-v2.launcher.panel" id="ux-v2-launcher-panel" role="dialog"><strong>Tools & management</strong><nav aria-label="Tools and management">{shellDestinations.filter((item) => item.group === "launcher").map((item) => { const href = item.href(null); return href ? <Link className="ux-v2-launcher-link" data-pd-id={`ux-v2.launcher.${item.id}`} href={href} key={item.id} onClick={(event) => void navigate(event, href, () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span></Link> : null; })}</nav></section> : null}
  </div>;
}

export function FundManagerUxV2Breadcrumbs({ profileId, profileName }: { profileId: string | null; profileName: string }) {
  const pathname = usePathname() ?? "";
  const navigate = useShellNavigation();
  const [origin, setOrigin] = useState<Origin | null>(null);
  useEffect(() => {
    const capture = (event: globalThis.MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.origin !== window.location.origin) return;
      const target = new URL(link.href);
      if (!/^\/profiles\/[^/]+\/tracker\//.test(target.pathname)) return;
      if (pathname === target.pathname) return;
      const label = pathname === "/reports" ? "Reports" : pathname === "/tasks" ? "Today" : pathname === "/" ? "Position" : "Previous view";
      sessionStorage.setItem(originStorageKey, JSON.stringify({ href: location.pathname + location.search + location.hash, label, target: target.pathname, scrollY: scrollY }));
    };
    document.addEventListener("click", capture, true);
    return () => document.removeEventListener("click", capture, true);
  }, [pathname]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    try {
      const stored = sessionStorage.getItem(originStorageKey);
      const parsed = stored ? JSON.parse(stored) as Origin : null;
      if (parsed?.target === pathname && parsed.href.startsWith("/") && !parsed.href.startsWith("//")) setOrigin(parsed);
      else {
        const source = new URLSearchParams(window.location.search).get("source") ?? "";
        const reportSource = source.startsWith("report-") || source === "report-explorer";
        const dashboardSource = source === "dashboard";
        setOrigin(reportSource ? { href: "/reports", label: "Reports", target: pathname, scrollY: 0 } : dashboardSource && profileId ? { href: `/profiles/${encodeURIComponent(profileId)}/tracker/dashboard`, label: "Profile Operations", target: pathname, scrollY: 0 } : null);
      }
      const restore = sessionStorage.getItem(scrollRestoreKey);
      if (restore) {
        const target = JSON.parse(restore) as { href: string; y: number };
        if (target.href === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
          sessionStorage.removeItem(scrollRestoreKey);
          requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(0, target.y)));
        }
      }
    }
    catch { setOrigin(null); }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, profileId]);
  const current = destinationForPath(pathname);
  if (!current || pathname === "/") return null;
  const tracker = current.group === "tracker";
  const crumbs: { label: string; href?: string }[] = [{ label: "Position", href: "/" }];
  if (tracker) crumbs.push({ label: "Tracker", href: profileId ? `/profiles/${encodeURIComponent(profileId)}/tracker/dashboard` : "/profiles" });
  else if (profileId && pathname.startsWith("/profiles/")) crumbs.push({ label: "Profiles", href: "/profiles" });
  crumbs.push({ label: current.label });
  return <div className="ux-v2-crumb-row" data-pd-id="ux-v2.breadcrumbs"><nav aria-label="Breadcrumb"><ol>{crumbs.map((crumb, index) => <li key={`${crumb.label}-${index}`}>{crumb.href ? <Link href={crumb.href} onClick={(event) => void navigate(event, crumb.href!)}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}</li>)}</ol></nav>{origin ? <div className="ux-v2-origin-group">{/^\/(reports|tasks)(?:[/?#]|$)/.test(origin.href) ? <span className="ux-v2-origin-context">All Profiles view · viewing {profileName}</span> : null}<Link className="ux-v2-origin-back" href={origin.href} onClick={(event) => { void navigate(event, origin.href, () => sessionStorage.setItem(scrollRestoreKey, JSON.stringify({ href: origin.href, y: origin.scrollY }))); }}><span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>Back to {origin.label}</Link></div> : null}</div>;
}
