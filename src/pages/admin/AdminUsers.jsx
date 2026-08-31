import { useEffect, useMemo, useState } from "react";
import { getApprovalLabel } from "../../lib/profileApproval.js";
import { fetchAllProfilesForAdmin, updateProfileAsAdmin, deleteCustomerAsAdmin } from "../../lib/adminUsersApi.js";
import { sendAccountApprovedEmail } from "../../lib/notifyAccountApproved.js";
import {
  filterUsers,
  getShortUserId,
  getUserDisplayName,
  normalizeApprovalStatus,
} from "../../lib/userFilters.js";
import { paginateItems } from "../../lib/pagination.js";
import UsersFilterBar from "../../components/UsersFilterBar.jsx";
import AppointmentsPagination from "../../components/AppointmentsPagination.jsx";
import { confirmAction, showError, showSuccess, showWarning } from "../../lib/alerts.js";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setLoadError("");

    const { users: loadedUsers, error } = await fetchAllProfilesForAdmin();

    if (error) {
      setLoadError(error);
      setUsers([]);
    } else {
      setUsers(loadedUsers);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(
    () => filterUsers(users, { status: statusFilter, search }),
    [users, statusFilter, search]
  );

  const pagination = useMemo(
    () => paginateItems(filteredUsers, currentPage),
    [filteredUsers, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const updateApproval = async (user, approval_status) => {
    const displayName = getUserDisplayName(user);
    const action = approval_status === "approved" ? "approve" : "reject";

    const confirmed = await confirmAction({
      title: action === "approve" ? "Approve this account?" : "Reject this account?",
      text: `${displayName} will be marked as ${approval_status}.`,
      confirmButtonText: action === "approve" ? "Yes, approve" : "Yes, reject",
    });

    if (!confirmed.isConfirmed) return;

    const { error } = await updateProfileAsAdmin(user.id, { approval_status });

    if (error) {
      await showError(error, `Could not ${action} user`);
      return;
    }

    if (approval_status === "approved") {
      const emailResult = await sendAccountApprovedEmail({
        email: user.email,
        fullName: displayName,
      });

      if (emailResult.error) {
        await showWarning(
          `${displayName} can log in now with their password. The email was not sent because SMTP is not delivering yet. In Resend, verify a domain (or use Gmail SMTP) so mail can reach real customers.`,
          "Approved — email not sent"
        );
      } else {
        await showSuccess(
          `A login email was sent to ${user.email || displayName}.`,
          "Account approved"
        );
      }
    } else {
      await showSuccess(`${displayName} was rejected.`, "Account updated");
    }

    load();
  };

  const toggleRole = async (user) => {
    const newRole = user.role === "admin" ? "customer" : "admin";
    const action = newRole === "admin" ? "promote to admin" : "demote to customer";
    const displayName = getUserDisplayName(user);

    const confirmed = await confirmAction({
      title: newRole === "admin" ? "Promote to admin?" : "Demote to customer?",
      text: `${action.charAt(0).toUpperCase() + action.slice(1)} for ${displayName}.`,
      confirmButtonText: newRole === "admin" ? "Yes, promote" : "Yes, demote",
    });

    if (!confirmed.isConfirmed) return;

    const updates = { role: newRole };
    if (newRole === "admin") {
      updates.approval_status = "approved";
    }

    const { error } = await updateProfileAsAdmin(user.id, updates);

    if (error) {
      await showError(error, "Could not update role");
      return;
    }

    if (newRole === "admin") {
      await sendAccountApprovedEmail({
        email: user.email,
        fullName: displayName,
      });
    }

    await showSuccess(`${displayName} is now ${newRole}.`, "Role updated");
    load();
  };

  const deleteUser = async (user) => {
    if (user.role === "admin") {
      alert("Admin accounts cannot be deleted from here.");
      return;
    }

    const displayName = getUserDisplayName(user);
    const emailLine = user.email ? `\nEmail: ${user.email}` : "";

    if (
      !confirm(
        `Permanently delete ${displayName}?${emailLine}\n\nThis removes their account, profile, and related data. This cannot be undone.`
      )
    ) {
      return;
    }

    const { error } = await deleteCustomerAsAdmin(user.id);

    if (error) {
      if (error.includes("admin_delete_customer") || error.includes("Could not find")) {
        alert(
          `Failed to delete user: ${error}\n\nRun supabase/APPLY_DELETE_USER.sql in Supabase SQL Editor, then try again.`
        );
      } else {
        alert(`Failed to delete user: ${error}`);
      }
      return;
    }

    load();
  };

  return (
    <div className="appointments-panel">
      <div className="appointments-panel__header">
        <div>
          <h2 className="appointments-panel__title">Registered Users</h2>
          <p className="appointments-panel__subtitle">
            Review new sign-ups and manage account access
          </p>
        </div>
        <button type="button" className="appt-btn appt-btn--ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="appointments-panel__empty appointments-panel__empty--error">
          Could not load users: {loadError}. Run <code>supabase/APPLY_USERS_FIX.sql</code> in your
          Supabase SQL Editor, then click Refresh.
        </div>
      )}

      {!loading && users.length > 0 && (
        <UsersFilterBar
          users={users}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
          filteredCount={filteredUsers.length}
        />
      )}

      {loading ? (
        <div className="appointments-panel__empty">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="appointments-panel__empty">No registered users yet.</div>
      ) : filteredUsers.length === 0 ? (
        <div className="appointments-panel__empty">
          No users match your filters. Try the <strong>All</strong> or <strong>Pending</strong> tab,
          or click Refresh after a new sign-up.
        </div>
      ) : (
        <div className="appt-table-wrap">
          <table className="appt-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((user) => {
                const approvalStatus = normalizeApprovalStatus(user.approval_status);
                const isPending = approvalStatus === "pending";

                return (
                  <tr key={user.id} className={isPending ? "appt-table__row--pending" : ""}>
                    <td>
                      <div className="appt-table__client">{getUserDisplayName(user)}</div>
                      {!user.full_name?.trim() && user.email && (
                        <div className="appt-table__sub">Name not set on profile</div>
                      )}
                      {!user.full_name?.trim() && !user.email && (
                        <div className="appt-table__sub">No name on profile</div>
                      )}
                      <code className="user-id-code" title={user.id}>
                        {getShortUserId(user.id)}
                      </code>
                    </td>
                    <td>{user.email || "—"}</td>
                    <td>
                      <span
                        className={`role-pill role-pill--${user.role === "admin" ? "admin" : "customer"}`}
                      >
                        {user.role === "admin" ? "Admin" : "Customer"}
                      </span>
                    </td>
                    <td>
                      <span className={`approval-pill approval-pill--${approvalStatus}`}>
                        {getApprovalLabel(approvalStatus)}
                      </span>
                    </td>
                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td>
                      <div className="appt-table__actions">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="appt-btn appt-btn--approve"
                              onClick={() => updateApproval(user, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="appt-btn appt-btn--danger"
                              onClick={() => updateApproval(user, "rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {approvalStatus === "rejected" && (
                          <button
                            type="button"
                            className="appt-btn appt-btn--approve"
                            onClick={() => updateApproval(user, "approved")}
                          >
                            Approve
                          </button>
                        )}
                        {user.role !== "admin" && approvalStatus === "approved" && (
                          <button
                            type="button"
                            className="appt-btn appt-btn--ghost"
                            onClick={() => toggleRole(user)}
                          >
                            Promote
                          </button>
                        )}
                        {user.role === "admin" && (
                          <button
                            type="button"
                            className="appt-btn appt-btn--danger"
                            onClick={() => toggleRole(user)}
                          >
                            Demote
                          </button>
                        )}
                        {user.role !== "admin" && (
                          <button
                            type="button"
                            className="appt-btn appt-btn--danger"
                            onClick={() => deleteUser(user)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <AppointmentsPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
