"use client";

import { useRef } from "react";

import { BlackjackCard } from "@/components/blackjack-card";
import {
  BLACKJACK_RANK_NAMES,
  BLACKJACK_RANKS,
  type BlackjackCardValue,
} from "@/lib/blackjack-ranks";

export function BlackjackRankPicker({
  disabled = false,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (card: BlackjackCardValue) => void;
  value: BlackjackCardValue;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(index: number, key: string) {
    let next = index;
    if (key === "ArrowRight" || key === "ArrowDown") next = (index + 1) % BLACKJACK_RANKS.length;
    else if (key === "ArrowLeft" || key === "ArrowUp") next = (index - 1 + BLACKJACK_RANKS.length) % BLACKJACK_RANKS.length;
    else if (key === "Home") next = 0;
    else if (key === "End") next = BLACKJACK_RANKS.length - 1;
    else return;
    buttons.current[next]?.focus();
  }

  return (
    <div aria-label={label} className="blackjack-rank-picker" role="radiogroup">
      {BLACKJACK_RANKS.map((rank, index) => (
        <BlackjackCard
          ariaLabel={BLACKJACK_RANK_NAMES[rank]}
          className="blackjack-rank-card"
          disabled={disabled}
          key={rank}
          onClick={() => onChange(rank)}
          onKeyDown={(event) => {
            if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              moveFocus(index, event.key);
            }
          }}
          rank={rank}
          ref={(node) => { buttons.current[index] = node; }}
          role="radio"
          selected={value === rank}
          tabIndex={value === rank || (!value && index === 0) ? 0 : -1}
        />
      ))}
    </div>
  );
}

export function BlackjackCardSlot({
  accessibleLabel,
  active,
  disabled = false,
  label,
  onActivate,
  onClear,
  value,
}: {
  accessibleLabel?: string;
  active: boolean;
  disabled?: boolean;
  label: string;
  onActivate: () => void;
  onClear?: () => void;
  value: BlackjackCardValue;
}) {
  const controlLabel = accessibleLabel ?? label;
  return (
    <span className="blackjack-card-slot-wrap">
      <span className="blackjack-card-slot-label">{label}</span>
      {onClear ? <button aria-label={`Clear ${controlLabel}`} className="icon-button blackjack-card-clear" onClick={onClear} title={`Clear ${controlLabel}`} type="button"><span aria-hidden="true" className="material-symbols-outlined">undo</span></button> : null}
      <BlackjackCard
        ariaLabel={`${controlLabel}, ${value ? `${BLACKJACK_RANK_NAMES[value]} selected` : "not selected"}`}
        className={`blackjack-card-slot${active ? " is-active" : ""}`}
        disabled={disabled}
        onClick={onActivate}
        rank={value}
        selected={active}
      />
    </span>
  );
}
