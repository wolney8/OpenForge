"use client";

import { useEffect, useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { resolveVisibleQuickActions, type ResolvedQuickAction } from "@/lib/quick-actions";

export type LedgerQuickAction = ResolvedQuickAction & {
  defaults: Record<string, string>;
  bookmaker: string;
  source: "fund_manager" | "profile";
};

type Props = {
  profileId: string;
  ledgerType: string;
  onSelect: (action: LedgerQuickAction) => void | Promise<void>;
};

/** Selection opens each ledger's existing editor; this component never writes a tracker row. */
export function LedgerQuickActions({ profileId, ledgerType, onSelect }: Props) {
  const [actions, setActions] = useState<LedgerQuickAction[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<LedgerQuickAction[]> : [])
      .then((records) => {
        setActions(records.filter((action) => action.ledger_type === ledgerType));
        setPage(0);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setActions([]);
      });
    return () => controller.abort();
  }, [ledgerType, profileId]);

  const pages = useMemo(() => {
    const ordered = resolveVisibleQuickActions(actions, ledgerType, Number.MAX_SAFE_INTEGER);
    return Array.from({ length: Math.ceil(ordered.length / 4) }, (_, index) => ordered.slice(index * 4, index * 4 + 4));
  }, [actions, ledgerType]);
  const visible = pages[page] ?? [];
  const blocked = actions.filter((action) => action.ledger_type === ledgerType && action.enabled && action.availability === "blocked");
  if (!visible.length && !blocked.length) return null;

  return <div className="extra-place-table-heading-controls ledger-quick-actions" data-pd-id={`ledger-quick-actions.${ledgerType.toLowerCase().replaceAll(" ", "-")}`}>
    <div aria-label={`${ledgerType} Quick Actions`} className="tracker-nav extra-place-loadouts" role="group">
      {visible.map((action) => <button aria-label={action.label} className="review-chip" key={`${action.source}:${action.preset_id}:${action.ledger_type}`} onClick={() => void onSelect(action)} title={action.label} type="button"><span className="ledger-quick-action-label">{action.label}</span></button>)}
      {blocked.map((action) => <span aria-label={`${action.label} unavailable: ${action.availability_reason}`} className="review-chip ledger-quick-action-blocked" key={`blocked:${action.source}:${action.preset_id}:${action.ledger_type}`} title={action.availability_reason}>{action.label} unavailable</span>)}
    </div>
    {pages.length > 1 ? <div aria-label="Quick Action carousel pages" className="ledger-quick-actions-navigation" role="group"><button aria-label="Previous Quick Actions" className="icon-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button><button aria-label="Next Quick Actions" className="icon-button" disabled={page >= pages.length - 1} onClick={() => setPage((current) => Math.min(pages.length - 1, current + 1))} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button></div> : null}
  </div>;
}
