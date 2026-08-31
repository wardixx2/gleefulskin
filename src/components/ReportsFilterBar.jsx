import {
  REPORT_PERIOD_FILTERS,
  getPeriodCounts,
} from "../lib/reportsUtils.js";

export default function ReportsFilterBar({
  rows,
  periodFilter,
  onPeriodChange,
  search,
  onSearchChange,
  filteredCount,
}) {
  const counts = getPeriodCounts(rows);

  return (
    <div className="appt-toolbar">
      <div className="appt-toolbar__row">
        <div className="appt-toolbar__tabs" role="tablist" aria-label="Filter by period">
          {REPORT_PERIOD_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={periodFilter === option.id}
              className={`appt-toolbar__tab${periodFilter === option.id ? " is-active" : ""}`}
              onClick={() => onPeriodChange(option.id)}
            >
              {option.label}
              <span className="appt-toolbar__badge">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <span className="appt-toolbar__meta">
          {filteredCount} of {rows.length} shown
        </span>
      </div>

      <div className="appt-toolbar__search">
        <svg className="appt-toolbar__search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M9 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="m14 14 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className="appt-toolbar__search-input"
          placeholder="Search customer, treatment, or date..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search reports"
        />
      </div>
    </div>
  );
}
