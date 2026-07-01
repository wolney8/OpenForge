"use client";

import { useMemo, useState } from "react";
import type { TableColumn } from "@/lib/tracker-modules";
import {
  filterTrackerRows,
  getTrackerPageCount,
  paginateTrackerRows,
} from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";

type TrackerModuleTableProps = {
  addLabel: string;
  columns: TableColumn[];
  rows: TrackerRow[];
};

function createDraftRow(columns: TableColumn[], draftIndex: number): TrackerRow {
  return columns.reduce<TrackerRow>((accumulator, column, index) => {
    if (index === 0) {
      accumulator[column.key] = `DRAFT-${String(draftIndex).padStart(3, "0")}`;
      return accumulator;
    }

    if (column.key.toLowerCase().includes("status")) {
      accumulator[column.key] = "Draft";
      return accumulator;
    }

    accumulator[column.key] = "";
    return accumulator;
  }, {});
}

export function TrackerModuleTable({
  addLabel,
  columns,
  rows,
}: TrackerModuleTableProps) {
  const [draftRows, setDraftRows] = useState<TrackerRow[]>([]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const combinedRows = useMemo(() => [...draftRows, ...rows], [draftRows, rows]);
  const filteredRows = useMemo(
    () => filterTrackerRows(combinedRows, columns, query),
    [columns, combinedRows, query]
  );
  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows, pageSize]
  );

  return (
    <section className="content-panel stack">
      <div className="table-toolbar">
        <div className="stack">
          <span className="eyebrow">Tracker rows</span>
          <p className="lede">
            Local-only seed data is shown here. Draft rows can be added before the
            full form workflow lands.
          </p>
        </div>
        <button
          className="button-link"
          onClick={() =>
            setDraftRows((currentRows) => [
              createDraftRow(columns, currentRows.length + 1),
              ...currentRows,
            ])
          }
          type="button"
        >
          {addLabel}
        </button>
      </div>
      <div className="table-controls" aria-label="Table controls">
        <label className="field-control">
          <span>Filter rows</span>
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search visible columns"
            type="search"
            value={query}
          />
        </label>
        <label className="field-control">
          <span>Rows per page</span>
          <select
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
            value={pageSize}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <div className="table-status" aria-live="polite">
          Showing {pagedRows.length} of {filteredRows.length} visible rows
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className={column.align === "end" ? "align-end" : undefined}
                  key={column.key}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  {filteredRows.length === 0 && combinedRows.length > 0
                    ? "No rows match the current filter."
                    : "No rows loaded yet for this profile."}
                </td>
              </tr>
            ) : (
              pagedRows.map((row, index) => (
                <tr key={`${row[columns[0].key] ?? "row"}-${index}`}>
                  {columns.map((column) => (
                    <td
                      className={column.align === "end" ? "align-end" : undefined}
                      key={column.key}
                    >
                      {row[column.key] || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-pagination" aria-label="Pagination">
        <div className="table-status">
          Page {effectivePage} of {pageCount}
        </div>
        <div className="tracker-nav">
          <button
            className="button-link"
            disabled={effectivePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="button-link"
            disabled={effectivePage === pageCount}
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
