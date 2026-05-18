import "../index.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({ label, value, variant = "default" }) {
  const variantClassName =
    variant === "warning"
      ? "border-[#FDE68A] border-l-[#D97706] bg-[#FFFBEB]"
      : variant === "accent"
        ? "border-[#2F6FED]/20 border-l-[#2F6FED] bg-[#EEF3FD]"
        : "border-[#E4E8EF] bg-white";
  const valueClassName =
    variant === "warning"
      ? "text-[#D97706]"
      : variant === "accent"
        ? "text-[#2F6FED]"
        : "text-[#0F1620]";

  return (
    <article className={`rounded-xl border border-l-4 p-5 shadow-sm ${variantClassName}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-[#8A96A8]">{label}</p>
      <p className={`mt-1 font-['DM_Mono'] text-3xl font-bold ${valueClassName}`}>{value}</p>
    </article>
  );
}

function EmptyState({ tone = "default", message }) {
  const iconClassName =
    tone === "warning"
      ? "border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]"
      : tone === "accent"
        ? "border-[#BFDBFE] bg-[#EEF3FD] text-[#2F6FED]"
        : "border-[#E4E8EF] bg-white text-[#8A96A8]";

  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E8EF] bg-[#F8F9FB] px-4 py-8 text-center">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border ${iconClassName}`}>
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[#4A5568]">{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E8EF] border-t-[#2F6FED]" />
    </div>
  );
}

function AdminDashboard() {
  const { getISOWeekString, getToken, weekOffset, setPendingSwapsCount } = useRoster();
  const [analytics, setAnalytics] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      setError("");
      setIsLoading(true);

      try {
        const week = getISOWeekString(weekOffset);
        const [analyticsResult, pendingSwapsResult] = await Promise.all([
          apiFetch(`assignments/analytics?week=${week}`, {}, getToken()),
          apiFetch("swaps/pending", {}, getToken()),
        ]);

        if (isMounted) {
          setAnalytics(analyticsResult);
          setPendingSwaps(pendingSwapsResult);
          setPendingSwapsCount(pendingSwapsResult.length);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [getISOWeekString, getToken, setPendingSwapsCount, weekOffset]);

  const approachingCapEmployees = useMemo(
    () => analytics.filter((employee) => employee.approaching_cap),
    [analytics]
  );
  const employeesScheduledCount = useMemo(
    () => analytics.filter((employee) => Number(employee.total_hours_scheduled) > 0).length,
    [analytics]
  );
  const totalHoursThisWeek = useMemo(
    () =>
      analytics.reduce(
        (total, employee) => total + Number(employee.total_hours_scheduled || 0),
        0
      ),
    [analytics]
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] px-4 py-6 font-['Figtree'] md:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#0F1620]">Dashboard</h1>
        </header>
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FB] px-4 py-6 font-['Figtree'] md:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#0F1620]">Dashboard</h1>
      </header>

      {error ? <p className="mb-4 text-sm text-[#DC2626]">{error}</p> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees Scheduled" value={employeesScheduledCount} />
        <StatCard
          label="Total Hours This Week"
          value={`${totalHoursThisWeek.toFixed(1)} hrs`}
        />
        <StatCard
          label="Approaching Cap"
          value={approachingCapEmployees.length}
          variant="warning"
        />
        <StatCard
          label="Pending Swaps"
          value={pendingSwaps.length}
          variant="accent"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F1620]">Approaching Cap</h2>
            <span className="font-['DM_Mono'] text-sm font-medium text-[#8A96A8]">
              {approachingCapEmployees.length}
            </span>
          </div>

          {approachingCapEmployees.length === 0 ? (
            <EmptyState tone="warning" message="No employees are approaching their weekly cap." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4E8EF] text-xs font-medium uppercase tracking-wider text-[#8A96A8]">
                    <th className="py-3 pr-3">Name</th>
                    <th className="py-3 pr-3">Department</th>
                    <th className="py-3 pr-3">Hours Scheduled</th>
                    <th className="py-3 pr-3">Max Hours</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {approachingCapEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-[#E4E8EF] last:border-b-0">
                      <td className="py-3 pr-3 font-semibold text-[#0F1620]">{employee.name}</td>
                      <td className="py-3 pr-3 text-[#4A5568]">{employee.department}</td>
                      <td className="py-3 pr-3 font-['DM_Mono'] text-[#0F1620]">
                        {Number(employee.total_hours_scheduled).toFixed(1)}
                      </td>
                      <td className="py-3 pr-3 font-['DM_Mono'] text-[#0F1620]">
                        {employee.max_hours_per_week}
                      </td>
                      <td className="py-3">
                        <span className="rounded-full bg-[#FFFBEB] px-3 py-1 text-xs font-semibold text-[#D97706]">
                          Near Limit
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F1620]">Pending Swaps</h2>
            {pendingSwaps.length > 5 ? (
              <Link to="/admin/swaps" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#2F6FED] hover:text-[#1D5CD6]">
                View All
              </Link>
            ) : null}
          </div>

          {pendingSwaps.length === 0 ? (
            <EmptyState tone="accent" message="No pending swap requests." />
          ) : (
            <div className="space-y-3">
              {pendingSwaps.slice(0, 5).map((swap) => (
                <div
                  key={swap.id}
                  className="flex flex-col gap-4 rounded-xl border border-[#E4E8EF] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#0F1620]">
                      {swap.from_employee_name} <span className="text-[#8A96A8]">-&gt;</span>{" "}
                      {swap.to_employee_name}
                    </p>
                    <p className="mt-1 text-sm text-[#8A96A8]">
                      {formatDate(swap.shift_date)} · {swap.shift_name}
                    </p>
                  </div>
                  <Link
                    to="/admin/swaps"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6]"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default AdminDashboard;
