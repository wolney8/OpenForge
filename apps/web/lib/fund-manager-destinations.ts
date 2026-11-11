export type ShellDestination = {
  id: string;
  label: string;
  icon: string;
  group: "primary" | "tracker" | "more" | "launcher" | "context";
  parent?: "profiles" | "reports" | "settings";
  href: (profileId: string | null) => string | null;
};

const profileRoute = (module: string) => (profileId: string | null) =>
  profileId ? `/profiles/${encodeURIComponent(profileId)}/tracker/${module}` : null;
const combinedRoute = (module: string) => (profileId: string | null) =>
  profileId ? `/profiles/${encodeURIComponent(profileId)}/tracker/${module}` : `/tracker/${module}`;

// Route names and access are inherited from the existing Fund Manager shell. A null href
// means a Profile must be selected first; it must never silently pick a default Profile.
export const shellDestinations: ShellDestination[] = [
  { id: "position", label: "Position", icon: "space_dashboard", group: "primary", href: () => "/" },
  { id: "today", label: "Today", icon: "task_alt", group: "primary", href: () => "/tasks" },
  { id: "opportunities", label: "Opportunities", icon: "lightbulb", group: "primary", href: profileId => profileId ? `/opportunities?scope=${encodeURIComponent(profileId)}` : "/opportunities" },
  { id: "accounts", label: "Accounts", icon: "account_balance_wallet", group: "primary", href: combinedRoute("accounts") },
  { id: "sportsbook", label: "Sportsbook Bets", icon: "sports_soccer", group: "tracker", href: combinedRoute("sportsbook-bets") },
  { id: "free-bets", label: "Free Bets", icon: "award_star", group: "tracker", href: combinedRoute("free-bets") },
  { id: "casino", label: "Casino Offers", icon: "playing_cards", group: "tracker", href: combinedRoute("casino-offers") },
  { id: "extra-place", label: "Extra Place", icon: "chess_knight", group: "tracker", href: combinedRoute("each-way-extra-places") },
  { id: "cash", label: "Cash Adjustments", icon: "payments", group: "tracker", href: combinedRoute("cash-adjustments") },
  { id: "reports", label: "Reports", icon: "summarize", group: "primary", href: () => "/reports" },
  { id: "profiles", label: "Profiles", icon: "group", group: "more", href: () => "/profiles" },
  { id: "settings", label: "Settings", icon: "settings", group: "more", href: () => "/settings" },
  { id: "oddsmatcher", label: "Oddsmatcher", icon: "query_stats", group: "launcher", href: () => "/oddsmatcher" },
  { id: "calculators", label: "Calculators", icon: "calculate", group: "launcher", href: () => "/fund-manager/calculators" },
  { id: "subscribers", label: "Subscribers & Invitations", icon: "how_to_reg", group: "launcher", href: () => "/profiles/requests" },
  { id: "catalogue", label: "Account Catalogue", icon: "account_balance", group: "launcher", href: () => "/settings#catalogue" },
  { id: "administration", label: "Administration / Settings", icon: "settings", group: "launcher", href: () => "/settings" },
  { id: "recovery", label: "Recovery & Backups", icon: "restore", group: "launcher", href: () => "/profiles/restore" },
  { id: "profile-operations", label: "Profile Operations", icon: "space_dashboard", group: "context", parent: "profiles", href: profileRoute("dashboard") },
  { id: "profile-reports", label: "Profile Reports", icon: "summarize", group: "context", parent: "reports", href: profileRoute("reports") },
  { id: "profit-tracker", label: "Profit Tracker", icon: "monitoring", group: "context", parent: "reports", href: profileRoute("profit-tracker") },
  { id: "profile-settings", label: "Profile Settings", icon: "settings", group: "context", parent: "settings", href: profileRoute("settings") },
  { id: "notifications", label: "Notifications", icon: "notifications", group: "context", href: () => "/notifications" },
];

export function destinationForPath(pathname: string, hash = ""): ShellDestination | null {
  if (pathname === "/opportunities") return shellDestinations.find((item) => item.id === "opportunities") ?? null;
  if (pathname === "/tracker") return { id: "tracker", label: "Tracker", icon: "table_chart", group: "primary", href: () => "/tracker" };
  if (hash === "#profile-opportunities" && pathname === "/tracker/accounts") return shellDestinations.find((item) => item.id === "opportunities") ?? null;
  if (hash === "#profile-opportunities" && /^\/profiles\/[^/]+\/tracker\/accounts$/.test(pathname)) return shellDestinations.find((item) => item.id === "opportunities") ?? null;
  if (pathname === "/") return shellDestinations[0];
  if (pathname === "/tasks") return shellDestinations[1];
  if (pathname === "/notifications") return shellDestinations.find((item) => item.id === "notifications") ?? null;
  if (pathname === "/reports") return shellDestinations.find((item) => item.id === "reports") ?? null;
  if (pathname === "/profiles") return shellDestinations.find((item) => item.id === "profiles") ?? null;
  if (pathname === "/oddsmatcher") return shellDestinations.find((item) => item.id === "oddsmatcher") ?? null;
  if (pathname === "/fund-manager/calculators") return shellDestinations.find((item) => item.id === "calculators") ?? null;
  if (pathname === "/profiles/requests") return shellDestinations.find((item) => item.id === "subscribers") ?? null;
  if (pathname === "/profiles/restore") return shellDestinations.find((item) => item.id === "recovery") ?? null;
  if (pathname === "/settings") return shellDestinations.find((item) => item.id === "settings") ?? null;
  const modulePath = pathname.match(/^\/profiles\/[^/]+\/tracker\/([^/]+)/)?.[1];
  const combinedModulePath = pathname.match(/^\/tracker\/([^/]+)/)?.[1];
  if (combinedModulePath) return shellDestinations.find(item => item.group !== "launcher" && item.id !== "opportunities" && item.href(null)?.includes(`/tracker/${combinedModulePath}`)) ?? null;
  if (modulePath) return shellDestinations.find((item) => item.group !== "launcher" && item.id !== "opportunities" && item.href("__profile__")?.includes(`/tracker/${modulePath}`)) ?? null;
  return null;
}
