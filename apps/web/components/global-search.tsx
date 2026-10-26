"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { beginRouteTransition } from "@/lib/shell-loading";
import { redirectExpiredSession } from "@/lib/session-inactivity";
import { confirmUnsavedTrackerChanges } from "@/lib/use-unsaved-changes-guard";

type SearchResult = {
  result_id: string;
  group: "Navigation" | "Profiles" | "Account Catalogue";
  title: string;
  subtitle: string;
  href: string;
  icon: string;
};

const groupOrder: SearchResult["group"][] = ["Navigation", "Profiles", "Account Catalogue"];

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const compactTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setSearchError(false);
      void fetch(`${apiBaseUrl}/search?query=${encodeURIComponent(trimmedQuery)}`, {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.status === 401) {
            await redirectExpiredSession(response);
            return [];
          }
          if (!response.ok) throw new Error("Search unavailable");
          return response.json() as Promise<SearchResult[]>;
        })
        .then((nextResults) => {
          setResults(nextResults);
          setActiveIndex(nextResults.length > 0 ? 0 : -1);
        })
        .catch((error: unknown) => {
          if ((error as Error).name !== "AbortError") {
            setResults([]);
            setSearchError(true);
          }
        })
        .finally(() => setIsLoading(false));
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, router]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setCompactOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!compactOpen) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [compactOpen]);

  const closeCompactSearch = () => {
    setIsOpen(false);
    setCompactOpen(false);
    window.requestAnimationFrame(() => compactTriggerRef.current?.focus());
  };

  const navigateToResult = async (result: SearchResult) => {
    if (!(await confirmUnsavedTrackerChanges())) return;
    setIsOpen(false);
    setCompactOpen(false);
    setQuery("");
    beginRouteTransition();
    router.push(result.href);
  };

  const groupedResults = groupOrder
    .map((group) => ({ group, items: results.filter((result) => result.group === group) }))
    .filter(({ items }) => items.length > 0);

  return (
    <div className={`global-search${compactOpen ? " is-compact-open" : ""}`} data-pd-id="global-search.root" ref={rootRef} role="search">
      <button aria-expanded={compactOpen} aria-label={compactOpen ? "Close Plum Duff search" : "Open Plum Duff search"} className="icon-button global-search-compact-trigger" onClick={() => compactOpen ? closeCompactSearch() : setCompactOpen(true)} ref={compactTriggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">{compactOpen ? "close" : "search"}</span></button>
      <label className="field-control table-search-field global-search-field">
        <span className="visually-hidden">Search Plum Duff</span>
        <span aria-hidden="true" className="material-symbols-outlined global-search-leading-icon">search</span>
        <input
          aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls="global-search-results"
          aria-expanded={isOpen}
          aria-label="Search profiles, accounts and Fund Manager pages"
          autoComplete="off"
          data-pd-id="global-search.input"
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setIsOpen(nextQuery.trim().length >= 1);
            if (nextQuery.trim().length < 1) {
              setResults([]);
              setIsLoading(false);
              setSearchError(false);
              setActiveIndex(-1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length > 0) {
              event.preventDefault();
              setActiveIndex((current) => (current + 1) % results.length);
            } else if (event.key === "ArrowUp" && results.length > 0) {
              event.preventDefault();
              setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              void navigateToResult(results[activeIndex]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              if (compactOpen) closeCompactSearch();
              else setIsOpen(false);
            }
          }}
          placeholder="Search Plum Duff"
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
      </label>
      {isOpen && query.trim().length >= 1 ? (
        <section aria-label="Global search results" className="global-search-results" data-pd-id="global-search.results" id="global-search-results" role="listbox">
          {isLoading ? <p className="global-search-state" role="status">Searching...</p> : null}
          {!isLoading && searchError ? <p className="global-search-state error-text" role="status">Search is temporarily unavailable.</p> : null}
          {!isLoading && !searchError && results.length === 0 ? <p className="global-search-state" role="status">No matching profiles, providers or pages.</p> : null}
          {!isLoading ? groupedResults.map(({ group, items }) => (
            <div className="global-search-group" key={group}>
              <span className="eyebrow">{group}</span>
              {items.map((result) => {
                const resultIndex = results.findIndex((candidate) => candidate.result_id === result.result_id);
                return (
                  <button
                    aria-selected={resultIndex === activeIndex}
                    className={`global-search-result${resultIndex === activeIndex ? " is-active" : ""}`}
                    data-pd-id={`global-search.result.${result.result_id}`}
                    id={`global-search-result-${resultIndex}`}
                    key={result.result_id}
                    onClick={() => void navigateToResult(result)}
                    onMouseEnter={() => setActiveIndex(resultIndex)}
                    role="option"
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">{result.icon}</span>
                    <span><strong>{result.title}</strong><small>{result.subtitle}</small></span>
                  </button>
                );
              })}
            </div>
          )) : null}
        </section>
      ) : null}
    </div>
  );
}
