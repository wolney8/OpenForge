"use client";

import { AccountProviderIdentity } from "@/components/account-provider-identity";
import { BookmakerIdentity } from "@/components/bookmaker-identity";
import { FinancialValue } from "@/components/financial-value";
import { LedgerValueCell } from "@/components/ledger-value-cell";
import { getSportsbookBackBetStatusBadge } from "@/lib/sportsbook-table-workflow";
import { freeBetBackBetStatus } from "@/lib/ledger-row-presentation";
import type { CombinedLedgerModule } from "@/lib/profile-scope";
import type { LedgerSourceRecord, PresentedLedgerCell } from "@/lib/combined-ledger-source";
import { findMasterAccountCatalogueEntry, type MasterAccountCatalogueRecord } from "@/lib/bookmaker-catalogue";

/** Reuses the native ledgers' existing chip, identity and financial-value primitives. */
export function CombinedLedgerCell({ module, column, row, cell, catalogue }: { module: CombinedLedgerModule; column: string; row: LedgerSourceRecord; cell: PresentedLedgerCell; catalogue: MasterAccountCatalogueRecord[] }) {
  if (cell.valueLabel) return <LedgerValueCell fallback="£ -" label={cell.valueLabel} value={cell.money ?? null} />;
  if (cell.money !== undefined) {
    if (cell.money === null) return <span aria-label="Unavailable financial value">£ -</span>;
    const financial = <FinancialValue className={module === "cash-adjustments" ? "ledger-financial-value" : undefined} value={cell.money} />;
    if (module === "accounts") return <span className="table-chip accounts-financial-chip">{financial}</span>;
    if (module === "each-way-extra-places") return <span className="extra-place-stake-value">{financial}</span>;
    return financial;
  }
  if (module === "accounts") {
    if (column === "account") return <span className="table-cell-stack accounts-provider-cell"><AccountProviderIdentity fallbackName={cell.text} provider={findMasterAccountCatalogueEntry(catalogue, { catalogueId: typeof row.catalogue_id === "string" ? row.catalogue_id : null, accountName: cell.text })} /></span>;
    if (column === "type") return <span className={`table-chip ${cell.text === "Exchange" ? "table-chip-info" : cell.text === "Bank" ? "table-chip-offer" : "table-chip-strategy-standard"}`}>{cell.text}</span>;
    if (column === "status") return <span className={`table-chip ${cell.text === "Active" ? "table-chip-lay-full" : ["Restricted", "Gubbed", "Inactive", "Bonus Restricted", "Limited"].includes(cell.text) ? "table-chip-danger" : ["Pending Sign Up", "Verification Pending"].includes(cell.text) ? "table-chip-lay-partial" : "table-chip-muted"}`}>{cell.text}</span>;
    if (column === "channel") return <span className="table-chip-stack table-chip-stack-centered">{cell.text.split(",").map(value => value.trim()).filter(Boolean).map(value => <span className="table-chip table-chip-info" key={value}>{value}</span>)}</span>;
  }
  if (module === "sportsbook-bets" || module === "free-bets") {
    if (column === "bookmaker") return <BookmakerIdentity bookmaker={cell.text} catalogue={catalogue} mode="Brand badge" />;
    if (column === "offer_details") return <span className="table-chip-stack table-chip-stack-centered">{cell.text === "—" ? cell.text : cell.text.split(" • ").map(value => <span className="table-chip" key={value}>{value}</span>)}</span>;
    if (column === "match_strategy") return <span className="table-chip">{cell.text}</span>;
    if (column === "lay_status") {
      const value = cell.text.toLowerCase();
      const label = value.includes("not laid") ? "Not Laid" : value.includes("partially") || value.includes("part laid") ? "Part Laid" : value.includes("fully") ? "Fully Laid" : cell.text;
      const tone = label === "Not Laid" ? "table-chip-muted" : label === "Part Laid" ? "table-chip-lay-partial" : label === "Fully Laid" ? "table-chip-back-placed" : "";
      return <span className={`table-chip ${tone}`.trim()}>{label}</span>;
    }
    if (column === "back_bet_status") {
      const status = String(row.status ?? "");
      const badge = module === "sportsbook-bets" ? getSportsbookBackBetStatusBadge({ status, result: String(row.result ?? "") }) : freeBetBackBetStatus({ status });
      const tone = badge.tone === "positive" ? "table-chip-back-placed" : badge.tone === "muted" ? "table-chip-muted" : module === "free-bets" ? "table-chip-lay-partial" : "table-chip-warning";
      return <span className={`table-chip ${tone}`}>{badge.label}</span>;
    }
    if (column === "status") {
      const value = cell.text.toLowerCase();
      const tone = value.includes("prospecting") || value.includes("not placed") || value.includes("not yet awarded") ? "table-chip-muted" : value.includes("free bet awarded") ? "table-chip-status-awarded" : value.includes("settled") ? "table-chip-status-settled" : value.includes("placed") ? "table-chip-status-placed" : value.includes("available") && module === "free-bets" ? "table-chip-lay-partial" : "";
      return <span className={`table-chip ${tone}`.trim()}>{cell.text}</span>;
    }
  }
  if (module === "casino-offers") {
    if (column === "bookmaker") return <BookmakerIdentity bookmaker={cell.text} catalogue={catalogue} mode="Brand badge" />;
    if (column === "offer_type" || column === "result") return <span className="table-chip">{cell.text}</span>;
    if (column === "status") {
      const value = cell.text.toLowerCase();
      const tone = value.includes("prospecting") ? "table-chip-muted" : value.includes("settled") ? "table-chip-status-settled" : value.includes("placed") || value.includes("active") ? "table-chip-status-placed" : "";
      return <span className={`table-chip ${tone}`.trim()}>{cell.text}</span>;
    }
  }
  if (module === "cash-adjustments" && ["direction", "adjustment_type", "affects_investment", "affects_cash_snapshot", "calculation_state"].includes(column)) return <span className="table-chip">{cell.text}</span>;
  return cell.text;
}
