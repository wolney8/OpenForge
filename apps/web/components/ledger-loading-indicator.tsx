type LedgerLoadingIndicatorProps = {
  label: string;
  dataPdId?: string;
};

export function LedgerLoadingIndicator({ label, dataPdId }: LedgerLoadingIndicatorProps) {
  return (
    <div className="ledger-loading-overlay" data-pd-id={dataPdId} role="status">
      <div className="ledger-loading-indicator">
        <span>{label}</span>
        <span aria-hidden="true" className="material-linear-progress">
          <span />
        </span>
      </div>
    </div>
  );
}
