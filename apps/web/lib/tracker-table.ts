import type { TableColumn } from "./tracker-modules";
import type { TrackerRow } from "./tracker-types";

export function filterTrackerRows(
  rows: TrackerRow[],
  columns: TableColumn[],
  query: string
): TrackerRow[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) =>
    columns.some((column) =>
      String(row[column.key] ?? "")
        .toLowerCase()
        .includes(normalizedQuery)
    )
  );
}

export function paginateTrackerRows(
  rows: TrackerRow[],
  currentPage: number,
  pageSize: number
): TrackerRow[] {
  const safePage = Math.max(currentPage, 1);
  const safePageSize = Math.max(pageSize, 1);
  const startIndex = (safePage - 1) * safePageSize;
  return rows.slice(startIndex, startIndex + safePageSize);
}

export function getTrackerPageCount(rowCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(rowCount / Math.max(pageSize, 1)));
}
