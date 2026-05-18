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
    <article
      className={`rounded-xl border border-l-4 p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md ${variantClassName}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A96A8]">{label}</p>
      <p className={`mt-2 font-['DM_Mono'] text-3xl font-bold leading-none ${valueClassName}`}>{value}</p>
    </article>
  );
}

function EmptyState({ tone = "default", message, hint = "" }) {
  const iconClassName =
    tone === "warning"
      ? "border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]"
      : tone === "accent"
        ? "border-[#BFDBFE] bg-[#EEF3FD] text-[#2F6FED]"
        : "border-[#E4E8EF] bg-white text-[#8A96A8]";

  const iconPath =
    tone === "warning" ? (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ) : tone === "accent" ? (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ) : (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    );

  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E8EF] bg-[#F8F9FB] px-4 py-10 text-center">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border ${iconClassName}`}>
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          {iconPath}
        </svg>
      </div>
      <p className="text-sm font-medium text-[#4A5568]">{message}</p>
      {hint && <p className="mt-0.5 text-xs text-[#8A96A8]">{hint}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="bg-[#F8F9FB] px-4 py-6 font-['Figtree'] sm:px-6 lg:px-8 lg:py-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-5 w-48" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton mt-3 h-9 w-16" />
          </div>
        ))}
      </div>
      {/* Panel skeletons */}
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="skeleton h-5 w-36" />
              <div className="skeleton h-4 w-6" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
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
    return <DashboardSkeleton />;
  }

  /* Live date label for the header */
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="bg-[#F8F9FB] px-4 py-6 font-['Figtree'] sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1620]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#8A96A8]">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-xs font-medium text-[#4A5568] shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Week overview
        </div>
      </header>

      {error ? <p className="mb-4 text-sm text-[#DC2626]">{error}</p> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
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

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F1620]">Approaching Cap</h2>
            <span className="font-['DM_Mono'] text-sm font-medium text-[#8A96A8]">
              {approachingCapEmployees.length}
            </span>
          </div>

          {approachingCapEmployees.length === 0 ? (
            <EmptyState
              tone="warning"
              message="All employees are within their weekly cap."
              hint="Employees within 2 hours of their max will appear here."
            />
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

        <article className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F1620]">Pending Swaps</h2>
            {pendingSwaps.length > 5 ? (
              <Link to="/admin/swaps" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#2F6FED] hover:text-[#1D5CD6]">
                View All
              </Link>
            ) : null}
          </div>

          {pendingSwaps.length === 0 ? (
            <EmptyState
              tone="accent"
              message="No pending swap requests."
              hint="Swap requests from employees will appear here."
            />
          ) : (
            <div className="space-y-3">
              {pendingSwaps.slice(0, 5).map((swap) => (
                <div
                  key={swap.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF3FD] text-xs font-bold text-[#2F6FED]">
                      {swap.from_employee_name?.[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0F1620]">
                        {swap.from_employee_name}
                        <span className="mx-1.5 font-normal text-[#8A96A8]">→</span>
                        {swap.to_employee_name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#8A96A8]">
                        {formatDate(swap.shift_date)} · {swap.shift_name}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/swaps"
                    className="shrink-0 rounded-lg bg-[#2F6FED] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#1D5CD6] hover:shadow-sm"
                  >
                    Review
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
