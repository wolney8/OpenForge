type LedgerAddRowButtonProps = {
  label: string;
  onClick: () => void;
};

export function LedgerAddRowButton({ label, onClick }: LedgerAddRowButtonProps) {
  return (
    <button
      aria-label={label}
      className="icon-button ledger-toolbar-add-action"
      onClick={onClick}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className="material-symbols-outlined">
        add
      </span>
    </button>
  );
}
