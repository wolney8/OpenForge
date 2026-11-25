"use client";

import { usePathname } from "next/navigation";
import { TrackedTasksBanner } from "@/components/tracked-tasks-banner";

const ledgerModules = "accounts|sportsbook-bets|free-bets|casino-offers|each-way-extra-places|cash-adjustments";
const ledgerPath = new RegExp(`^/(?:tracker|profiles/[^/]+/tracker)/(?:${ledgerModules})(?:/|$)`);

/** Decide eligibility before mounting the banner or its annotation subscriptions. */
export function trackedBannerAllowedOnPath(pathname: string): boolean {
  return pathname !== "/design-lab"
    && !pathname.startsWith("/design-lab/")
    && !ledgerPath.test(pathname);
}

export function TrackedTasksBannerSlot() {
  const pathname = usePathname() ?? "";
  return trackedBannerAllowedOnPath(pathname) ? <TrackedTasksBanner /> : null;
}
