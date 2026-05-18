import "../index.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";
import SwapRequestModal from "./SwapRequestModal.jsx";

const millisecondsInOneDay = 86400000;
const millisecondsInOneHour = 3600000;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    from: getDateKey(monday),
    to: getDateKey(sunday),
  };
}

function formatDateHeading(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildDateTime(dateKey, time) {
  const [hours, minutes, secondsWithFraction = "0"] = String(time).split(":");
  const seconds = secondsWithFraction.split(".")[0];
  const date = new Date(`${dateKey}T00:00:00`);

  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);

  return date;
}

function calculateDuration(shift) {
  const startDate = buildDateTime(shift.date, shift.start_time);
  const endDate = buildDateTime(shift.date, shift.end_time);

  if (endDate < startDate) {
    endDate.setTime(endDate.getTime() + millisecondsInOneDay);
  }

  return (endDate.getTime() - startDate.getTime()) / millisecondsInOneHour - Number(shift.break_minutes || 0) / 60;
}

function CalendarSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-[#F8F9FB] font-['Figtree'] text-[#0F1620]">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#E4E8EF] bg-white/80 px-6 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-7 w-7 rounded-lg" />
          <div className="skeleton h-5 w-24 rounded" />
        </div>
        <div className="skeleton h-8 w-20 rounded-lg" />
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <div className="skeleton h-8 w-40" />
          </div>
          <div className="mb-8 rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="skeleton h-11 rounded-lg" />
              <div className="skeleton h-11 rounded-lg" />
              <div className="skeleton h-11 w-28 rounded-lg" />
            </div>
          </div>
          <div className="space-y-10">
            {[0, 1].map((i) => (
              <div key={i}>
                <div className="mb-5 flex items-center gap-4">
                  <div className="skeleton h-4 w-32" />
                  <div className="h-px flex-1 bg-[#E4E8EF]" />
                </div>
                <div className="flex flex-wrap gap-4">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="skeleton h-[164px] w-full rounded-xl border border-[#E4E8EF] bg-white shadow-sm ring-1 ring-black/[0.02] sm:w-[320px] lg:w-[340px]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function EmployeeCalendarPage() {
  const navigate = useNavigate();
  const { currentUser, getToken, logout } = useRoster();
  const initialRange = useMemo(() => getCurrentWeekRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch(`my-shifts?from=${from}&to=${to}`, {}, getToken());
      setShifts(result);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }, [from, getToken, to]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start_time.localeCompare(b.start_time);
    });
  }, [shifts]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const openSwapModal = (shift) => {
    setSelectedAssignment({
      ...shift,
      department: shift.department || currentUser?.department,
    });
  };

  const closeSwapModal = () => {
    setSelectedAssignment(null);
  };

  if (loading) return <CalendarSkeleton />;

  return (
    <div className="flex h-screen flex-col bg-[#F8F9FB] font-['Figtree'] text-[#0F1620]">
      {/* Top Navigation for Employees (No Sidebar) */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#E4E8EF] bg-white/80 px-6 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2F6FED] shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-[#0F1620]">ShiftPlanner</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#4A5568] transition-all hover:bg-[#FEF2F2] hover:text-[#DC2626] active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1620]">My Schedule</h1>
          </div>

          <section className="mb-8 rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm text-[#0F1620] shadow-sm transition-shadow focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm text-[#0F1620] shadow-sm transition-shadow focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
                />
              </label>

              <button
                type="button"
                onClick={fetchShifts}
                className="h-11 rounded-lg bg-[#2F6FED] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1D5CD6] hover:shadow-md active:scale-[0.98]"
              >
                Load Shifts
              </button>
            </div>
          </section>

          {!loading && error ? (
            <div className="mb-8 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          ) : null}

          {!loading && !error && sortedShifts.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[#E4E8EF] bg-white py-20 text-center shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F4F9] text-[#8A96A8] ring-4 ring-[#F8F9FB]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-[#0F1620]">No shifts scheduled</p>
              <p className="mt-1 text-sm text-[#8A96A8]">You don't have any shifts assigned for this period.</p>
            </div>
          ) : null}

          {!loading && !error && sortedShifts.length > 0 ? (
            <div className="flex flex-wrap gap-5">
              {sortedShifts.map((shift) => (
                <article
                  key={shift.id}
                  className="group relative flex w-full flex-col justify-between rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm ring-1 ring-black/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-[320px] lg:w-[340px]"
                >
                  <div className="mb-6">
                    {/* Shift Date Header inside the card */}
                    <div className="mb-4 flex items-center justify-between border-b border-[#E4E8EF] pb-3">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A96A8]">
                        {formatDateHeading(shift.date)}
                      </div>
                      {shift.department && (
                        <div className="flex h-5 items-center justify-center rounded bg-[#F8F9FB] px-1.5 font-['DM_Mono'] text-[10px] font-semibold text-[#8A96A8] ring-1 ring-inset ring-[#E4E8EF]">
                          {shift.department}
                        </div>
                      )}
                    </div>
                    
                    {/* Shift Details */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: shift.color_code || "#2F6FED" }} />
                          <h3 className="font-bold text-[#0F1620]">{shift.shift_name}</h3>
                        </div>
                        <div className="mt-2.5 font-['DM_Mono'] text-[13px] font-medium text-[#4A5568]">
                          {shift.start_time} – {shift.end_time}
                        </div>
                        <div className="mt-1 font-['DM_Mono'] text-xs font-medium text-[#8A96A8]">
                          {calculateDuration(shift).toFixed(1)} hrs
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => openSwapModal(shift)}
                    className="flex w-full items-center justify-center rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] px-4 py-2 text-sm font-medium text-[#4A5568] transition-all hover:border-[#CBD3DF] hover:bg-white hover:text-[#0F1620] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                  >
                    Request Swap
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      <SwapRequestModal
        isOpen={Boolean(selectedAssignment)}
        onClose={closeSwapModal}
        assignment={selectedAssignment}
      />
    </div>
  );
}

export default EmployeeCalendarPage;
