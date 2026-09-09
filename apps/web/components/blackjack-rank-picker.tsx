"use client";

import { useRef } from "react";

import {
  BLACKJACK_RANK_NAMES,
  BLACKJACK_RANKS,
  type BlackjackCardValue,
} from "@/lib/blackjack-ranks";

function DecorativeCardFace({ rank }: { rank: BlackjackCardValue }) {
  const displayRank = rank || "+";
  return (
    <span aria-hidden="true" className="blackjack-card-face">
      <span className="blackjack-card-corner is-top-left"><b>{displayRank}</b><i>♠</i></span>
      <span className="blackjack-card-corner is-top-right"><b>{displayRank}</b><i>♥</i></span>
      <strong className="blackjack-card-face-rank">{displayRank}</strong>
      <span className="blackjack-card-corner is-bottom-left"><b>{displayRank}</b><i>♦</i></span>
      <span className="blackjack-card-corner is-bottom-right"><b>{displayRank}</b><i>♣</i></span>
    </span>
  );
}

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
          <DecorativeCardFace rank={rank} />
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
    <span className="blackjack-card-slot-wrap">
      <span className="blackjack-card-slot-label">{label}</span>
      <button
        aria-label={`${label}, ${value ? `${BLACKJACK_RANK_NAMES[value]} selected` : "not selected"}`}
        aria-pressed={active}
        className={`blackjack-card-slot${active ? " is-active" : ""}`}
        disabled={disabled}
        onClick={onActivate}
        type="button"
      >
        <DecorativeCardFace rank={value} />
      </button>
    </span>
  );
}
