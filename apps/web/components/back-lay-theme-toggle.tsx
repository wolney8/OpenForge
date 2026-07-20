"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import type { BackLayTheme } from "@/lib/theme";

const backLayThemeOptions: Array<{
  value: BackLayTheme;
  label: string;
  description: string;
}> = [
  {
    value: "smarkets",
    label: "Smarkets",
    description: "Back: Green / Lay: Blue",
  },
  {
    value: "betfair",
    label: "Betfair",
    description: "Back: Blue / Lay: Pink",
  },
];

export function BackLayThemeToggle() {
  const { backLayTheme, setBackLayTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (shellRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="app-menu-shell back-lay-theme-shell" ref={shellRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Choose back/lay colour theme"
        className="icon-button"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" className="palette-icon-wrap">
          <svg
            className="palette-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3.25a8.75 8.75 0 0 0 0 17.5h1.06a1.69 1.69 0 0 0 1.18-2.87 1.67 1.67 0 0 1 1.16-2.86h1.85a5.5 5.5 0 0 0 0-11H12Zm-4.2 8.05a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7Zm2.2-3.9a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7Zm3.8 0a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7Zm2.2 3.9a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </button>
      <div className={`app-menu-panel app-menu-panel-right ${isOpen ? "is-open" : ""}`} role="menu">
        <div className="back-lay-theme-menu-copy">Back/Lay Colour Theme</div>
        {backLayThemeOptions.map((option) => (
          <button
            aria-pressed={backLayTheme === option.value}
            className={`back-lay-theme-option ${backLayTheme === option.value ? "is-active" : ""}`}
            key={option.value}
            onClick={() => {
              setBackLayTheme(option.value);
              setIsOpen(false);
            }}
            type="button"
          >
            <span aria-hidden="true" className={`back-lay-theme-swatch back-lay-theme-swatch-${option.value}`} />
            <span className="back-lay-theme-option-copy">
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
