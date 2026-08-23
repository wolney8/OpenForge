"use client";

import { type KeyboardEvent, type ReactNode } from "react";
import {
  getLedgerEditorTabBadgeLabel,
  getLedgerEditorTabStatusLabel,
  getNextLedgerEditorTabId,
  type LedgerEditorTabDefinition,
} from "@/lib/ledger-editor-tabs";

type LedgerEditorTabRailProps = {
  activeTabId: string;
  ariaLabel: string;
  guidedTargetTabId?: string | null;
  onActiveTabChange: (tabId: string) => void;
  tabs: LedgerEditorTabDefinition[];
};

export function LedgerEditorTabRail({
  activeTabId,
  ariaLabel,
  guidedTargetTabId = null,
  onActiveTabChange,
  tabs,
}: LedgerEditorTabRailProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const nextId = getNextLedgerEditorTabId(
      tabs,
      activeTabId,
      event.key === "ArrowRight" ? "next" : "previous"
    );
    onActiveTabChange(nextId);
  };

  return (
    <div
      aria-label={ariaLabel}
      className="ledger-editor-tab-rail"
      data-pd-id="ledger-editor.tabs"
      onKeyDown={handleKeyDown}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const isGuidedTarget = tab.id === guidedTargetTabId && !isActive;
        const badge = getLedgerEditorTabBadgeLabel(tab);
        const isLocked = tab.status === "locked";
        const attentionIcon =
          tab.attentionState === "overdue_settlement"
            ? "alarm"
            : tab.attentionState === "pending_settlement"
              ? "hourglass_top"
              : null;
        const attentionLabel =
          tab.attentionState === "overdue_settlement"
            ? "Settlement action is due"
            : tab.attentionState === "pending_settlement"
              ? "Settlement is pending"
              : null;
        return (
          <button
            aria-controls={`ledger-editor-panel-${tab.id}`}
            aria-disabled={isLocked}
            aria-label={getLedgerEditorTabStatusLabel(tab)}
            aria-selected={isActive}
            className={`ledger-editor-tab-button ledger-editor-tab-button-${tab.status} ledger-editor-tab-button-${tab.id}${
              isActive ? " is-active" : ""
            }${isGuidedTarget ? " is-guided-target" : ""}`}
            data-pd-id={`ledger-editor.tab.${tab.id}`}
            key={tab.id}
            onClick={() => {
              if (!isLocked) {
                onActiveTabChange(tab.id);
              }
            }}
            role="tab"
            tabIndex={isLocked ? -1 : isActive ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" className="ledger-editor-step-marker">
              {isLocked ? (
                <span className="material-symbols-outlined ledger-editor-step-lock">lock</span>
              ) : tab.status === "complete" ? (
                <span className="material-symbols-outlined ledger-editor-step-done">check</span>
              ) : (
                <span className="ledger-editor-step-index">{index + 1}</span>
              )}
            </span>
            <span className="ledger-editor-tab-copy">
              <span className="ledger-editor-tab-label">{tab.label}</span>
              {badge && tab.status !== "complete" ? (
                <span
                  aria-label={`${badge} action required`}
                  className="ledger-editor-tab-badge"
                  role="status"
                  title={`${badge} action required`}
                />
              ) : null}
            </span>
            {attentionIcon ? (
              <span
                aria-label={attentionLabel ?? undefined}
                className={`material-symbols-outlined ledger-editor-tab-attention ledger-editor-tab-attention-${tab.attentionState}`}
                role="status"
                title={attentionLabel ?? undefined}
              >
                {attentionIcon}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type LedgerEditorTabPanelProps = {
  activeTabId: string;
  children: ReactNode;
  tabId: string;
};

export function LedgerEditorTabPanel({
  activeTabId,
  children,
  tabId,
}: LedgerEditorTabPanelProps) {
  const isActive = tabId === activeTabId;

  return (
    <div
      aria-hidden={!isActive}
      className={`ledger-editor-tab-panel${isActive ? " is-active" : ""}`}
      data-pd-id={`ledger-editor.panel.${tabId}`}
      hidden={!isActive}
      id={`ledger-editor-panel-${tabId}`}
      inert={!isActive ? true : undefined}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
