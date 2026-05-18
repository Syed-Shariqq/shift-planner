import "../index.css";
import { useEffect, useState } from "react";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

const actionStyles = {
  CREATED: "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]",
  SWAPPED: "bg-[#EEF3FD] text-[#2F6FED] border border-[#BFDBFE]",
  UPDATED: "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]",
  DELETED: "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildHistoryEndpoint(filters) {
  const params = new URLSearchParams();

  if (filters.userId !== "All") {
    params.set("userId", filters.userId);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  if (filters.action !== "All") {
    params.set("action", filters.action);
  }

  const queryString = params.toString();

  return queryString ? `reports/shift-history?${queryString}` : "reports/shift-history";
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E8EF] border-t-[#2F6FED]" />
    </div>
  );
}

function ShiftHistoryPage() {
  const { getToken } = useRoster();
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    userId: "All",
    from: "",
    to: "",
    action: "All",
  });
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchEmployeesAndHistory() {
      setLoading(true);
      setError("");

      try {
        const [usersResult, historyResult] = await Promise.all([
          apiFetch("users", {}, getToken()),
          apiFetch("reports/shift-history", {}, getToken()),
        ]);

        if (isMounted) {
          setEmployees(usersResult);
          setHistory(historyResult.history);
          setTotal(historyResult.total);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEmployeesAndHistory();

    return () => {
      isMounted = false;
    };
  }, [getToken]);

  const updateFilter = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch(buildHistoryEndpoint(filters), {}, getToken());
      setHistory(result.history);
      setTotal(result.total);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] font-['Figtree'] text-[#0F1620]">
      <h1 className="mb-6 text-2xl font-bold text-[#0F1620]">Shift History</h1>

      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4A5568]">Employee</span>
          <select
            value={filters.userId}
            onChange={(event) => updateFilter("userId", event.target.value)}
            className="rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
          >
            <option value="All">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4A5568]">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter("from", event.target.value)}
            className="rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4A5568]">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter("to", event.target.value)}
            className="rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4A5568]">Action</span>
          <select
            value={filters.action}
            onChange={(event) => updateFilter("action", event.target.value)}
            className="rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
          >
            <option value="All">All</option>
            <option value="CREATED">CREATED</option>
            <option value="UPDATED">UPDATED</option>
            <option value="DELETED">DELETED</option>
            <option value="SWAPPED">SWAPPED</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6]"
        >
          Search
        </button>
      </section>

      {error ? <p className="mb-4 text-sm text-[#DC2626]">{error}</p> : null}

      {loading ? <LoadingSpinner /> : null}

      {!loading ? (
        <>
          <p className="mb-3 text-sm text-[#8A96A8]">Showing {total} records</p>

          <section className="overflow-hidden rounded-xl border border-[#E4E8EF] bg-white shadow-sm">
            {history.length === 0 ? (
              <div className="py-16 text-center text-[#8A96A8]">No history records found for these filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead>
                    <tr>
                      {["Employee", "Department", "Shift", "Date", "Action", "Changed By", "Timestamp"].map((column) => (
                        <th
                          key={column}
                          className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-b border-[#E4E8EF] transition-colors hover:bg-[#F8F9FB]">
                        <td className="px-4 py-3 text-sm text-[#0F1620]">{record.employee_name}</td>
                        <td className="px-4 py-3 text-sm text-[#0F1620]">{record.department}</td>
                        <td className="px-4 py-3 text-sm text-[#0F1620]">{record.shift_name || "Unassigned"}</td>
                        <td className="px-4 py-3 text-sm text-[#0F1620]">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-sm text-[#0F1620]">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionStyles[record.action] || actionStyles.UPDATED}`}>
                            {record.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0F1620]">{record.changed_by_name}</td>
                        <td className="px-4 py-3 font-['DM_Mono'] text-xs text-[#8A96A8]">
                          {formatTimestamp(record.logged_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default ShiftHistoryPage;
