"use client";

import { useRef } from "react";

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
        <button
          aria-checked={value === rank}
          aria-label={BLACKJACK_RANK_NAMES[rank]}
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
          ref={(node) => { buttons.current[index] = node; }}
          role="radio"
          tabIndex={value === rank || (!value && index === 0) ? 0 : -1}
          type="button"
        >
          <span className="blackjack-rank-card-value">{rank}</span>
          <span aria-hidden="true" className="blackjack-rank-card-suits"><i>♠</i><i>♥</i><i>♦</i><i>♣</i></span>
        </button>
      ))}
    </div>
  );
}

export function BlackjackCardSlot({
  active,
  disabled = false,
  label,
  onActivate,
  value,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onActivate: () => void;
  value: BlackjackCardValue;
}) {
  return (
    <button
      aria-label={`${label}, ${value ? `${BLACKJACK_RANK_NAMES[value]} selected` : "not selected"}`}
      aria-pressed={active}
      className={`blackjack-card-slot${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onActivate}
      type="button"
    >
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </button>
  );
}
