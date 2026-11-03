type LedgerViewContextProps = {
  ledger: string;
  visibleRows: number;
  totalRows: number;
  activeControls: number;
  searchActive: boolean;
};

/** A compact readout for the flagged ledger presentation; the table remains authoritative. */
export function LedgerViewContext({ ledger, visibleRows, totalRows, activeControls, searchActive }: LedgerViewContextProps) {
  const qualifiers = [
    searchActive ? "Search Active" : null,
    activeControls > 0
      ? `${activeControls} Table ${activeControls === 1 ? "Control" : "Controls"} Active`
      : searchActive ? null : "Default View",
  ].filter(Boolean);

  return (
    <p className="ledger-view-context" data-pd-id={`${ledger}.view-context`}>
      <span>{visibleRows} of {totalRows} {totalRows === 1 ? "Row" : "Rows"}</span>
      <span aria-hidden="true"> · </span>
      <span>{qualifiers.join(" · ")}</span>
    </p>
  );
}
