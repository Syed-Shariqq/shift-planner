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

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E8EF] border-t-[#2F6FED]" />
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

  const groupedShifts = useMemo(() => {
    return shifts.reduce((groups, shift) => {
      if (!groups[shift.date]) {
        groups[shift.date] = [];
      }

      groups[shift.date].push(shift);

      return groups;
    }, {});
  }, [shifts]);

  const sortedDates = useMemo(() => Object.keys(groupedShifts).sort(), [groupedShifts]);

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

  return (
    <main className="min-h-screen bg-[#F8F9FB] px-4 py-6 font-['Figtree'] text-[#0F1620] md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#0F1620]">My Schedule</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="min-h-[44px] rounded-lg border border-[#E4E8EF] bg-white px-4 py-2 text-sm font-medium text-[#0F1620] transition-colors hover:bg-[#F1F4F9]"
        >
          Logout
        </button>
      </div>

      <section className="mb-6 rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm font-medium text-[#4A5568]">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            />
          </label>

          <label className="block text-sm font-medium text-[#4A5568]">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            />
          </label>

          <button
            type="button"
            onClick={fetchShifts}
            className="min-h-[44px] rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6]"
          >
            Load Shifts
          </button>
        </div>
      </section>

      {loading ? <LoadingSpinner /> : null}

      {!loading && error ? <p className="mb-4 text-sm text-[#DC2626]">{error}</p> : null}

      {!loading && !error && sortedDates.length === 0 ? (
        <div className="py-16 text-center text-[#8A96A8]">No shifts scheduled for this period</div>
      ) : null}

      {!loading && !error && sortedDates.length > 0 ? (
        <section className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-semibold text-[#0F1620]">{formatDateHeading(date)}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupedShifts[date].map((shift) => (
                  <article
                    key={shift.id}
                    className="rounded-lg border border-[#E4E8EF] bg-white p-4 shadow-sm"
                    style={{ borderLeft: `4px solid ${shift.color_code}` }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-semibold text-[#0F1620]">{shift.shift_name}</div>
                        <div className="mt-1 font-['DM_Mono'] text-sm text-[#4A5568]">
                          {shift.start_time} - {shift.end_time}
                        </div>
                        <div className="mt-1 font-['DM_Mono'] text-xs text-[#8A96A8]">
                          {calculateDuration(shift).toFixed(1)} hrs
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSwapModal(shift)}
                        className="min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm font-semibold text-[#0F1620] transition-colors hover:bg-[#F1F4F9] sm:w-auto"
                      >
                        Request Swap
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <SwapRequestModal
        isOpen={Boolean(selectedAssignment)}
        onClose={closeSwapModal}
        assignment={selectedAssignment}
      />
    </main>
  );
}

export default EmployeeCalendarPage;
