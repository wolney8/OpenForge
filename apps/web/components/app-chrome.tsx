"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppNavigationDrawer } from "@/components/app-navigation-drawer";
import { BackLayThemeToggle } from "@/components/back-lay-theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { FinancialValue } from "@/components/financial-value";
import { NotificationCentre } from "@/components/notification-centre";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiBaseUrl } from "@/lib/api";
import { platformBrand } from "@/lib/brand";
import {
  fetchJsonAndCache,
  readCachedJson,
  TRACKER_STALE_WHILE_REFRESH_MS,
} from "@/lib/client-json-cache";
import {
  formatMoney,
  resolveDateRange,
  summarizeTrackerData,
  type CashAdjustmentSummaryRecord,
  type CasinoSummaryRecord,
  type FreeBetSummaryRecord,
  type SportsbookSummaryRecord,
} from "@/lib/tracker-summary";
import { profileOverflowModules } from "@/lib/tracker-modules";
import {
  confirmUnsavedTrackerChanges,
  useUnsavedChangesPromptController,
} from "@/lib/use-unsaved-changes-guard";

const defaultProfileId = "profile-demo-001";

type ProfileHeaderRecord = {
  profile_id: string;
  display_name: string;
  status?: string;
};

type TrackerSettingsRecord = {
  active_date_preset:
    | "Today"
    | "Yesterday"
    | "This Week"
    | "Week (Mon-Sun)"
    | "Last Week"
    | "Past 7 Days"
    | "Past 8 Days"
    | "Fortnight"
    | "This Month"
    | "Last Month"
    | "Custom";
  custom_start_date: string;
  custom_end_date: string;
  range_back_days: number;
  range_forward_days: number;
  mug_bet_frequency_days: number;
};

type HeaderSummaryState = {
  profileId: string;
  profileName: string;
  profileRangeLabel: string;
  profileSubtitle: string;
  overallPnl: number | null;
};

function resolveProfileId(pathname: string): string | null {
  const match = pathname.match(/^\/profiles\/([^/]+)/);
  const profileId = match?.[1] ?? null;
  return profileId === "new" ? null : profileId;
}

function ordinalSuffix(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatHeaderDate(value: Date): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(value);
  const day = value.getDate();
  return `${weekday} ${day}${ordinalSuffix(day)}`;
}

function buildResolvedRangeLabel(start: Date, end: Date): string {
  return `${formatHeaderDate(start)} to ${formatHeaderDate(end)}`;
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedProfileId = resolveProfileId(pathname ?? "");
  const activeProfileId = resolvedProfileId ?? defaultProfileId;
  const isInsideProfile = resolvedProfileId !== null;
  const [headerSummary, setHeaderSummary] = useState<HeaderSummaryState | null>(null);
  const [trackerMenuOpen, setTrackerMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [profileSwitchOpen, setProfileSwitchOpen] = useState(false);
  const [activeProfiles, setActiveProfiles] = useState<ProfileHeaderRecord[]>([]);
  const unsavedPrompt = useUnsavedChangesPromptController();
  const trackerMenuRef = useRef<HTMLDivElement | null>(null);
  const appMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const unsavedKeepEditingRef = useRef<HTMLButtonElement | null>(null);
  const closeAppMenu = useCallback(() => setAppMenuOpen(false), []);

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
    if (!isInsideProfile) {
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
          cachedProfiles.filter((item) => (item.status ?? "active").trim().toLowerCase() === "active")
        );
      });
    }
    void fetchJsonAndCache<ProfileHeaderRecord[]>(profilesUrl)
      .then((profiles) => {
        if (!isActive) return;
        setActiveProfiles(
          profiles.filter((item) => (item.status ?? "active").trim().toLowerCase() === "active")
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
  }, [activeProfileId, isInsideProfile]);

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

    let isActive = true;

    const loadHeader = async () => {
      const profileUrl = `${apiBaseUrl}/profiles/${activeProfileId}`;
      const settingsUrl = `${apiBaseUrl}/profiles/${activeProfileId}/tracker-settings`;
      const sportsbookUrl = `${apiBaseUrl}/profiles/${activeProfileId}/sportsbook-bets`;
      const freeBetUrl = `${apiBaseUrl}/profiles/${activeProfileId}/free-bets`;
      const casinoUrl = `${apiBaseUrl}/profiles/${activeProfileId}/casino-offers`;
      const cashUrl = `${apiBaseUrl}/profiles/${activeProfileId}/cash-adjustments`;

      const cachedProfile = readCachedJson<ProfileHeaderRecord>(
        profileUrl,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      const cachedSettings = readCachedJson<TrackerSettingsRecord>(
        settingsUrl,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      const applyHeaderIdentity = (
        profile: ProfileHeaderRecord,
        settings: TrackerSettingsRecord,
        overallPnl: number | null
      ) => {
        const resolvedRange = resolveDateRange({
          preset: settings.active_date_preset,
          customStart: settings.custom_start_date,
          customEnd: settings.custom_end_date,
          rangeBackDays: settings.range_back_days,
          rangeForwardDays: settings.range_forward_days,
        });
        const rangeLabel = buildResolvedRangeLabel(resolvedRange.start, resolvedRange.end);

        setHeaderSummary({
          profileId: activeProfileId,
          profileName: profile.display_name,
          profileRangeLabel: rangeLabel,
          profileSubtitle:
            typeof overallPnl === "number"
              ? `${rangeLabel} • ${formatMoney(overallPnl)}`
              : rangeLabel,
          overallPnl,
        });

        return resolvedRange;
      };

      if (cachedProfile && cachedSettings && isActive) {
        applyHeaderIdentity(cachedProfile, cachedSettings, null);
      }

      const cachedSportsbookBets = readCachedJson<SportsbookSummaryRecord[]>(
        sportsbookUrl,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      const cachedFreeBets = readCachedJson<FreeBetSummaryRecord[]>(
        freeBetUrl,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      const cachedCasinoOffers = readCachedJson<CasinoSummaryRecord[]>(
        casinoUrl,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      const cachedCashAdjustments = readCachedJson<CashAdjustmentSummaryRecord[]>(
        cashUrl,
        TRACKER_STALE_WHILE_REFRESH_MS
      );

      if (
        cachedProfile &&
        cachedSettings &&
        cachedSportsbookBets &&
        cachedFreeBets &&
        cachedCasinoOffers &&
        cachedCashAdjustments
      ) {
        const cachedRange = resolveDateRange({
          preset: cachedSettings.active_date_preset,
          customStart: cachedSettings.custom_start_date,
          customEnd: cachedSettings.custom_end_date,
          rangeBackDays: cachedSettings.range_back_days,
          rangeForwardDays: cachedSettings.range_forward_days,
        });
        const cachedSummary = summarizeTrackerData(
          {
            accounts: [],
            sportsbookBets: cachedSportsbookBets,
            freeBets: cachedFreeBets,
            casinoOffers: cachedCasinoOffers,
            cashAdjustments: cachedCashAdjustments,
          },
          cachedRange,
          undefined,
          {
            mugBetFrequencyDays: cachedSettings.mug_bet_frequency_days,
          }
        );

        if (isActive) {
          applyHeaderIdentity(
            cachedProfile,
            cachedSettings,
            cachedSummary.profitQuickView.overallPnl
          );
        }
      }

      const [profile, settings] = await Promise.all([
        fetchJsonAndCache<ProfileHeaderRecord>(profileUrl),
        fetchJsonAndCache<TrackerSettingsRecord>(settingsUrl),
      ]);

      if (!isActive) {
        return;
      }

      const resolvedRange = applyHeaderIdentity(profile, settings, null);

      const [sportsbookBets, freeBets, casinoOffers, cashAdjustments] = await Promise.all([
        fetchJsonAndCache<SportsbookSummaryRecord[]>(sportsbookUrl),
        fetchJsonAndCache<FreeBetSummaryRecord[]>(freeBetUrl),
        fetchJsonAndCache<CasinoSummaryRecord[]>(casinoUrl),
        fetchJsonAndCache<CashAdjustmentSummaryRecord[]>(cashUrl),
      ]);

      const summary = summarizeTrackerData(
        {
          accounts: [],
          sportsbookBets,
          freeBets,
          casinoOffers,
          cashAdjustments,
        },
        resolvedRange,
        undefined,
        {
          mugBetFrequencyDays: settings.mug_bet_frequency_days,
        }
      );

      if (!isActive) {
        return;
      }

      applyHeaderIdentity(profile, settings, summary.profitQuickView.overallPnl);
    };

    void loadHeader().catch(() => {
      if (!isActive) {
        return;
      }
      setHeaderSummary({
        profileId: activeProfileId,
        profileName: "Selected profile",
        profileRangeLabel: "Header summary unavailable",
        profileSubtitle: "Header summary unavailable",
        overallPnl: null,
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeProfileId, isInsideProfile]);

  useEffect(() => {
    if (!trackerMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (trackerMenuOpen && trackerMenuRef.current && !trackerMenuRef.current.contains(target)) {
        setTrackerMenuOpen(false);
        setProfileSwitchOpen(false);
      }

    };

    const handleScroll = () => {
      setTrackerMenuOpen(false);
      setProfileSwitchOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrackerMenuOpen(false);
        setProfileSwitchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [trackerMenuOpen]);

  const profileName = !isInsideProfile
    ? platformBrand.name
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileName
      : "Loading profile...";
  const profileSubtitle = !isInsideProfile
    ? "Local-first profile-scoped tracker"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileSubtitle
      : "Loading range and P&L...";
  const profileRangeLabel = !isInsideProfile
    ? "Local-first profile-scoped tracker"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileRangeLabel
      : "Loading range and P&L...";
  const profileOverallPnl =
    isInsideProfile && headerSummary?.profileId === activeProfileId
      ? headerSummary.overallPnl
      : null;
  const brandSubtitle = "Local-first tracker";
  const otherActiveProfiles = activeProfiles.filter(
    (profile) => profile.profile_id !== activeProfileId
  );

  const switchToProfile = async (profileId: string) => {
    if (!(await confirmUnsavedTrackerChanges())) return;
    const nextPath = (pathname ?? "/profiles").replace(
      `/profiles/${activeProfileId}`,
      `/profiles/${profileId}`
    );
    const query = typeof window === "undefined" ? "" : window.location.search;
    setProfileSwitchOpen(false);
    setTrackerMenuOpen(false);
    router.push(`${nextPath}${query}`);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-frame">
        <header className="top-app-bar" data-openforge-top-bar="" data-pd-id="app-shell.top-bar">
          <div className="brand-lockup">
            <div className="app-menu-shell">
              <button
                aria-expanded={appMenuOpen}
                aria-controls="app-navigation-drawer"
                aria-haspopup="dialog"
                aria-label="Open navigation drawer"
                className="icon-button app-navigation-drawer-trigger"
                data-pd-id="app-navigation.trigger"
                onClick={() => {
                  setTrackerMenuOpen(false);
                  setProfileSwitchOpen(false);
                  setAppMenuOpen(true);
                }}
                ref={appMenuTriggerRef}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">menu</span>
              </button>
            </div>
            <Link aria-label={`${platformBrand.name} home`} className="brand-mark" href="/">
              <BrandLogo priority variant="mark" />
            </Link>
            <div>
              <div className="brand-title">{platformBrand.name}</div>
              <div className="brand-subtitle">{brandSubtitle}</div>
            </div>
          </div>
          <div className="top-bar-actions">
            {isInsideProfile ? (
              <div className="app-menu-shell profile-summary-menu-shell" ref={trackerMenuRef}>
                <button
                  aria-expanded={trackerMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile tracker menu"
                  className="summary-menu-button"
                  onClick={() =>
                    setTrackerMenuOpen((current) => {
                      if (current) setProfileSwitchOpen(false);
                      return !current;
                    })
                  }
                  type="button"
                >
                  <span className="summary-menu-copy">
                    <strong>{profileName}</strong>
                    <span className="summary-menu-subtitle">
                      <span>{profileRangeLabel}</span>
                      {typeof profileOverallPnl === "number" ? (
                        <>
                          <span aria-hidden="true" className="summary-menu-separator">•</span>
                          <FinancialValue
                            animate={false}
                            className="summary-menu-financial-value"
                            label={`${profileName} overall P&L`}
                            value={profileOverallPnl}
                          />
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span aria-hidden="true" className="summary-menu-icon">
                    ⋯
                  </span>
                </button>
                <div
                  className={`app-menu-panel app-menu-panel-right profile-summary-menu-panel ${trackerMenuOpen ? "is-open" : ""}`}
                  role="menu"
                >
                  {otherActiveProfiles.length === 1 ? (
                    <button
                      aria-label={`Switch to ${otherActiveProfiles[0].display_name} in the current tracker section`}
                      className="nav-pill profile-switch-action"
                      data-pd-id="profile-menu.switch"
                      onClick={() => void switchToProfile(otherActiveProfiles[0].profile_id)}
                      role="menuitem"
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">swap_horiz</span>
                      <span>Switch</span>
                    </button>
                  ) : otherActiveProfiles.length > 1 ? (
                    <div className="profile-switch-group">
                      <button
                        aria-expanded={profileSwitchOpen}
                        aria-label="Choose an active profile and keep the current tracker section"
                        className="nav-pill profile-switch-action"
                        data-pd-id="profile-menu.switch"
                        onClick={() => setProfileSwitchOpen((current) => !current)}
                        role="menuitem"
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">swap_horiz</span>
                        <span>Switch</span>
                      </button>
                      <div className={`profile-switch-list${profileSwitchOpen ? " is-open" : ""}`}>
                        {otherActiveProfiles.map((profile) => (
                          <button
                            className="nav-pill"
                            key={profile.profile_id}
                            onClick={() => void switchToProfile(profile.profile_id)}
                            role="menuitem"
                            type="button"
                          >
                            {profile.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {profileOverflowModules.map((route) => {
                    const href = `/profiles/${activeProfileId}/tracker/${route.href}`;
                    const isActive = pathname === href;

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`nav-pill ${isActive ? "is-active" : ""}`}
                        href={href}
                        key={route.href}
                        onClick={() => {
                          setTrackerMenuOpen(false);
                          setProfileSwitchOpen(false);
                        }}
                      >
                        {route.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <NotificationCentre />
            <BackLayThemeToggle />
            <ThemeToggle />
          </div>
        </header>
        <AppNavigationDrawer
          activeProfileId={activeProfileId}
          isInsideProfile={isInsideProfile}
          isOpen={appMenuOpen}
          onClose={closeAppMenu}
          profileName={profileName}
          profileSubtitle={profileSubtitle}
          triggerRef={appMenuTriggerRef}
        />
        <div className="main-shell" id="main-content">
          {children}
        </div>
      </div>
      {unsavedPrompt.request ? (
        <div
          className="modal-backdrop modal-backdrop-elevated unsaved-changes-backdrop"
          data-pd-id="unsaved-changes.backdrop"
          onClick={() => unsavedPrompt.respond(false)}
        >
          <section
            aria-label={unsavedPrompt.request.accessibleName}
            aria-modal="true"
            className="modal-panel unsaved-changes-dialog"
            data-pd-id="unsaved-changes.dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="section-heading-row">
              <div>
                <span className="eyebrow">{unsavedPrompt.request.eyebrow}</span>
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
              <button
                className="icon-button icon-button-destructive"
                data-pd-id="unsaved-changes.discard"
                onClick={() => unsavedPrompt.respond(true)}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                <span>{unsavedPrompt.request.confirmLabel}</span>
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
