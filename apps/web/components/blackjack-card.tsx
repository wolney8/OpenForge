"use client";

import { forwardRef, type KeyboardEventHandler, type MouseEventHandler } from "react";

import { type BlackjackCardValue } from "@/lib/blackjack-ranks";

const suits = ["♠", "♥", "♣", "♦"] as const;

function PipArtwork({ rank, suit, variant }: { rank: Exclude<BlackjackCardValue, "">; suit: string; variant: number }) {
  const numeric = Number(rank);
  const pipCount = Number.isFinite(numeric) ? Math.min(numeric, 10) : rank === "A" ? 1 : 0;
  const positions = [[50, 34], [31, 50], [69, 50], [31, 70], [69, 70], [50, 60], [31, 90], [69, 90], [31, 108], [69, 108]];
  return (
    <g className={`blackjack-card-decoration is-variant-${variant}`}>
      {pipCount > 0 ? positions.slice(0, pipCount).map(([x, y], index) => (
        <text className="blackjack-card-pip" key={`${x}-${y}-${index}`} x={x} y={y}>{suit}</text>
      )) : (
        <g className="blackjack-card-court-art">
          <path d="M29 91 L35 48 L50 33 L65 48 L71 91 Z" />
          <path d="M34 47 L40 26 L50 38 L60 26 L66 47" />
          <circle cx="50" cy="55" r="10" />
          <text x="50" y="83">{rank}</text>
        </g>
      )}
    </g>
  );
}

export const BlackjackCard = forwardRef<HTMLButtonElement, {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  rank: BlackjackCardValue;
  role?: "button" | "radio";
  selected?: boolean;
  tabIndex?: number;
}>(({ ariaLabel, className = "", disabled = false, onClick, onKeyDown, rank, role = "button", selected = false, tabIndex }, ref) => (
  <button
    aria-checked={role === "radio" ? selected : undefined}
    aria-label={ariaLabel}
    aria-pressed={role === "button" ? selected : undefined}
    className={`blackjack-card ${rank ? "is-face" : "is-back"}${selected ? " is-selected" : ""}${className ? ` ${className}` : ""}`}
    disabled={disabled}
    onClick={onClick}
    onKeyDown={onKeyDown}
    ref={ref}
    role={role}
    tabIndex={tabIndex}
    type="button"
  >
    <svg aria-hidden="true" className="blackjack-card-art" focusable="false" viewBox="0 0 100 140">
      {rank ? (
        <>
          <rect className="blackjack-card-paper" height="136" rx="9" width="96" x="2" y="2" />
          <text className="blackjack-card-corner-rank is-top" x="10" y="18">{rank}</text>
          <text className="blackjack-card-corner-rank is-bottom" x="90" y="122">{rank}</text>
          <text className="blackjack-card-main-rank" x="50" y="88">{rank}</text>
          {suits.map((suit, index) => <PipArtwork key={suit} rank={rank} suit={suit} variant={index} />)}
          <text className="blackjack-card-corner-suit is-top" x="10" y="29">♠</text>
          <text className="blackjack-card-corner-suit is-bottom" x="90" y="111">♥</text>
        </>
      ) : (
        <>
          <rect className="blackjack-card-back-border" height="132" rx="8" width="92" x="4" y="4" />
          <path className="blackjack-card-back-pattern" d="M12 18H88M12 30H88M12 42H88M12 54H88M12 66H88M12 78H88M12 90H88M12 102H88M12 114H88M18 12V128M30 12V128M42 12V128M54 12V128M66 12V128M78 12V128" />
          <path className="blackjack-card-back-mark" d="M50 28 66 50 50 72 34 50ZM50 68 66 90 50 112 34 90Z" />
        </>
      )}
    </svg>
  </button>
));

BlackjackCard.displayName = "BlackjackCard";
