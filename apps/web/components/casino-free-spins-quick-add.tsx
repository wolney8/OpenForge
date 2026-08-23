"use client";

import { useMemo, useState } from "react";
import { FinancialTextInput } from "@/components/financial-text-input";
import { findBookmakerCatalogueEntry, type BookmakerCatalogueRecord } from "@/lib/bookmaker-catalogue";

export type CasinoFreeSpinsQuickAddValues = {
  bookmaker: string;
  offerName: string;
  game: string;
  spinCount: string;
  spinStake: string;
  convertedWin: string;
};

export type CasinoQuickAddLoadout = {
  preset_id: string;
  label: string;
  defaults: Partial<CasinoFreeSpinsQuickAddValues>;
  bookmaker: string;
  availability: "eligible" | "limited" | "blocked";
  availability_reason: string;
};

type CasinoFreeSpinsQuickAddProps = {
  bookmakerOptions: string[];
  bookmakerCatalogue: BookmakerCatalogueRecord[];
  errorMessage: string;
  initialValues?: CasinoFreeSpinsQuickAddValues | null;
  isSaving: boolean;
  loadouts?: CasinoQuickAddLoadout[];
  onClose: () => void;
  onMoreDetails: (values: CasinoFreeSpinsQuickAddValues) => void;
  onSave: (values: CasinoFreeSpinsQuickAddValues) => Promise<boolean>;
  profileId: string;
};

type QuickAddUsage = Record<"bookmaker" | "spinCount" | "spinStake" | "convertedWin" | "game", Record<string, number>>;

const moneyPattern = /^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
const countPattern = /^\d+$/;
const emptyUsage: QuickAddUsage = { bookmaker: {}, spinCount: {}, spinStake: {}, convertedWin: {}, game: {} };

function normaliseMoney(value: string): string {
  const trimmed = value.trim().replace(/^-?\./, (match) => match.startsWith("-") ? "-0." : "0.");
  if (!moneyPattern.test(trimmed)) {
    return value;
  }
  return Number(trimmed).toFixed(2);
}

function sanitiseMoneyInput(value: string, allowNegative: boolean): string {
  const cleaned = value.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, "");
  const sign = allowNegative && cleaned.startsWith("-") ? "-" : "";
  const digits = cleaned.replace(/-/g, "");
  const [whole = "", ...fractionParts] = digits.split(".");
  const fraction = fractionParts.join("").slice(0, 2);
  return `${sign}${whole}${fractionParts.length ? `.${fraction}` : ""}`;
}

function financialState(value: string): "positive" | "negative" | "neutral" {
  if (!moneyPattern.test(value)) return "neutral";
  const numericValue = Number(value);
  if (numericValue > 0) return "positive";
  if (numericValue < 0) return "negative";
  return "neutral";
}

function getInitialValues(values?: CasinoFreeSpinsQuickAddValues | null): CasinoFreeSpinsQuickAddValues {
  return values ?? {
    bookmaker: "",
    offerName: "Free Spins",
    game: "",
    spinCount: "10",
    spinStake: "0.10",
    convertedWin: "",
  };
}

function usageKey(profileId: string) {
  return `plum-duff:casino-free-spins-quick-add:${profileId}`;
}

function readUsage(profileId: string): QuickAddUsage {
  try {
    const stored = window.localStorage.getItem(usageKey(profileId));
    if (!stored) return emptyUsage;
    const parsed = JSON.parse(stored) as Partial<QuickAddUsage>;
    return {
      bookmaker: parsed.bookmaker ?? {},
      spinCount: parsed.spinCount ?? {},
      spinStake: parsed.spinStake ?? {},
      convertedWin: parsed.convertedWin ?? {},
      game: parsed.game ?? {},
    };
  } catch {
    return emptyUsage;
  }
}

function getChipValues(usage: Record<string, number>, defaults: string[]) {
  return [...new Set([
    ...Object.entries(usage).sort(([, left], [, right]) => right - left).map(([value]) => value),
    ...defaults,
  ])].slice(0, 4);
}

export function CasinoFreeSpinsQuickAdd({
  bookmakerOptions,
  bookmakerCatalogue,
  errorMessage,
  initialValues,
  isSaving,
  loadouts = [],
  onClose,
  onMoreDetails,
  onSave,
  profileId,
}: CasinoFreeSpinsQuickAddProps) {
  const [values, setValues] = useState<CasinoFreeSpinsQuickAddValues>(() => ({
    ...getInitialValues(initialValues),
    bookmaker: initialValues?.bookmaker || bookmakerOptions[0] || "",
  }));
  const [usage, setUsage] = useState<QuickAddUsage>(() =>
    typeof window === "undefined" ? emptyUsage : readUsage(profileId)
  );
  const effectiveBookmaker = values.bookmaker || bookmakerOptions[0] || "";
  const effectiveValues = { ...values, bookmaker: effectiveBookmaker };
  const quickPresets = useMemo(() => loadouts.map((loadout) => ({
    ...loadout,
    values: {
      ...getInitialValues(),
      ...loadout.defaults,
      bookmaker: loadout.bookmaker || loadout.defaults.bookmaker || "",
    },
  })), [loadouts]);

  const validationMessage = useMemo(() => {
    if (!effectiveBookmaker) return "Choose a profile bookmaker to continue.";
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
  }, [effectiveBookmaker, values.convertedWin, values.spinCount, values.spinStake]);

  function update(key: keyof CasinoFreeSpinsQuickAddValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (validationMessage || isSaving) return;
    const nextValues = {
      ...effectiveValues,
      spinStake: normaliseMoney(values.spinStake),
      convertedWin: normaliseMoney(values.convertedWin),
    };
    const saved = await onSave(nextValues);
    if (saved) {
      const nextUsage: QuickAddUsage = {
        bookmaker: { ...usage.bookmaker, [nextValues.bookmaker]: (usage.bookmaker[nextValues.bookmaker] ?? 0) + 1 },
        spinCount: { ...usage.spinCount, [nextValues.spinCount]: (usage.spinCount[nextValues.spinCount] ?? 0) + 1 },
        spinStake: { ...usage.spinStake, [nextValues.spinStake]: (usage.spinStake[nextValues.spinStake] ?? 0) + 1 },
        convertedWin: { ...usage.convertedWin, [nextValues.convertedWin]: (usage.convertedWin[nextValues.convertedWin] ?? 0) + 1 },
        game: nextValues.game.trim()
          ? { ...usage.game, [nextValues.game.trim()]: (usage.game[nextValues.game.trim()] ?? 0) + 1 }
          : usage.game,
      };
      window.localStorage.setItem(usageKey(profileId), JSON.stringify(nextUsage));
      setUsage(nextUsage);
      onClose();
    }
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
      {quickPresets.length ? (
        <div aria-label="Free Spins quick presets" className="casino-quick-add-presets" data-pd-id="casino-quick-add.presets">
          {quickPresets.map((preset) => (
            <button
              aria-pressed={values.bookmaker === preset.values.bookmaker && values.offerName === preset.values.offerName && values.spinCount === preset.values.spinCount && normaliseMoney(values.spinStake) === preset.values.spinStake}
              className="review-chip casino-quick-add-chip casino-quick-add-preset"
              key={preset.label}
              disabled={preset.availability === "blocked"}
              onClick={() => setValues(preset.values)}
              title={preset.availability_reason || undefined}
              type="button"
            >
              {preset.label}{preset.availability === "limited" ? " (Limited)" : ""}
            </button>
          ))}
        </div>
      ) : null}
      <div className="form-grid casino-quick-add-grid">
        <label className="field-control">
          <span>Bookmaker</span>
          <select aria-label="Quick add Free Spins bookmaker" data-pd-id="casino-quick-add.bookmaker" onChange={(event) => update("bookmaker", event.target.value)} value={effectiveBookmaker}>
            <option value="">Select bookmaker</option>
            {bookmakerOptions.map((bookmaker) => <option key={bookmaker} value={bookmaker}>{bookmaker}</option>)}
          </select>
          <span className="casino-quick-add-chip-row" data-pd-id="casino-quick-add.bookmaker-chips">
            {getChipValues(usage.bookmaker, bookmakerOptions).map((bookmaker) => {
              const catalogueEntry = findBookmakerCatalogueEntry(bookmakerCatalogue, bookmaker);
              return (
                <button
                  aria-pressed={effectiveBookmaker === bookmaker}
                  className="review-chip casino-quick-add-chip casino-quick-add-bookmaker-chip"
                  key={bookmaker}
                  onClick={() => update("bookmaker", bookmaker)}
                  style={catalogueEntry ? { backgroundColor: catalogueEntry.background_colour, color: catalogueEntry.foreground_colour } : undefined}
                  type="button"
                >
                  {catalogueEntry?.brand_name ?? bookmaker}
                </button>
              );
            })}
          </span>
        </label>
        <label className="field-control">
          <span>Number Of Spins</span>
          <input aria-label="Quick add Free Spins number of spins" data-pd-id="casino-quick-add.spin-count" inputMode="numeric" onChange={(event) => update("spinCount", event.target.value.replace(/[^0-9]/g, ""))} value={values.spinCount} />
          <span className="casino-quick-add-chip-row" data-pd-id="casino-quick-add.spin-count-chips">
            {getChipValues(usage.spinCount, ["1", "4", "5", "10"]).map((spinCount) => <button aria-pressed={values.spinCount === spinCount} className="review-chip casino-quick-add-chip" key={spinCount} onClick={() => update("spinCount", spinCount)} type="button">{spinCount} spins</button>)}
          </span>
        </label>
        <div className="field-control casino-quick-add-financial-field">
          <label htmlFor="casino-quick-add-spin-stake">Spin Stake</label>
          <FinancialTextInput ariaLabel="Quick add Free Spins spin stake" dataPdId="casino-quick-add.spin-stake" id="casino-quick-add-spin-stake" onBlur={() => update("spinStake", normaliseMoney(values.spinStake))} onChange={(value) => update("spinStake", sanitiseMoneyInput(value, false))} value={values.spinStake} />
          <span className="casino-quick-add-chip-row" data-pd-id="casino-quick-add.spin-stake-chips">
            {getChipValues(usage.spinStake, ["0.10", "0.20", "0.50"]).map((spinStake) => <button aria-pressed={normaliseMoney(values.spinStake) === normaliseMoney(spinStake)} className="review-chip casino-quick-add-chip" key={spinStake} onClick={() => update("spinStake", spinStake)} type="button">£ {normaliseMoney(spinStake)}</button>)}
          </span>
        </div>
        <div className="field-control casino-quick-add-financial-field">
          <label htmlFor="casino-quick-add-converted-win">Converted Win Amount</label>
          <FinancialTextInput ariaLabel="Quick add Free Spins converted win amount" dataPdId="casino-quick-add.converted-win" id="casino-quick-add-converted-win" onBlur={() => update("convertedWin", normaliseMoney(values.convertedWin))} onChange={(value) => update("convertedWin", sanitiseMoneyInput(value, true))} value={values.convertedWin} valueTone={financialState(values.convertedWin)} />
          <span className="casino-quick-add-chip-row" data-pd-id="casino-quick-add.converted-win-chips">
            {getChipValues(usage.convertedWin, ["0.00", "0.20", "0.50", "1.00"]).map((convertedWin) => <button aria-pressed={normaliseMoney(values.convertedWin) === normaliseMoney(convertedWin)} className="review-chip casino-quick-add-chip" key={convertedWin} onClick={() => update("convertedWin", convertedWin)} type="button">£ {normaliseMoney(convertedWin)}</button>)}
          </span>
        </div>
        <label className="field-control">
          <span>Offer Name <em>(Optional)</em></span>
          <input aria-label="Quick add Free Spins offer name" data-pd-id="casino-quick-add.offer-name" onChange={(event) => update("offerName", event.target.value)} value={values.offerName} />
        </label>
        <label className="field-control">
          <span>Game Or Slot <em>(Optional)</em></span>
          <input aria-label="Quick add Free Spins game or slot" data-pd-id="casino-quick-add.game" onChange={(event) => update("game", event.target.value)} value={values.game} />
          <span className="casino-quick-add-chip-row" data-pd-id="casino-quick-add.game-chips">
            {getChipValues(usage.game, ["Big Bass Bonanza", "Fishin' Frenzy", "Book Of Dead", "Sweet Bonanza"]).map((game) => <button aria-pressed={values.game === game} className="review-chip casino-quick-add-chip" key={game} onClick={() => update("game", game)} type="button">{game}</button>)}
          </span>
        </label>
      </div>
      {validationMessage ? <p className="field-hint" role="status">{validationMessage}</p> : null}
      {errorMessage ? <p className="field-error" role="alert">{errorMessage}</p> : null}
      <footer className="modal-panel-footer casino-quick-add-footer">
        <button className="review-chip" disabled={isSaving} onClick={() => onMoreDetails(effectiveValues)} type="button">More Details</button>
        <button className="modal-primary-button" data-pd-id="casino-quick-add.save" disabled={Boolean(validationMessage) || isSaving} onClick={() => void save()} type="button">
          {isSaving ? <span aria-hidden="true" className="material-symbols-outlined button-saving-spinner">progress_activity</span> : null}
          Save Free Spins
        </button>
      </footer>
    </section>
  );
}
