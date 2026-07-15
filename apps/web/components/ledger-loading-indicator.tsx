type LedgerLoadingIndicatorProps = {
  label: string;
};

export function LedgerLoadingIndicator({ label }: LedgerLoadingIndicatorProps) {
  return (
    <div className="ledger-loading-overlay" role="status">
      <div className="ledger-loading-indicator">
        <span>{label}</span>
        <span aria-hidden="true" className="material-linear-progress">
          <span />
        </span>
      </div>
    </div>
  );
}
