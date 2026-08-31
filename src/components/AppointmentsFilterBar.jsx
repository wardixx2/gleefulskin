import {
  APPOINTMENT_STATUS_FILTERS,
  getStatusCounts,
} from "../lib/appointmentFilters.js";

export default function AppointmentsFilterBar({
  appointments,
  statusFilter,
  onStatusChange,
  search,
  onSearchChange,
  filteredCount,
}) {
  const counts = getStatusCounts(appointments);

  return (
    <div className="appt-toolbar">
      <div className="appt-toolbar__row">
        <div className="appt-toolbar__tabs" role="tablist" aria-label="Filter by status">
          {APPOINTMENT_STATUS_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === option.id}
              className={`appt-toolbar__tab${statusFilter === option.id ? " is-active" : ""}`}
              onClick={() => onStatusChange(option.id)}
            >
              {option.label}
              <span className="appt-toolbar__badge">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <span className="appt-toolbar__meta">
          {filteredCount} of {appointments.length} shown
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
          placeholder="Search client, treatment, or date..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search appointments"
        />
      </div>
    </div>
  );
}
