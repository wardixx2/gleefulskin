import { getPageNumbers } from "../lib/pagination.js";

export default function AppointmentsPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}) {
  if (totalItems === 0) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="appt-pagination">
      <span className="appt-pagination__info">
        Showing {startIndex}–{endIndex} of {totalItems}
      </span>

      {totalPages > 1 && (
        <div className="appt-pagination__controls">
          <button
            type="button"
            className="appt-pagination__btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>

          <div className="appt-pagination__pages">
            {pages[0] > 1 && (
              <>
                <button
                  type="button"
                  className="appt-pagination__page"
                  onClick={() => onPageChange(1)}
                >
                  1
                </button>
                {pages[0] > 2 && <span className="appt-pagination__ellipsis">…</span>}
              </>
            )}

            {pages.map((page) => (
              <button
                key={page}
                type="button"
                className={`appt-pagination__page${page === currentPage ? " is-active" : ""}`}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ))}

            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 && (
                  <span className="appt-pagination__ellipsis">…</span>
                )}
                <button
                  type="button"
                  className="appt-pagination__page"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="appt-pagination__btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
