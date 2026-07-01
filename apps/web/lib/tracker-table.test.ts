import { describe, expect, it } from "vitest";
import type { TableColumn } from "./tracker-modules";
import {
  filterTrackerRows,
  getTrackerPageCount,
  paginateTrackerRows,
} from "./tracker-table";
import type { TrackerRow } from "./tracker-types";

const columns: TableColumn[] = [
  { key: "id", label: "ID" },
  { key: "bookmaker", label: "Bookmaker" },
  { key: "status", label: "Status" },
];

const rows: TrackerRow[] = [
  { id: "BET-001", bookmaker: "Bookmaker A", status: "Placed" },
  { id: "BET-002", bookmaker: "Bookmaker B", status: "Settled" },
  { id: "BET-003", bookmaker: "Exchange A", status: "Open" },
];

describe("tracker table helpers", () => {
  it("filters rows across the visible columns", () => {
    expect(filterTrackerRows(rows, columns, "bookmaker b")).toEqual([rows[1]]);
    expect(filterTrackerRows(rows, columns, "open")).toEqual([rows[2]]);
  });

  it("returns all rows when the query is empty", () => {
    expect(filterTrackerRows(rows, columns, "   ")).toEqual(rows);
  });

  it("paginates row slices deterministically", () => {
    expect(paginateTrackerRows(rows, 1, 2)).toEqual(rows.slice(0, 2));
    expect(paginateTrackerRows(rows, 2, 2)).toEqual(rows.slice(2, 3));
  });

  it("calculates page counts with a minimum of one page", () => {
    expect(getTrackerPageCount(0, 25)).toBe(1);
    expect(getTrackerPageCount(26, 25)).toBe(2);
  });
});
