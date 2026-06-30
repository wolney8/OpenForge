"use client";

import { useState } from "react";
import type { TrackerRow } from "@/lib/tracker-types";

export type TableColumn = {
  key: string;
  label: string;
};

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
  const combinedRows = [...draftRows, ...rows];

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
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {combinedRows.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  No rows loaded yet for this profile.
                </td>
              </tr>
            ) : (
              combinedRows.map((row, index) => (
                <tr key={`${row[columns[0].key] ?? "row"}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>{row[column.key] || "—"}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
