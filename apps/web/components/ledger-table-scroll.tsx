"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type LedgerTableScrollProps = {
  children: ReactNode;
  className?: string;
  dataPdId: string;
};

/** Keeps wide operational tables reachable without relying on a tiny scrollbar. */
export function LedgerTableScroll({
  children,
  className = "",
  dataPdId,
}: LedgerTableScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const maximum = element.scrollWidth - element.clientWidth;
      setScrollState({
        left: element.scrollLeft > 2,
        right: maximum - element.scrollLeft > 2,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (direction: -1 | 1) => {
    const element = ref.current;
    if (!element) return;
    element.scrollBy({ left: element.clientWidth * direction * 0.72, behavior: "smooth" });
  };

  return (
    <div className={`ledger-table-scroll-wrap ${className}`.trim()}>
      <div className="table-scroll" data-pd-id={dataPdId} ref={ref}>
        {children}
      </div>
      <button
        aria-label="Scroll table left"
        className="ledger-table-scroll-arrow ledger-table-scroll-arrow-left"
        data-pd-id={`${dataPdId}.scroll-left`}
        disabled={!scrollState.left}
        onClick={() => scroll(-1)}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
      </button>
      <button
        aria-label="Scroll table right"
        className="ledger-table-scroll-arrow ledger-table-scroll-arrow-right"
        data-pd-id={`${dataPdId}.scroll-right`}
        disabled={!scrollState.right}
        onClick={() => scroll(1)}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}
