"use client";

import Link from "next/link";
import { ModalBoundary } from "@/components/modal-boundary";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppNavigationDrawer } from "@/components/app-navigation-drawer";
import { BackLayThemeToggle } from "@/components/back-lay-theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { FinancialMotionPreferenceProvider } from "@/components/financial-motion-preference";
import type { FundManagerSession } from "@/components/fund-manager-account-page";
import { FundManagerIdentityMenu } from "@/components/fund-manager-identity-menu";
import { GlobalSearch } from "@/components/global-search";
import { ImportExecutionMonitor } from "@/components/import-execution-monitor";
import { NotificationCentre } from "@/components/notification-centre";
import { SessionInactivityGuard } from "@/components/session-inactivity-guard";
import { SessionBootstrapGate } from "@/components/session-bootstrap-gate";
import { ShellLoadingProgress } from "@/components/shell-loading-progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiBaseUrl } from "@/lib/api";
import { platformBrand } from "@/lib/brand";
import {
  fetchJsonAndCache,
  readCachedJson,
} from "@/lib/client-json-cache";
import {
  formatResolvedDateRange,
  formatResolvedDateRangeContext,
  resolveDateRange,
  summarizeTrackerData,
} from "@/lib/tracker-summary";
import { TRACKER_DATA_UPDATED_EVENT } from "@/lib/tracker-data-events";
import {
  TRACKER_SETTINGS_UPDATED_EVENT,
  TRACKER_SETTINGS_UPDATE_FAILED_EVENT,
  TRACKER_SETTINGS_UPDATE_STARTED_EVENT,
} from "@/lib/tracker-settings-client";
import { fetchTrackerSummarySources } from "@/lib/tracker-summary-sources";
import {
  PROFILE_DIRECTORY_UPDATED_EVENT,
  recordRecentProfile,
} from "@/lib/recent-profiles";
import { beginRouteTransition } from "@/lib/shell-loading";
import { resolveEquivalentProfileRoute } from "@/lib/profile-navigation";
import {
  APP_CONFIRMED_NAVIGATION_EVENT,
  APP_CONFIRMATION_OPEN_EVENT,
  confirmUnsavedTrackerChanges,
  useUnsavedChangesPromptController,
} from "@/lib/use-unsaved-changes-guard";

const defaultProfileId = "profile-demo-001";
const profileHeaderFallbackRefreshMs = 300_000;

type ProfileHeaderRecord = {
  profile_id: string;
  display_name: string;
  status?: string;
};

type HeaderSummaryState = {
  profileId: string;
  profileName: string;
  profileRangeDetail: string;
  profileRangeLabel: string;
  profileSubtitle: string;
  overallPnl: number | null;
  readState: "loading" | "ready" | "unavailable" | "error";
};

const profileTrackerMenuRoutes = [
  { href: "dashboard", title: "Profile Operations", icon: "dashboard" },
  { href: "sportsbook-bets", title: "Sportsbook Bets", icon: "sports" },
  { href: "free-bets", title: "Free Bets", icon: "award_star" },
  { href: "casino-offers", title: "Casino Offers", icon: "playing_cards" },
  { href: "each-way-extra-places", title: "Extra Places", icon: "chess_knight" },
  { href: "cash-adjustments", title: "Cash Adjustments", icon: "payments" },
  { href: "accounts", title: "Accounts", icon: "account_balance_wallet" },
  { href: "reports", title: "Reports", icon: "summarize" },
  { href: "settings", title: "Settings", icon: "settings" },
] as const;

function resolveProfileId(pathname: string): string | null {
  const match = pathname.match(/^\/profiles\/([^/]+)/);
  const profileId = match?.[1] ?? null;
  return profileId === "new" ? null : profileId;
}

function isAuthenticatedApplicationPath(pathname: string): boolean {
  return pathname === "/" ||
    ["/profiles", "/reports", "/performance", "/notifications", "/tasks", "/settings", "/account", "/fund-manager", "/imports", "/calculator"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/invite" || pathname.startsWith("/subscriber")) return <><a className="skip-link" href="#main-content">Skip to content</a><header className="calculator-popout-toolbar"><Link href="/subscriber">Plum Duff · Subscriber</Link><ThemeToggle /><button className="button-link" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.replace("/login"); }}>Sign out</button></header>{children}</>;
  const isCalculatorPopout = pathname === "/calculator";
  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/cookies" ||
    !isAuthenticatedApplicationPath(pathname ?? "");
  if (isPublicAuthRoute) return <AppChromeContent>{children}</AppChromeContent>;
  return (
    <SessionBootstrapGate>
      {(session) => (
        <FinancialMotionPreferenceProvider>
          {isCalculatorPopout ? <CalculatorPopoutChrome initialSession={session}>{children}</CalculatorPopoutChrome> : <AppChromeContent initialSession={session}>{children}</AppChromeContent>}
        </FinancialMotionPreferenceProvider>
      )}
    </SessionBootstrapGate>
  );
}

function CalculatorPopoutChrome({ children, initialSession }: { children: React.ReactNode; initialSession: FundManagerSession }) {
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="calculator-popout-shell" data-pd-id="calculator-popout.shell">
      <header className="calculator-popout-toolbar">
        <strong>Calculator</strong>
        <ThemeToggle />
      </header>
      <SessionInactivityGuard initialSession={initialSession} />
      <main className="calculator-popout-main" id="main-content">{children}</main>
    </div>
  </>;
}

function AppChromeContent({
  children,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialSession?: FundManagerSession | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/cookies" ||
    !isAuthenticatedApplicationPath(pathname ?? "");
  const resolvedProfileId = resolveProfileId(pathname ?? "");
  const activeProfileId = resolvedProfileId ?? defaultProfileId;
  const isInsideProfile = resolvedProfileId !== null;
  const [headerSummary, setHeaderSummary] = useState<HeaderSummaryState | null>(null);
  const [trackerMenuOpen, setTrackerMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedCommandProfileId, setSelectedCommandProfileId] = useState<string | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<ProfileHeaderRecord[]>([]);
  const [headerRefreshKey, setHeaderRefreshKey] = useState(0);
  const headerRequestIdRef = useRef(0);
  const unsavedPrompt = useUnsavedChangesPromptController();
  const trackerMenuRef = useRef<HTMLDivElement | null>(null);
  const trackerMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profileSearchRef = useRef<HTMLInputElement | null>(null);
  const appMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const unsavedKeepEditingRef = useRef<HTMLButtonElement | null>(null);
  const closeAppMenu = useCallback(() => setAppMenuOpen(false), []);
  const closeTrackerMenu = useCallback(() => {
    setTrackerMenuOpen(false);
    setProfileSearch("");
    setSelectedCommandProfileId(null);
    window.requestAnimationFrame(() => trackerMenuTriggerRef.current?.focus());
  }, []);
  const openTrackerMenu = useCallback(() => {
    setProfileSearch("");
    setSelectedCommandProfileId(isInsideProfile ? activeProfileId : null);
    setTrackerMenuOpen(true);
  }, [activeProfileId, isInsideProfile]);

  useEffect(() => {
    router.prefetch("/profiles");
    router.prefetch("/login");
  }, [router]);

  useEffect(() => {
    if (!isInsideProfile) {
      return;
    }

    for (const route of [
      "sportsbook-bets",
      "free-bets",
      "casino-offers",
      "each-way-extra-places",
      "cash-adjustments",
      "dashboard",
      "reports",
      "settings",
    ]) {
      router.prefetch(`/profiles/${activeProfileId}/tracker/${route}`);
    }
  }, [activeProfileId, isInsideProfile, router]);

  useEffect(() => {
    if (!unsavedPrompt.request) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      unsavedKeepEditingRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        unsavedPrompt.respond(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [unsavedPrompt]);

  useEffect(() => {
    const closeShellDrawersForConfirmation = () => {
      setAppMenuOpen(false);
      setTrackerMenuOpen(false);
      setProfileSearch("");
      setSelectedCommandProfileId(null);
    };
    window.addEventListener(APP_CONFIRMATION_OPEN_EVENT, closeShellDrawersForConfirmation);
    return () => {
      window.removeEventListener(APP_CONFIRMATION_OPEN_EVENT, closeShellDrawersForConfirmation);
    };
  }, []);

  useEffect(() => {
    const continueConfirmedNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ handled: boolean; href: string }>).detail;
      if (!detail?.href) return;
      const destination = new URL(detail.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      detail.handled = true;
      beginRouteTransition();
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    };
    window.addEventListener(APP_CONFIRMED_NAVIGATION_EVENT, continueConfirmedNavigation);
    return () => window.removeEventListener(APP_CONFIRMED_NAVIGATION_EVENT, continueConfirmedNavigation);
  }, [router]);

  useEffect(() => {
    if (isPublicAuthRoute) {
      return;
    }
    let isActive = true;
    const profilesUrl = `${apiBaseUrl}/profiles`;
    const cachedProfiles = readCachedJson<ProfileHeaderRecord[]>(profilesUrl);
    let cachedFrame: number | null = null;
    if (cachedProfiles) {
      cachedFrame = window.requestAnimationFrame(() => {
        if (!isActive) return;
        setActiveProfiles(
          cachedProfiles.filter((item) => (item.status ?? "active").trim().toLowerCase() !== "archived")
        );
      });
    }
    void fetchJsonAndCache<ProfileHeaderRecord[]>(profilesUrl)
      .then((profiles) => {
        if (!isActive) return;
        setActiveProfiles(
          profiles.filter((item) => (item.status ?? "active").trim().toLowerCase() !== "archived")
        );
      })
      .catch(() => {
        if (isActive) setActiveProfiles([]);
      });
    return () => {
      isActive = false;
      if (cachedFrame !== null) {
        window.cancelAnimationFrame(cachedFrame);
      }
    };
  }, [headerRefreshKey, isPublicAuthRoute]);

  useEffect(() => {
    const refreshHeaderForProfile = (event: Event) => {
      const detail = (event as CustomEvent<{ profileId?: string }>).detail;
      if (detail?.profileId && detail.profileId !== activeProfileId) return;
      setHeaderRefreshKey((current) => current + 1);
    };
    const refreshProfileDirectory = () => setHeaderRefreshKey((current) => current + 1);

    window.addEventListener(TRACKER_SETTINGS_UPDATED_EVENT, refreshHeaderForProfile);
    window.addEventListener(TRACKER_DATA_UPDATED_EVENT, refreshHeaderForProfile);
    window.addEventListener(PROFILE_DIRECTORY_UPDATED_EVENT, refreshProfileDirectory);
    return () => {
      window.removeEventListener(TRACKER_SETTINGS_UPDATED_EVENT, refreshHeaderForProfile);
      window.removeEventListener(TRACKER_DATA_UPDATED_EVENT, refreshHeaderForProfile);
      window.removeEventListener(PROFILE_DIRECTORY_UPDATED_EVENT, refreshProfileDirectory);
    };
  }, [activeProfileId]);

  useEffect(() => {
    const showUpdatingSummary = () => {
      if (!isInsideProfile) return;
      setHeaderSummary((current) => ({
        profileId: activeProfileId,
        profileName: current?.profileId === activeProfileId
          ? current.profileName
          : activeProfiles.find((profile) => profile.profile_id === activeProfileId)?.display_name ?? "Selected Profile",
        overallPnl: null,
        readState: "loading",
        profileRangeDetail: "Updating summary…",
        profileRangeLabel: "Updating summary…",
        profileSubtitle: "Updating summary…",
      }));
    };
    const showUpdateFailure = () => {
      if (!isInsideProfile) return;
      setHeaderSummary((current) => ({
        profileId: activeProfileId,
        profileName: current?.profileId === activeProfileId ? current.profileName : "Selected Profile",
        overallPnl: null,
        readState: "error",
        profileRangeDetail: "Summary update failed",
        profileRangeLabel: "Summary update failed",
        profileSubtitle: "Summary update failed",
      }));
    };
    window.addEventListener(TRACKER_SETTINGS_UPDATE_STARTED_EVENT, showUpdatingSummary);
    window.addEventListener(TRACKER_SETTINGS_UPDATE_FAILED_EVENT, showUpdateFailure);
    return () => {
      window.removeEventListener(TRACKER_SETTINGS_UPDATE_STARTED_EVENT, showUpdatingSummary);
      window.removeEventListener(TRACKER_SETTINGS_UPDATE_FAILED_EVENT, showUpdateFailure);
    };
  }, [activeProfileId, activeProfiles, isInsideProfile]);

  useEffect(() => {
    if (!isInsideProfile) {
      return;
    }

    const refreshHeader = () => setHeaderRefreshKey((current) => current + 1);
    const refreshVisibleHeader = () => {
      if (document.visibilityState === "visible") refreshHeader();
    };
    const interval = window.setInterval(refreshVisibleHeader, profileHeaderFallbackRefreshMs);
    window.addEventListener("focus", refreshHeader);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshHeader);
    };
  }, [isInsideProfile]);

  useEffect(() => {
    if (!isInsideProfile || !pathname) return;
    for (const profile of activeProfiles) {
      if (profile.profile_id === activeProfileId) continue;
      router.prefetch(
        pathname.replace(`/profiles/${activeProfileId}`, `/profiles/${profile.profile_id}`)
      );
    }
  }, [activeProfileId, activeProfiles, isInsideProfile, pathname, router]);

  useEffect(() => {
    if (!isInsideProfile) {
      return;
    }

    const controller = new AbortController();
    const requestId = ++headerRequestIdRef.current;
    const isCurrentRequest = () =>
      requestId === headerRequestIdRef.current && !controller.signal.aborted;
    const existingName = activeProfiles.find(
      (profile) => profile.profile_id === activeProfileId
    )?.display_name;
    let loadingFrame = window.requestAnimationFrame(() => {
      loadingFrame = 0;
      if (!isCurrentRequest()) return;
      setHeaderSummary((current) => ({
        profileId: activeProfileId,
        profileName: existingName ??
          (current?.profileId === activeProfileId ? current.profileName : "Selected Profile"),
        profileRangeDetail: "Updating summary…",
        profileRangeLabel: "Updating summary…",
        profileSubtitle: "Updating summary…",
        overallPnl: null,
        readState: "loading",
      }));
    });

    const loadHeader = async () => {
      const profileUrl = `${apiBaseUrl}/profiles/${activeProfileId}`;
      const [profile, sources] = await Promise.all([
        fetchJsonAndCache<ProfileHeaderRecord>(profileUrl, { signal: controller.signal }),
        fetchTrackerSummarySources(activeProfileId, { signal: controller.signal }),
      ]);
      if (!isCurrentRequest()) return;
      const settings = sources.trackerSettings;
        const resolvedRange = resolveDateRange({
          preset: settings.active_date_preset,
          customStart: settings.custom_start_date,
          customEnd: settings.custom_end_date,
          rangeBackDays: settings.range_back_days,
          rangeForwardDays: settings.range_forward_days,
        });
        const rangeLabel = formatResolvedDateRange(resolvedRange);
        const rangeDetail = formatResolvedDateRangeContext(resolvedRange);
      const summary = summarizeTrackerData(sources, resolvedRange, undefined, {
        mugBetFrequencyDays: settings.mug_bet_frequency_days,
        freeBetExpiryAlertWindowDays: settings.free_bet_expiry_alert_window_days,
        useGlobalDateRangeToggle: settings.use_global_date_range_toggle,
      });
      const overallPnl = summary.profitQuickView.overallPnl;
      if (loadingFrame) window.cancelAnimationFrame(loadingFrame);
      loadingFrame = 0;
      setHeaderSummary({
        profileId: activeProfileId,
        profileName: profile.display_name,
        profileRangeDetail: rangeDetail,
        profileRangeLabel: rangeLabel,
        profileSubtitle: rangeLabel,
        overallPnl: Number.isFinite(overallPnl) ? overallPnl : null,
        readState: Number.isFinite(overallPnl) ? "ready" : "unavailable",
      });
    };

    void loadHeader().catch((error: unknown) => {
      if (!isCurrentRequest() || (error instanceof DOMException && error.name === "AbortError")) return;
      if (loadingFrame) window.cancelAnimationFrame(loadingFrame);
      loadingFrame = 0;
      setHeaderSummary({
        profileId: activeProfileId,
        profileName: existingName ?? "Selected Profile",
        profileRangeDetail: "Header summary unavailable",
        profileRangeLabel: "Header summary unavailable",
        profileSubtitle: "Header summary unavailable",
        overallPnl: null,
        readState: "error",
      });
    });

    return () => {
      if (loadingFrame) window.cancelAnimationFrame(loadingFrame);
      controller.abort();
      if (headerRequestIdRef.current === requestId) headerRequestIdRef.current += 1;
    };
  }, [activeProfileId, activeProfiles, headerRefreshKey, isInsideProfile, pathname]);

  useEffect(() => {
    if (!trackerMenuOpen) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => profileSearchRef.current?.focus());

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (trackerMenuOpen && trackerMenuRef.current && !trackerMenuRef.current.contains(target)) {
        closeTrackerMenu();
      }

    };

    const handleScroll = () => {
      closeTrackerMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTrackerMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeTrackerMenu, trackerMenuOpen]);

  const profileName = !isInsideProfile
    ? platformBrand.name
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileName
      : "Loading profile...";
  const profileSubtitle = !isInsideProfile
    ? "Fund Manager dashboard"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileSubtitle
      : "Loading range and P&L...";
  const profileRangeLabel = !isInsideProfile
    ? "Fund Manager dashboard"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileRangeLabel
      : "Loading range and P&L...";
  const profileRangeDetail = !isInsideProfile
    ? "Fund Manager dashboard"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileRangeDetail
      : "Loading range and P&L...";
  const profileOverallPnl =
    isInsideProfile && headerSummary?.profileId === activeProfileId
      ? headerSummary.overallPnl
      : null;
  const profileSummaryLoading =
    isInsideProfile && (headerSummary?.profileId !== activeProfileId || headerSummary.readState === "loading");
  const profileSummaryUnavailable =
    isInsideProfile && headerSummary?.profileId === activeProfileId &&
    (headerSummary.readState === "error" || headerSummary.readState === "unavailable");
  const recentProfileName =
    activeProfiles.find((profile) => profile.profile_id === activeProfileId)?.display_name ??
    (headerSummary?.profileId === activeProfileId ? headerSummary.profileName : "");

  useEffect(() => {
    if (!isInsideProfile || !recentProfileName) return;
    recordRecentProfile(window.localStorage, {
      profileId: activeProfileId,
      displayName: recentProfileName,
    });
  }, [activeProfileId, isInsideProfile, recentProfileName]);

  const filteredActiveProfiles = activeProfiles.filter((profile) =>
    profile.display_name.toLocaleLowerCase().includes(profileSearch.trim().toLocaleLowerCase())
  );
  const trimmedProfileSearch = profileSearch.trim();
  const fallbackCurrentProfileOption =
    isInsideProfile && activeProfileId
      ? ({
          profile_id: activeProfileId,
          display_name: profileName,
          status: "active",
        } satisfies ProfileHeaderRecord)
      : null;
  const singleSearchProfile =
    trimmedProfileSearch && filteredActiveProfiles.length === 1 ? filteredActiveProfiles[0] : null;
  const currentProfileOption =
    isInsideProfile && activeProfileId
      ? activeProfiles.find((profile) => profile.profile_id === activeProfileId) ??
        fallbackCurrentProfileOption
      : null;
  const selectedProfileOption = selectedCommandProfileId
    ? activeProfiles.find((profile) => profile.profile_id === selectedCommandProfileId) ??
      (fallbackCurrentProfileOption?.profile_id === selectedCommandProfileId
        ? fallbackCurrentProfileOption
        : null)
      : null;
  const selectedCommandProfile =
    selectedProfileOption ??
    singleSearchProfile ??
    (!trimmedProfileSearch ? currentProfileOption : null) ??
    null;
  const commandProfileForRoutes = selectedCommandProfile ?? currentProfileOption ?? singleSearchProfile;

  const selectProfileInCommandMenu = (profileId: string) => {
    setSelectedCommandProfileId(profileId);
    if (profileId !== activeProfileId) {
      void navigateFromProfileCommand(resolveEquivalentProfileRoute(pathname, profileId));
    }
  };

  const navigateFromProfileCommand = async (href: string) => {
    if (!(await confirmUnsavedTrackerChanges())) return;
    setProfileSearch("");
    setSelectedCommandProfileId(null);
    setTrackerMenuOpen(false);
    beginRouteTransition();
    router.push(href);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-frame">
        {!isPublicAuthRoute ? <header className="top-app-bar" data-openforge-top-bar="" data-pd-id="app-shell.top-bar">
          <div className="brand-lockup">
            {!isPublicAuthRoute ? <div className="app-menu-shell">
              <button
                aria-expanded={appMenuOpen}
                aria-controls="app-navigation-drawer"
                aria-haspopup="dialog"
                aria-label="Open navigation drawer"
                className="icon-button app-navigation-drawer-trigger"
                data-pd-id="app-navigation.trigger"
                onClick={() => {
                  setTrackerMenuOpen(false);
                  setProfileSearch("");
                  setAppMenuOpen(true);
                }}
                ref={appMenuTriggerRef}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">menu</span>
              </button>
            </div> : null}
            <Link aria-label={`${platformBrand.name} home`} className="brand-mark" href={isPublicAuthRoute ? "/login" : "/"}>
              <BrandLogo priority variant="mark" />
            </Link>
            <div>
              <div className="brand-title">{platformBrand.name}</div>
            </div>
          </div>
          {!isPublicAuthRoute ? <GlobalSearch /> : <div aria-hidden="true" />}
          <div className="top-bar-actions">
            {!isPublicAuthRoute && isInsideProfile ? (
              <div className="app-menu-shell profile-summary-menu-shell" ref={trackerMenuRef}>
                <FinancialValueReplayGroup>
                <button
                  aria-busy={profileSummaryLoading}
                  aria-expanded={trackerMenuOpen}
                  aria-controls="profile-command-popover"
                  aria-haspopup="dialog"
                  aria-label={`Open profile navigation for ${profileName}. Total P&L for ${profileRangeLabel}. ${profileRangeDetail}`}
                  className="summary-menu-button"
                  data-pd-id="profile-command.trigger"
                  onClick={() => {
                    if (trackerMenuOpen) {
                      closeTrackerMenu();
                      return;
                    }
                    setSelectedCommandProfileId(activeProfileId ?? null);
                    openTrackerMenu();
                  }}
                  ref={trackerMenuTriggerRef}
                  title={`Total P&L for ${profileRangeLabel}. ${profileRangeDetail}`}
                  type="button"
                >
                  <span className="summary-menu-copy">
                    <strong>{profileName}</strong>
                    <span className="summary-menu-subtitle">
                      {profileSummaryLoading ? (
                        <>
                          <span aria-hidden="true" className="material-linear-progress summary-menu-loading-indicator"><span /></span>
                          <span>Updating summary…</span>
                        </>
                      ) : profileSummaryUnavailable ? (
                        <span>{headerSummary?.readState === "error" ? "Profile summary failed to load" : "Profile P&L unavailable"}</span>
                      ) : (
                        <span>Total P&amp;L for {profileRangeLabel}</span>
                      )}
                      {!profileSummaryLoading && typeof profileOverallPnl === "number" ? (
                        <>
                          <span aria-hidden="true" className="summary-menu-separator">•</span>
                          {profileOverallPnl === 0 ? (
                            <span
                              aria-label={`Total P&L for ${profileRangeLabel}: £ 0.00`}
                              className="financial-value financial-value-neutral summary-menu-financial-value"
                            >£ 0.00</span>
                          ) : (
                            <FinancialValue
                              className="summary-menu-financial-value"
                              label={`Total P&L for ${profileRangeLabel}`}
                              value={profileOverallPnl}
                            />
                          )}
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span aria-hidden="true" className="summary-menu-icon">
                    <span className="material-symbols-outlined">unfold_more</span>
                  </span>
                </button>
                </FinancialValueReplayGroup>
                <div
                  className={`app-menu-panel app-menu-panel-right profile-summary-menu-panel ${trackerMenuOpen ? "is-open" : ""}`}
                  aria-label="Profile navigation"
                  data-pd-id="profile-command.popover"
                  id="profile-command-popover"
                  role="dialog"
                >
                  <div className="profile-command-search-row">
                    <div className="profile-command-search-field" data-pd-id="profile-command.search-field">
                      <span aria-hidden="true" className="material-symbols-outlined">search</span>
                      <input
                        aria-label="Find profile"
                        data-pd-id="profile-command.search"
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setProfileSearch(nextValue);
                          if (!nextValue.trim()) {
                            setSelectedCommandProfileId(activeProfileId ?? null);
                          } else {
                            setSelectedCommandProfileId(null);
                          }
                        }}
                        placeholder="Find profile..."
                        ref={profileSearchRef}
                        type="search"
                        value={profileSearch}
                      />
                      <button
                        aria-label="Close profile navigation"
                        className="profile-command-escape-button"
                        data-pd-id="profile-command.close"
                        onClick={closeTrackerMenu}
                        type="button"
                      >
                        Esc
                      </button>
                    </div>
                  </div>
                  <div className="profile-command-profile-list" aria-label="Available profiles">
                    {filteredActiveProfiles.length > 0 ? (
                      filteredActiveProfiles.map((profile) => {
                        const isCurrentProfile = profile.profile_id === activeProfileId;
                        const isSelectedProfile =
                          selectedCommandProfile?.profile_id === profile.profile_id;
                        return (
                          <button
                            aria-current={isCurrentProfile ? "page" : undefined}
                            aria-label={
                              isCurrentProfile
                                ? `${profile.display_name}, current profile`
                                : `Select ${profile.display_name}`
                            }
                            className={`profile-command-profile-row${
                              isSelectedProfile ? " is-active" : ""
                            }`}
                            data-pd-id={`profile-command.profile.${profile.profile_id}`}
                            key={profile.profile_id}
                            onClick={() => selectProfileInCommandMenu(profile.profile_id)}
                            type="button"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">dashboard</span>
                            <span>{profile.display_name}</span>
                            {isSelectedProfile ? (
                              <span
                                aria-hidden="true"
                                className="material-symbols-outlined profile-command-check"
                              >
                                check
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="profile-command-empty">No active profiles match this search.</p>
                    )}
                  </div>
                  {commandProfileForRoutes ? (
                    <div
                      className="profile-summary-route-group"
                      aria-label={`${commandProfileForRoutes.display_name} tracker routes`}
                    >
                    {profileTrackerMenuRoutes.map((route) => {
                      const href = `/profiles/${commandProfileForRoutes.profile_id}/tracker/${route.href}`;
                      const isActive = pathname === href;

                      return (
                        <button
                          aria-current={isActive ? "location" : undefined}
                          className={`profile-command-route-card ${isActive ? "is-active" : ""}`}
                          data-pd-id={`profile-command.route.${route.href}`}
                          key={route.href}
                          onClick={() => void navigateFromProfileCommand(href)}
                          type="button"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined">{route.icon}</span>
                          <span>{route.title}</span>
                        </button>
                      );
                    })}
                    </div>
                  ) : null}
                  <div className="profile-command-footer">
                    <button
                      className="profile-command-add-action"
                      data-pd-id="profile-command.add-profile"
                      onClick={() => void navigateFromProfileCommand("/profiles/new")}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">add</span>
                      <span>Add profile</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {!isPublicAuthRoute ? <NotificationCentre /> : null}
            {!isPublicAuthRoute ? <BackLayThemeToggle /> : null}
            {!isPublicAuthRoute ? <FundManagerIdentityMenu /> : null}
            <ThemeToggle />
          </div>
          <Suspense fallback={null}><ShellLoadingProgress /></Suspense>
        </header> : null}
        {!isPublicAuthRoute ? <Suspense fallback={null}>
          <AppNavigationDrawer
            activeProfileId={activeProfileId}
            availableProfiles={activeProfiles}
            isInsideProfile={isInsideProfile}
            isOpen={appMenuOpen}
            onClose={closeAppMenu}
            profileName={profileName}
            profileSubtitle={profileSubtitle}
            triggerRef={appMenuTriggerRef}
          />
        </Suspense> : null}
        {!isPublicAuthRoute ? <SessionInactivityGuard initialSession={initialSession} /> : null}
        {!isPublicAuthRoute ? <ImportExecutionMonitor /> : null}
        <div className="main-shell" id="main-content">
          {children}
        </div>
      </div>
      {unsavedPrompt.request ? (
        <ModalBoundary onDismiss={() => unsavedPrompt.respond(false)}>
        <div
          className="modal-backdrop modal-backdrop-elevated unsaved-changes-backdrop"
          data-pd-id="unsaved-changes.backdrop"
          onClick={() => unsavedPrompt.respond(false)}
        >
          <section
            aria-label={unsavedPrompt.request.accessibleName}
            aria-modal="true"
            className="modal-panel unsaved-changes-dialog"
            data-navigation-href={unsavedPrompt.request.navigationHref}
            data-pd-id="unsaved-changes.dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="section-heading-row">
              <div>
                {unsavedPrompt.request.eyebrow ? (
                  <span className="eyebrow">{unsavedPrompt.request.eyebrow}</span>
                ) : null}
                <h2>{unsavedPrompt.request.title}</h2>
              </div>
              <button
                aria-label={`Close confirmation and ${unsavedPrompt.request.cancelLabel.toLocaleLowerCase()}`}
                className="dialog-close-button"
                data-pd-id="unsaved-changes.keep-editing-icon"
                onClick={() => unsavedPrompt.respond(false)}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </header>
            <p>{unsavedPrompt.request.message}</p>
            <footer className="workflow-editor-modal-footer">
              <button
                className="button-link"
                data-pd-id="unsaved-changes.keep-editing"
                onClick={() => unsavedPrompt.respond(false)}
                ref={unsavedKeepEditingRef}
                type="button"
              >
                {unsavedPrompt.request.cancelLabel}
              </button>
              {unsavedPrompt.request.onSaveAndClose ? (
                <button
                  className="review-chip review-chip-copy"
                  data-pd-id="unsaved-changes.save-and-close"
                  disabled={unsavedPrompt.isSaving}
                  onClick={() => {
                    const href = unsavedPrompt.request?.navigationHref;
                    void unsavedPrompt.saveAndRespond().then((saved) => {
                      if (saved && href) router.push(href);
                    });
                  }}
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">save</span>
                  <span>{unsavedPrompt.isSaving ? "Saving…" : "Save and close"}</span>
                </button>
              ) : null}
              {unsavedPrompt.request.navigationHref ? (
                <form action={unsavedPrompt.request.navigationHref} method="get">
                  <button
                    className="icon-button icon-button-destructive"
                    data-pd-confirmed-navigation="true"
                    data-pd-id="unsaved-changes.discard"
                    onPointerDown={() => {
                      const href = unsavedPrompt.request?.navigationHref;
                      unsavedPrompt.respond(true);
                      if (href) router.push(href);
                    }}
                    type="submit"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                    <span>{unsavedPrompt.request.confirmLabel}</span>
                  </button>
                </form>
              ) : (
                <button
                  className="icon-button icon-button-destructive"
                  data-pd-id="unsaved-changes.discard"
                  onClick={() => unsavedPrompt.respond(true)}
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                  <span>{unsavedPrompt.request.confirmLabel}</span>
                </button>
              )}
            </footer>
          </section>
        </div>
        </ModalBoundary>
      ) : null}
    </>
  );
}
