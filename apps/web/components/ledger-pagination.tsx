type LedgerPaginationProps = {
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageCount: number;
  pageSize: number;
  totalRows: number;
  ariaLabel: string;
  position: "top" | "bottom";
};

const pageSizeOptions = [8, 16, 32];

export function LedgerPagination({
  ariaLabel,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageCount,
  pageSize,
  position,
  totalRows,
}: LedgerPaginationProps) {
  const suffix = position === "top" ? "top" : "bottom";

  return (
    <div
      aria-label={`${ariaLabel} ${position} controls`}
      className={`table-pagination table-pagination-${position}`}
      data-pd-id={`${ariaLabel.toLowerCase().replaceAll(" ", "-")}.pagination.${suffix}`}
    >
      <label className="table-pagination-page-size">
        <span>Rows per page</span>
        <select
          aria-label={`${ariaLabel} rows per page`}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div aria-live="polite" className="table-status">
        Page {currentPage} of {pageCount} · {totalRows} rows
      </div>
      <div className="tracker-nav">
        <button
          className="button-link"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          type="button"
        >
          Previous
        </button>
        <button
          className="button-link"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
