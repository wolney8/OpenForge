/** Presentation of values already returned by the Profile-owned read authority. */
export type CurrentFinalSource = {
  projected_current_pnl?: string | null;
  final_net_pnl?: string | null;
  reporting_value?: string | null;
};

export function displayedCurrentFinalValue(row: CurrentFinalSource): string {
  return row.reporting_value ?? row.final_net_pnl ?? row.projected_current_pnl ?? "—";
}

export function currentFinalValueLabel(row: CurrentFinalSource): string {
  return row.final_net_pnl ? "Final value" : "Current value";
}

export type CasinoValueSource = {
  resolved_net_pnl?: string | null;
  final_net_pnl?: string | null;
  calc_net_pnl?: string | null;
};

export function displayedCasinoValue(row: CasinoValueSource): string {
  return row.resolved_net_pnl ?? row.final_net_pnl ?? row.calc_net_pnl ?? "—";
}

export function casinoValueLabel(row: CasinoValueSource): string {
  if (row.final_net_pnl) return "Net result";
  if (row.calc_net_pnl) return "Reference net value";
  return "Resolved value";
}

/** A strict display parse; an invalid or absent source remains unavailable. */
export function sourceMoneyNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const source = String(value).trim();
  if (!/^[+-]?(?:\d+)(?:\.\d+)?$/.test(source)) return null;
  const number = Number(source);
  return Number.isFinite(number) ? number : null;
}

export function formatUkLedgerDateTime(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  const candidate = normalized.includes("T") ? normalized : normalized.replace(" ", "T");
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(parsed);
}

export function formatSportsbookSettlesDate(value: string, range?: { start: Date; end: Date }): string {
  if (!value.trim()) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  const time = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  const includeFullDate = !range || Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000) > 31 || date.getFullYear() !== range.start.getFullYear() || date.getFullYear() !== range.end.getFullYear();
  if (includeFullDate) {
    const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
    return `${dayName} ${day}${suffix} ${month} ${date.getFullYear()} ${time}`;
  }
  return `${dayName} ${day}${suffix} ${time}`;
}

export function compactLedgerLabel(value: string): string {
  switch (value.trim()) {
    case "Double Delight / Hat-trick Heaven": return "DDHH";
    case "Multilay": return "Multi Lay";
    case "Multilay-Underlay": return "Multi Lay Underlay";
    case "Back Bet Placed": return "Back Placed";
    default: return value.trim();
  }
}

export function offerDetails(row: { offer_type: string; fixture_type: string; bet_type: string; retention_mode?: string }, freeBet = false): string {
  const values = [row.offer_type, row.fixture_type, row.bet_type, ...(freeBet ? [row.retention_mode ?? ""] : [])];
  const detail = values.map(compactLedgerLabel).filter(Boolean).join(" • ");
  return detail || "—";
}

export function freeBetBackBetStatus(row: { status: string }): { label: string; tone: "muted" | "positive" | "warning" } {
  if (row.status === "Prospecting" || row.status === "Not Yet Awarded") return { label: "Not Placed", tone: "muted" };
  if (row.status === "Available") return { label: "Awarded", tone: "warning" };
  return { label: "Back Placed", tone: "positive" };
}
