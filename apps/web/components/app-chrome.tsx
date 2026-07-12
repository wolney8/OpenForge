"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackLayThemeToggle } from "@/components/back-lay-theme-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiBaseUrl } from "@/lib/api";
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

const defaultProfileId = "profile-demo-001";

type ProfileHeaderRecord = {
  profile_id: string;
  display_name: string;
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
  const resolvedProfileId = resolveProfileId(pathname ?? "");
  const activeProfileId = resolvedProfileId ?? defaultProfileId;
  const isInsideProfile = resolvedProfileId !== null;
  const [headerSummary, setHeaderSummary] = useState<HeaderSummaryState | null>(null);
  const [trackerMenuOpen, setTrackerMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const trackerMenuRef = useRef<HTMLDivElement | null>(null);
  const appMenuRef = useRef<HTMLDivElement | null>(null);

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
      }

      if (appMenuOpen && appMenuRef.current && !appMenuRef.current.contains(target)) {
        setAppMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setTrackerMenuOpen(false);
      setAppMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrackerMenuOpen(false);
        setAppMenuOpen(false);
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
    ? "OpenForge"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileName
      : "Loading profile...";
  const profileSubtitle = !isInsideProfile
    ? "Local-first profile-scoped tracker"
    : headerSummary?.profileId === activeProfileId
      ? headerSummary.profileSubtitle
      : "Loading range and P&L...";
  const brandSubtitle = "Local-first tracker";

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-frame">
        <header className="top-app-bar" data-openforge-top-bar="">
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
                <Link className="nav-pill" href="/profiles" onClick={() => setAppMenuOpen(false)}>
                  Profiles
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
            <Link className="brand-mark" href="/">
              OF
            </Link>
            <div>
              <div className="brand-title">OpenForge</div>
              <div className="brand-subtitle">{brandSubtitle}</div>
            </div>
          </div>
          <div className="top-bar-actions">
            {isInsideProfile ? (
              <div className="app-menu-shell" ref={trackerMenuRef}>
                <button
                  aria-expanded={trackerMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile tracker menu"
                  className="summary-menu-button"
                  onClick={() => setTrackerMenuOpen((current) => !current)}
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
                  className={`app-menu-panel app-menu-panel-right ${trackerMenuOpen ? "is-open" : ""}`}
                  role="menu"
                >
                  {profileOverflowModules.map((route) => {
                    const href = `/profiles/${activeProfileId}/tracker/${route.href}`;
                    const isActive = pathname === href;

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`nav-pill ${isActive ? "is-active" : ""}`}
                        href={href}
                        key={route.href}
                        onClick={() => setTrackerMenuOpen(false)}
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
