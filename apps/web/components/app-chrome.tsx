"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackLayThemeToggle } from "@/components/back-lay-theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiBaseUrl } from "@/lib/api";
import { platformBrand } from "@/lib/brand";
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
import { confirmUnsavedTrackerChanges } from "@/lib/use-unsaved-changes-guard";

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
  profileSubtitle: string;
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
  const trackerMenuRef = useRef<HTMLDivElement | null>(null);
  const appMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isInsideProfile) {
      return;
    }
    let isActive = true;
    void fetch(`${apiBaseUrl}/profiles`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load active profiles");
        return (await response.json()) as ProfileHeaderRecord[];
      })
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
      const [profileResponse, settingsResponse, sportsbookResponse, freeBetResponse, casinoResponse, cashResponse] =
        await Promise.all([
          fetch(`${apiBaseUrl}/profiles/${activeProfileId}`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/profiles/${activeProfileId}/tracker-settings`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/profiles/${activeProfileId}/sportsbook-bets`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/profiles/${activeProfileId}/free-bets`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/profiles/${activeProfileId}/casino-offers`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/profiles/${activeProfileId}/cash-adjustments`, { cache: "no-store" }),
        ]);

      if (
        !profileResponse.ok ||
        !settingsResponse.ok ||
        !sportsbookResponse.ok ||
        !freeBetResponse.ok ||
        !casinoResponse.ok ||
        !cashResponse.ok
      ) {
        throw new Error("Unable to load profile header summary");
      }

      const profile = (await profileResponse.json()) as ProfileHeaderRecord;
      const settings = (await settingsResponse.json()) as TrackerSettingsRecord;
      const sportsbookBets = (await sportsbookResponse.json()) as SportsbookSummaryRecord[];
      const freeBets = (await freeBetResponse.json()) as FreeBetSummaryRecord[];
      const casinoOffers = (await casinoResponse.json()) as CasinoSummaryRecord[];
      const cashAdjustments = (await cashResponse.json()) as CashAdjustmentSummaryRecord[];

      const resolvedRange = resolveDateRange({
        preset: settings.active_date_preset,
        customStart: settings.custom_start_date,
        customEnd: settings.custom_end_date,
        rangeBackDays: settings.range_back_days,
        rangeForwardDays: settings.range_forward_days,
      });

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

      setHeaderSummary({
        profileId: activeProfileId,
        profileName: profile.display_name,
        profileSubtitle: `${buildResolvedRangeLabel(
          resolvedRange.start,
          resolvedRange.end
        )} • ${formatMoney(summary.profitQuickView.overallPnl)}`,
      });
    };

    void loadHeader().catch(() => {
      if (!isActive) {
        return;
      }
      setHeaderSummary({
        profileId: activeProfileId,
        profileName: "Selected profile",
        profileSubtitle: "Header summary unavailable",
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeProfileId, isInsideProfile]);

  useEffect(() => {
    if (!trackerMenuOpen && !appMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (trackerMenuOpen && trackerMenuRef.current && !trackerMenuRef.current.contains(target)) {
        setTrackerMenuOpen(false);
        setProfileSwitchOpen(false);
      }

      if (appMenuOpen && appMenuRef.current && !appMenuRef.current.contains(target)) {
        setAppMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setTrackerMenuOpen(false);
      setAppMenuOpen(false);
      setProfileSwitchOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrackerMenuOpen(false);
        setAppMenuOpen(false);
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
  }, [appMenuOpen, trackerMenuOpen]);

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
  const brandSubtitle = "Local-first tracker";
  const otherActiveProfiles = activeProfiles.filter(
    (profile) => profile.profile_id !== activeProfileId
  );

  const switchToProfile = (profileId: string) => {
    if (!confirmUnsavedTrackerChanges()) return;
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
            <div className="app-menu-shell" ref={appMenuRef}>
              <button
                aria-expanded={appMenuOpen}
                aria-haspopup="menu"
                aria-label="Open navigation menu"
                className="icon-button"
                onClick={() => setAppMenuOpen((current) => !current)}
                type="button"
              >
                <span aria-hidden="true">≡</span>
              </button>
              <div className={`app-menu-panel ${appMenuOpen ? "is-open" : ""}`} role="menu">
                <Link className="nav-pill" href="/login" onClick={() => setAppMenuOpen(false)}>
                  Login
                </Link>
                <Link
                  aria-label="Profiles"
                  className="nav-pill"
                  data-pd-id="app-menu.profiles"
                  href="/profiles"
                  onClick={() => setAppMenuOpen(false)}
                >
                  Profiles
                </Link>
                <Link className="nav-pill" href="/settings" onClick={() => setAppMenuOpen(false)}>
                  Settings
                </Link>
                <Link
                  className="nav-pill"
                  href={`/profiles/${activeProfileId}/tracker/sportsbook-bets`}
                  onClick={() => setAppMenuOpen(false)}
                >
                  Tracker
                </Link>
              </div>
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
                    <span>{profileSubtitle}</span>
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
                      onClick={() => switchToProfile(otherActiveProfiles[0].profile_id)}
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
                            onClick={() => switchToProfile(profile.profile_id)}
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
            <BackLayThemeToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="main-shell" id="main-content">
          {children}
        </div>
      </div>
    </>
  );
}
