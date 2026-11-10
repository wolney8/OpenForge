"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { destinationForPath, shellDestinations, type ShellDestination } from "@/lib/fund-manager-destinations";
import { beginRouteTransition } from "@/lib/shell-loading";
import { confirmUnsavedTrackerChanges } from "@/lib/use-unsaved-changes-guard";
import { BrandLogo } from "@/components/brand-logo";
import labStyles from "@/components/design-lab-connected.module.css";
import { platformBrand } from "@/lib/brand";
import { DesignLabHeaderOverlay } from "@/components/design-lab-header-overlay";
import { ModalBoundary } from "@/components/modal-boundary";
import { labDestinations } from "@/lib/design-lab-navigation";
import { loadTaskAnnotations, patchTaskAnnotations, TASK_ANNOTATIONS_REFRESH_EVENT, type TaskAnnotation } from "@/lib/task-annotations";
import { TrackedTaskCard } from "@/components/tracked-task-card";
import { loadTrackedTaskContext, trackedTaskKey, type TrackedTaskContext } from "@/lib/tracked-task-context";
import { scopedGlobalHref } from "@/lib/profile-scope";
import { SHOW_TRACKED_TASKS_BANNER_EVENT, TRACKED_BANNER_VISIBILITY_EVENT, trackedBannerIsHidden } from "@/components/tracked-tasks-banner";

const originStorageKey = "plum-duff:ux-v2-source-origin";
const scrollRestoreKey = "plum-duff:ux-v2-scroll-restore";
type Origin = { href: string; label: string; target: string; scrollY: number };
const labVisualId: Record<string, string> = { position: "home", today: "tasks", "free-bets": "freeBets", "extra-place": "extraPlace" };
function visualIcon(item: ShellDestination): string {
  return labDestinations.find((labItem) => labItem.id === (labVisualId[item.id] ?? item.id))?.icon ?? item.icon;
}

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

type NavProfile = { profile_id: string; display_name: string; status?: string };
function NavLink({ item, profileId, pathname, locationHash, onNavigate, onChooseProfile }: {
  item: ShellDestination; profileId: string | null; pathname: string; locationHash: string; onNavigate?: () => void;
  onChooseProfile: (item: ShellDestination, trigger: HTMLButtonElement) => void;
}) {
  const navigate = useShellNavigation();
  const rawHref = item.href(profileId);
  const href = rawHref ? scopedGlobalHref(rawHref, profileId) : null;
  const destination = destinationForPath(pathname, locationHash);
  const active = destination?.id === item.id || destination?.parent === item.id;
  if (!href) return <button aria-haspopup="dialog" aria-label={`${item.label} — choose a Profile`} className="ux-v2-nav-link is-unavailable" data-pd-id={`ux-v2.nav.${item.id}`} onClick={event => onChooseProfile(item, event.currentTarget)} title="Choose a Profile to open this destination" type="button"><span aria-hidden="true" className="material-symbols-outlined">{visualIcon(item)}</span><span>{item.label}</span><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button>;
  return <Link aria-current={active ? (destination?.id === item.id ? "page" : "location") : undefined} className={`ux-v2-nav-link${active ? " is-active" : ""}`} data-pd-id={`ux-v2.nav.${item.id}`} href={href} onClick={(event) => void navigate(event, href, onNavigate)} title={item.label}><span aria-hidden="true" className="material-symbols-outlined">{visualIcon(item)}</span><span>{item.label}</span></Link>;
}

export function FundManagerUxV2Sidebar({ profileId, availableProfiles, mobileOpen, onMobileClose, triggerRef }: {
  profileId: string | null; availableProfiles: NavProfile[]; mobileOpen: boolean; onMobileClose: () => void; triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const navigate = useShellNavigation();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [locationHash, setLocationHash] = useState("");
  const [trackerExpanded, setTrackerExpanded] = useState<boolean | null>(null);
  const trackerIsExpanded = trackerExpanded ?? true;
  const [moreExpanded, setMoreExpanded] = useState<boolean | null>(null);
  const [requestedDestination, setRequestedDestination] = useState<ShellDestination | null>(null);
  const pickerTriggerRef = useRef<HTMLElement | null>(null);
  const destination = destinationForPath(pathname, locationHash);
  const currentMore = destination?.group === "more" ? destination
    : shellDestinations.find(item => item.group === "more" && item.id === destination?.parent) ?? null;
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
      if (document.querySelector("dialog[open]")) return;
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
  const chooseProfile = (item: ShellDestination, trigger: HTMLButtonElement) => { pickerTriggerRef.current = trigger; setRequestedDestination(item); };
  const openRequestedDestination = async (selectedId: string) => {
    const href = requestedDestination?.href(selectedId);
    if (!href || !(await confirmUnsavedTrackerChanges())) return;
    setRequestedDestination(null); onMobileClose(); beginRouteTransition(); router.push(href);
  };
  return <>
    <div className={`ux-v2-sidebar-scrim${mobileOpen ? " is-open" : ""}`} onMouseDown={onMobileClose} />
    <aside aria-label="Fund Manager navigation" className={`ux-v2-sidebar ${labStyles.sidebar}${mobileOpen ? ` is-mobile-open ${labStyles.sidebarOpen}` : ""}`} data-pd-id="ux-v2.sidebar" id="ux-v2-sidebar" ref={sidebarRef}>
      <div className={labStyles.brand}><BrandLogo variant="mark" /><span>{platformBrand.name} <small>Fund Manager</small></span><button aria-label="Close navigation" className={`${labStyles.sidebarClose} ${labStyles.iconButton}`} onClick={onMobileClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
      <div className={labStyles.navGroup}><p>Fund Manager</p>
      <nav aria-label="Primary navigation" className="ux-v2-nav-stack">
        {group("primary").filter((item) => item.id !== "reports").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onChooseProfile={chooseProfile} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}
        <div className={`${labStyles.trackerNav}${destination?.group === "tracker" ? ` ${labStyles.navGroupActive}` : ""}`}>
          <Link aria-current={pathname === "/tracker" ? "page" : undefined} className="ux-v2-nav-link" data-pd-id="ux-v2.nav.tracker" href={scopedGlobalHref("/tracker", profileId)} onClick={event => void navigate(event, scopedGlobalHref("/tracker", profileId), onMobileClose)}><span aria-hidden="true" className="material-symbols-outlined">table_chart</span><span>Tracker</span></Link>
          <button aria-controls="ux-v2-tracker-destinations" aria-expanded={trackerIsExpanded} aria-label={trackerIsExpanded ? "Collapse Tracker" : "Expand Tracker"} className={labStyles.trackerExpand} data-pd-id="ux-v2.nav.tracker-expand" onClick={() => setTrackerExpanded(!trackerIsExpanded)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{trackerIsExpanded ? "expand_less" : "expand_more"}</span></button>
        </div>
        {trackerIsExpanded ? <div className={labStyles.trackerChildren} id="ux-v2-tracker-destinations">{group("tracker").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onChooseProfile={chooseProfile} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}</div> : null}
        {group("primary").filter((item) => item.id === "reports").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onChooseProfile={chooseProfile} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}
      </nav>
      </div>
      <div className={labStyles.navGroup}><button aria-expanded={moreIsExpanded} className={labStyles.moreButton} data-pd-id="ux-v2.nav.more" onClick={() => setMoreExpanded(!moreIsExpanded)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{moreIsExpanded ? "expand_less" : "expand_more"}</span><span>See More</span></button>{moreIsExpanded ? <nav aria-label="Less frequent destinations">{group("more").map((item) => <NavLink item={item} key={item.id} locationHash={locationHash} onChooseProfile={chooseProfile} onNavigate={onMobileClose} pathname={pathname} profileId={profileId} />)}</nav> : null}</div>
    </aside>
    {requestedDestination ? <ModalBoundary onDismiss={() => setRequestedDestination(null)} returnFocusRef={pickerTriggerRef}><section aria-label={`Choose Profile for ${requestedDestination.label}`} className="ux-v2-profile-picker" data-pd-id="ux-v2.profile-picker" role="dialog"><header><div><small>Profile required</small><h2>Open {requestedDestination.label}</h2><p>Choose an authorised Profile to continue.</p></div><button aria-label="Close Profile chooser" className="modal-close-button" onClick={() => setRequestedDestination(null)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><div className="ux-v2-profile-picker-list">{availableProfiles.length ? availableProfiles.map(profile => <button data-pd-id={`ux-v2.profile-picker.${profile.profile_id}`} key={profile.profile_id} onClick={() => void openRequestedDestination(profile.profile_id)} type="button">{profile.display_name}<span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button>) : <p>No authorised active Profiles are available. Open Profiles to review access.</p>}</div><footer><button onClick={() => setRequestedDestination(null)} type="button">Cancel</button></footer></section></ModalBoundary> : null}
  </>;
}

const launcherGroups = [
  { title: "Betting Tools", items: [
    { id: "oddsmatcher", description: "Explore betting opportunities" },
    { id: "calculators", description: "Open governed calculators" },
  ] },
  { title: "Administration", items: [
    { id: "subscribers", description: "Manage invitations" },
    { id: "catalogue", description: "Manage Account providers" },
    { id: "administration", description: "Manage application settings" },
    { id: "recovery", description: "Restore Profiles and backups" },
  ] },
] as const;

export function FundManagerUxV2HeaderTasks({ profileId = null }: { profileId?: string | null }) {
  const navigate = useShellNavigation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [annotations, setAnnotations] = useState<TaskAnnotation[] | null>(null);
  const [taskContext, setTaskContext] = useState<Map<string, TrackedTaskContext>>(new Map());
  const [pendingUntrack, setPendingUntrack] = useState("");
  const [untrackError, setUntrackError] = useState("");
  const [bannerHidden, setBannerHidden] = useState(false);
  useEffect(() => {
    const refreshVisibility = () => setBannerHidden(trackedBannerIsHidden());
    refreshVisibility();
    window.addEventListener(TRACKED_BANNER_VISIBILITY_EVENT, refreshVisibility);
    return () => window.removeEventListener(TRACKED_BANNER_VISIBILITY_EVENT, refreshVisibility);
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => void loadTaskAnnotations().then(async rows => {
      if (!active) return;
      setAnnotations(rows);
      if (rows) try { const contexts = await loadTrackedTaskContext(rows); if (active) setTaskContext(contexts); } catch { if (active) setTaskContext(new Map()); }
    });
    refresh();
    window.addEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, refresh);
    return () => { active = false; window.removeEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, refresh); };
  }, []);
  const allTasksHref = profileId ? `/tasks?scope=${encodeURIComponent(profileId)}` : "/tasks";
  const trackedTasksHref = profileId ? `${allTasksHref}&collection=tracked` : "/tasks?collection=tracked";
  const untrack = async (item: TaskAnnotation) => {
    if (pendingUntrack) return;
    setPendingUntrack(trackedTaskKey(item.profile_id, item.occurrence_key));
    setUntrackError("");
    const result = await patchTaskAnnotations([{ profile_id: item.profile_id, occurrence_key: item.occurrence_key, tracked: false, work_state: item.work_state, blocked_reason: item.blocked_reason, review_date: item.review_date, expected_version: item.version }]);
    if (result.error) setUntrackError(result.error);
    setPendingUntrack("");
    if (!result.error) window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-pd-id="ux-v2.header.tracked-view-all"]')?.focus();
    });
  };
  if (!annotations) return <Link aria-label="Open Tasks" className={labStyles.iconButton} data-pd-id="ux-v2.header.tasks" href={allTasksHref} onClick={(event) => void navigate(event, allTasksHref)} title="Tasks"><span aria-hidden="true" className="material-symbols-outlined">task_alt</span></Link>;
  const active = annotations.filter(item => item.tracked && item.source_status === "active" && (!profileId || item.profile_id === profileId));
  const history = annotations.filter(item => item.tracked && item.source_status !== "active" && (!profileId || item.profile_id === profileId));
  const preview = active.slice(0, 5);
  return <div className="app-menu-shell ux-v2-tracked-root">
    <button aria-expanded={open} aria-label={`Tracked Tasks, ${active.length} active`} className={labStyles.iconButton} data-pd-id="ux-v2.header.tasks" onClick={() => setOpen(value => !value)} ref={triggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">task_alt</span>{active.length ? <span aria-hidden="true" className={labStyles.notificationCount}>{active.length}</span> : null}</button>
    {open ? <DesignLabHeaderOverlay anchorRef={triggerRef} label="Tracked Tasks" onClose={() => setOpen(false)} preferredWidth={380}>
      <div className={labStyles.menuBody} data-pd-id="ux-v2.header.tracked-panel">
        <h2>Tracked Tasks ({active.length})</h2>
        {untrackError ? <p role="alert">{untrackError}</p> : null}
        {preview.length ? <div className={labStyles.trackedPanelRows}>{preview.map(item => {
          const href = `${trackedTasksHref}&task=${encodeURIComponent(item.occurrence_key)}`;
          const key = trackedTaskKey(item.profile_id, item.occurrence_key);
          return <TrackedTaskCard context={taskContext.get(key)} item={item} key={key} onNavigate={(event, target) => void navigate(event, target, () => setOpen(false))} onUntrack={() => void untrack(item)} pending={pendingUntrack === key} taskHref={href} />;
        })}</div> : <p className={labStyles.menuEmpty}>No Active Tracked Tasks</p>}
        {active.length > preview.length ? <p className={labStyles.trackedPreviewCount}>Showing {preview.length} of {active.length} active tasks</p> : null}
        {history.length ? <Link className={labStyles.menuRow} href={trackedTasksHref} onClick={event => void navigate(event, trackedTasksHref, () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">history</span><span>Source history and unavailable tasks ({history.length})</span></Link> : null}
        {bannerHidden ? <button className={labStyles.menuRow} data-pd-id="ux-v2.header.tracked-show-banner" onClick={() => { window.dispatchEvent(new Event(SHOW_TRACKED_TASKS_BANNER_EVENT)); setOpen(false); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">visibility</span><span>Show Tracked Tasks Banner</span></button> : null}
        <Link className={labStyles.menuRow} data-pd-id="ux-v2.header.tracked-view-all" href={trackedTasksHref} onClick={event => void navigate(event, trackedTasksHref, () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">view_list</span><span>View All Tracked Tasks</span></Link>
      </div>
    </DesignLabHeaderOverlay> : null}
  </div>;
}

export function FundManagerUxV2Help() {
  const navigate = useShellNavigation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  return <div className="app-menu-shell ux-v2-help-root">
    <button aria-expanded={open} aria-label="Open help" className={`${labStyles.iconButton} ${labStyles.helpButton}`} data-pd-id="ux-v2.header.help" onClick={() => setOpen(value => !value)} ref={triggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">help</span></button>
    {open ? <DesignLabHeaderOverlay anchorRef={triggerRef} label="Help" onClose={() => setOpen(false)} preferredWidth={380}><div className={labStyles.menuBody} data-pd-id="ux-v2.header.help-panel"><h2>Help</h2><Link className={labStyles.menuRow} href="/" onClick={(event) => void navigate(event, "/", () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">space_dashboard</span><span><strong>Position</strong><small>Review financial position across Profiles</small></span><span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link><Link className={labStyles.menuRow} href="/tasks" onClick={(event) => void navigate(event, "/tasks", () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">task_alt</span><span><strong>Today</strong><small>Review current tasks and source actions</small></span><span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link><Link className={labStyles.menuRow} href="/settings" onClick={(event) => void navigate(event, "/settings", () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">settings</span><span><strong>Settings</strong><small>Manage application preferences and reference data</small></span><span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link></div></DesignLabHeaderOverlay> : null}
  </div>;
}

export function FundManagerUxV2Launcher() {
  const navigate = useShellNavigation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  return <div className="app-menu-shell ux-v2-launcher-root">
    <button aria-expanded={open} aria-label="Open application launcher" className={labStyles.iconButton} data-pd-id="ux-v2.launcher.trigger" onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">apps</span></button>
    {open ? <DesignLabHeaderOverlay anchorRef={triggerRef} label="Application launcher" onClose={() => setOpen(false)} preferredWidth={380}><div className={labStyles.menuBody} data-pd-id="ux-v2.launcher.panel"><h2>Apps and tools</h2>{launcherGroups.map(group => <div key={group.title}><h3>{group.title}</h3>{group.items.map(({ id, description }) => { const item = shellDestinations.find(destination => destination.id === id); const href = item?.href(null); return item && href ? <Link className={labStyles.menuRow} data-pd-id={`ux-v2.launcher.${item.id}`} href={href} key={id} onClick={(event) => void navigate(event, href, () => setOpen(false))}><span aria-hidden="true" className="material-symbols-outlined">{visualIcon(item)}</span><span><strong>{item.label}</strong><small>{description}</small></span><span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link> : null; })}</div>)}</div></DesignLabHeaderOverlay> : null}
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
  if (pathname === "/") return <nav aria-label="Breadcrumb" className={labStyles.breadcrumb} data-pd-id="ux-v2.breadcrumbs"><span aria-current="page">Position</span></nav>;
  if (!current) return null;
  const tracker = current.group === "tracker";
  const crumbs: { label: string; href?: string }[] = [{ label: "Position", href: scopedGlobalHref("/", profileId) }];
  if (tracker) crumbs.push({ label: "Tracker", href: scopedGlobalHref("/tracker", profileId) });
  else if (current.parent) {
    const parent = shellDestinations.find(item => item.id === current.parent);
    const href = parent?.href(profileId);
    if (parent && href) crumbs.push({ label: parent.label, href: scopedGlobalHref(href, profileId) });
  }
  else if (profileId && pathname.startsWith("/profiles/")) crumbs.push({ label: "Profiles", href: "/profiles" });
  crumbs.push({ label: current.label });
  return <div className="ux-v2-crumb-row" data-pd-id="ux-v2.breadcrumbs"><nav aria-label="Breadcrumb"><ol>{crumbs.map((crumb, index) => <li key={`${crumb.label}-${index}`}>{crumb.href ? <Link href={crumb.href} onClick={(event) => void navigate(event, crumb.href!)}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}</li>)}</ol></nav>{origin ? <div className="ux-v2-origin-group">{/^\/(reports|tasks)(?:[/?#]|$)/.test(origin.href) ? <span className="ux-v2-origin-context">All Profiles view · viewing {profileName}</span> : null}<Link className="ux-v2-origin-back" href={origin.href} onClick={(event) => { void navigate(event, origin.href, () => sessionStorage.setItem(scrollRestoreKey, JSON.stringify({ href: origin.href, y: origin.scrollY }))); }}><span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>Back to {origin.label}</Link></div> : null}</div>;
}
