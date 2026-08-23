"use client";

import { useMemo, useState } from "react";

export type CasinoFreeSpinsQuickAddValues = {
  bookmaker: string;
  offerName: string;
  game: string;
  spinCount: string;
  spinStake: string;
  convertedWin: string;
};

type CasinoFreeSpinsQuickAddProps = {
  bookmakerOptions: string[];
  errorMessage: string;
  isSaving: boolean;
  onClose: () => void;
  onMoreDetails: (values: CasinoFreeSpinsQuickAddValues) => void;
  onSave: (values: CasinoFreeSpinsQuickAddValues) => Promise<boolean>;
};

const moneyPattern = /^\d+(?:\.\d{0,2})?$/;
const countPattern = /^\d+$/;

function normaliseMoney(value: string): string {
  const trimmed = value.trim();
  if (!moneyPattern.test(trimmed)) {
    return value;
  }
  return Number(trimmed).toFixed(2);
}

export function CasinoFreeSpinsQuickAdd({
  bookmakerOptions,
  errorMessage,
  isSaving,
  onClose,
  onMoreDetails,
  onSave,
}: CasinoFreeSpinsQuickAddProps) {
  const [values, setValues] = useState<CasinoFreeSpinsQuickAddValues>({
    bookmaker: bookmakerOptions[0] ?? "",
    offerName: "Free Spins",
    game: "",
    spinCount: "10",
    spinStake: "0.10",
    convertedWin: "",
  });

  const validationMessage = useMemo(() => {
    if (!values.bookmaker) return "Choose a profile bookmaker to continue.";
    if (!countPattern.test(values.spinCount) || Number(values.spinCount) < 1) {
      return "Enter at least one free spin.";
    }
    if (!moneyPattern.test(values.spinStake) || Number(values.spinStake) <= 0) {
      return "Enter a spin stake using digits and a decimal point.";
    }
    if (!moneyPattern.test(values.convertedWin)) {
      return "Enter the converted win using digits and a decimal point.";
    }
    return "";
  }, [values]);

  function update(key: keyof CasinoFreeSpinsQuickAddValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (validationMessage || isSaving) return;
    const nextValues = {
      ...values,
      spinStake: normaliseMoney(values.spinStake),
      convertedWin: normaliseMoney(values.convertedWin),
    };
    const saved = await onSave(nextValues);
    if (saved) onClose();
  }

  return (
    <section
      aria-labelledby="casino-quick-add-title"
      aria-modal="true"
      className="content-panel stack modal-panel casino-quick-add-modal"
      data-pd-id="casino-quick-add.dialog"
      role="dialog"
    >
      <header className="modal-panel-header">
        <div>
          <span className="eyebrow">Quick Add</span>
          <h2 id="casino-quick-add-title">Free Spins</h2>
        </div>
        <button
          aria-label="Close Free Spins quick add"
          className="icon-button modal-close-button"
          data-pd-id="casino-quick-add.close"
          disabled={isSaving}
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
      </header>
      <p className="field-hint">Record a no-deposit free-spins result. Use the full editor for wagering or bonus offers.</p>
      <div className="form-grid casino-quick-add-grid">
        <label className="field-control">
          <span>Bookmaker</span>
          <select aria-label="Quick add Free Spins bookmaker" data-pd-id="casino-quick-add.bookmaker" onChange={(event) => update("bookmaker", event.target.value)} value={values.bookmaker}>
            <option value="">Select bookmaker</option>
            {bookmakerOptions.map((bookmaker) => <option key={bookmaker} value={bookmaker}>{bookmaker}</option>)}
          </select>
        </label>
        <label className="field-control">
          <span>Number Of Spins</span>
          <input aria-label="Quick add Free Spins number of spins" data-pd-id="casino-quick-add.spin-count" inputMode="numeric" onChange={(event) => update("spinCount", event.target.value.replace(/[^0-9]/g, ""))} value={values.spinCount} />
        </label>
        <label className="field-control">
          <span>Spin Stake</span>
          <input aria-label="Quick add Free Spins spin stake" data-pd-id="casino-quick-add.spin-stake" inputMode="decimal" onBlur={(event) => update("spinStake", normaliseMoney(event.target.value))} onChange={(event) => update("spinStake", event.target.value.replace(/[^0-9.]/g, ""))} value={values.spinStake} />
        </label>
        <label className="field-control">
          <span>Converted Win Amount</span>
          <input aria-label="Quick add Free Spins converted win amount" data-pd-id="casino-quick-add.converted-win" inputMode="decimal" onBlur={(event) => update("convertedWin", normaliseMoney(event.target.value))} onChange={(event) => update("convertedWin", event.target.value.replace(/[^0-9.]/g, ""))} value={values.convertedWin} />
          <button className="review-chip" onClick={() => update("convertedWin", "0.00")} type="button">£ 0.00</button>
        </label>
        <label className="field-control">
          <span>Offer Name <em>(Optional)</em></span>
          <input aria-label="Quick add Free Spins offer name" data-pd-id="casino-quick-add.offer-name" onChange={(event) => update("offerName", event.target.value)} value={values.offerName} />
        </label>
        <label className="field-control">
          <span>Game Or Slot <em>(Optional)</em></span>
          <input aria-label="Quick add Free Spins game or slot" data-pd-id="casino-quick-add.game" onChange={(event) => update("game", event.target.value)} value={values.game} />
        </label>
      </div>
      {validationMessage ? <p className="field-hint" role="status">{validationMessage}</p> : null}
      {errorMessage ? <p className="field-error" role="alert">{errorMessage}</p> : null}
      <footer className="modal-panel-footer casino-quick-add-footer">
        <button className="review-chip" disabled={isSaving} onClick={() => onMoreDetails(values)} type="button">More Details</button>
        <button className="modal-primary-button" data-pd-id="casino-quick-add.save" disabled={Boolean(validationMessage) || isSaving} onClick={() => void save()} type="button">
          {isSaving ? <span aria-hidden="true" className="material-symbols-outlined button-saving-spinner">progress_activity</span> : null}
          Save Free Spins
        </button>
      </footer>
    </section>
  );
}
