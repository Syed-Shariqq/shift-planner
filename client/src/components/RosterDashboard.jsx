import "../index.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AssignShiftModal from "./AssignShiftModal.jsx";
import SwapRequestModal from "./SwapRequestModal.jsx";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

const millisecondsInOneDay = 86400000;
const millisecondsInOneHour = 3600000;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimeParts(time) {
  const [hours, minutes, secondsWithFraction = "0"] = String(time).split(":");
  const seconds = secondsWithFraction.split(".")[0];

  return {
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  };
}

function buildDateTime(dateKey, time) {
  const date = new Date(`${dateKey}T00:00:00`);
  const { hours, minutes, seconds } = getTimeParts(time);

  date.setHours(hours, minutes, seconds, 0);

  return date;
}

function calculateAssignmentHours(assignment) {
  if (!assignment) {
    return 0;
  }

  const startDate = buildDateTime(assignment.date, assignment.start_time);
  const endDate = buildDateTime(assignment.date, assignment.end_time);

  if (endDate < startDate) {
    endDate.setTime(endDate.getTime() + millisecondsInOneDay);
  }

  return (endDate.getTime() - startDate.getTime()) / millisecondsInOneHour - Number(assignment.break_minutes || 0) / 60;
}

function formatWeekLabel(weekDates) {
  const start = weekDates[0];
  const end = weekDates[6];
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function formatHours(hours) {
  return Number(hours).toFixed(1).replace(".0", "");
}

function getShiftTileStyle(assignment) {
  const shiftName = String(assignment?.shift_name || "").toLowerCase();

  if (shiftName === "morning") {
    return {
      backgroundColor: "#ebf8ff",
      color: "#1A6B8A",
      borderColor: "#BAE6FD",
    };
  }

  if (shiftName === "evening") {
    return {
      backgroundColor: "#e6fffa",
      color: "#1A6B5A",
      borderColor: "#99F6E4",
    };
  }

  if (shiftName === "night") {
    return {
      backgroundColor: "#edf2f7",
      color: "#2D3748",
      borderColor: "#CBD5E0",
    };
  }

  return {
    backgroundColor: assignment?.color_code || "#FFFFFF",
    color: "#0F1620",
    borderColor: `${assignment?.color_code || "#E4E8EF"}80`,
  };
}

function findAssignmentForDate(employee, dateKey) {
  const day = employee.assignments?.find((assignmentDay) => assignmentDay.date === dateKey);

  return day?.assignment || null;
}

function calculateEmployeeWeeklyHours(employee) {
  return (employee.assignments || []).reduce((total, day) => total + calculateAssignmentHours(day.assignment), 0);
}

const RosterCell = React.memo(
  function RosterCell({ assignment, employee, date, onOpenAssign, onOpenSwap }) {
    const dateKey = getDateKey(date);

    if (assignment) {
      const tileStyle = getShiftTileStyle(assignment);

      return (
        <button
          type="button"
          onClick={() => onOpenSwap(assignment, employee)}
          className="h-20 w-full border border-[#E4E8EF] bg-white p-2 text-left transition-colors hover:bg-[#F8F9FB]"
        >
          <div
            className="flex h-full flex-col justify-between rounded-lg border px-3 py-2"
            style={tileStyle}
          >
            <div className="truncate text-sm font-semibold">{assignment.shift_name}</div>
            <div className="font-['DM_Mono'] text-xs font-medium">
              {assignment.start_time} - {assignment.end_time}
            </div>
            <div className="text-xs font-medium">{assignment.status}</div>
          </div>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onOpenAssign(employee, date)}
        className="group relative h-20 w-full cursor-pointer border border-[#E4E8EF] bg-white transition-colors hover:bg-[#F8F9FB]"
        aria-label={`Assign shift to ${employee.name} on ${dateKey}`}
      >
        <span className="absolute inset-0 flex items-center justify-center text-2xl text-[#8A96A8] opacity-0 transition-opacity group-hover:text-[#2F6FED] group-hover:opacity-100">
          +
        </span>
      </button>
    );
  },
  (prev, next) =>
    prev.assignment?.id === next.assignment?.id &&
    prev.assignment?.status === next.assignment?.status
);

function LoadingSpinner() {
  return (
    <div className="flex min-h-80 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E8EF] border-t-[#2F6FED]" />
    </div>
  );
}

function RosterDashboard() {
  const { getWeekDates, getISOWeekString, getToken } = useRoster();
  const [weekOffset, setWeekOffset] = useState(0);
  const [rosterData, setRosterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({
    open: false,
    type: null,
    employee: null,
    date: null,
    assignment: null,
  });

  const weekDates = useMemo(() => getWeekDates(weekOffset), [getWeekDates, weekOffset]);
  const todayKey = getDateKey(new Date());

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const week = getISOWeekString(weekOffset);
      const result = await apiFetch(`roster?week=${week}`, {}, getToken());
      setRosterData(result.employees || []);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }, [getISOWeekString, getToken, weekOffset]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const openAssignModal = useCallback((employee, date) => {
    setModal({
      open: true,
      type: "assign",
      employee,
      date,
      assignment: null,
    });
  }, []);

  const openSwapModal = useCallback((assignment, employee) => {
    setModal({
      open: true,
      type: "swap",
      employee,
      date: null,
      assignment,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal({
      open: false,
      type: null,
      employee: null,
      date: null,
      assignment: null,
    });
  }, []);

  const onSuccess = useCallback(async () => {
    closeModal();
    await fetchRoster();
  }, [closeModal, fetchRoster]);

  return (
    <main className="min-h-screen bg-[#F8F9FB] p-6 font-['Figtree'] text-[#0F1620]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-[#0F1620]">Roster Builder</h1>

        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <button
            type="button"
            onClick={() => setWeekOffset((currentOffset) => currentOffset - 1)}
            className="rounded-lg border border-[#E4E8EF] bg-white px-3 py-1 text-sm transition-colors hover:bg-[#F1F4F9]"
          >
            ← Prev Week
          </button>
          <div className="text-lg font-semibold text-[#0F1620]">{formatWeekLabel(weekDates)}</div>
          <button
            type="button"
            onClick={() => setWeekOffset((currentOffset) => currentOffset + 1)}
            className="rounded-lg border border-[#E4E8EF] bg-white px-3 py-1 text-sm transition-colors hover:bg-[#F1F4F9]"
          >
            Next Week →
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : null}

      {!loading && error ? (
        <section className="rounded-xl border border-[#E4E8EF] bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-[#DC2626]">{error}</p>
          <button
            type="button"
            onClick={fetchRoster}
            className="rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6]"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-xl border border-[#E4E8EF] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[220px] border-b border-r border-[#E4E8EF] bg-white p-3" />
                  {weekDates.map((date) => {
                    const dateKey = getDateKey(date);
                    const isToday = dateKey === todayKey;

                    return (
                      <th
                        key={dateKey}
                        className={`border-b border-r border-[#E4E8EF] p-3 text-center text-sm font-semibold last:border-r-0 ${
                          isToday ? "bg-[#EEF3FD] text-[#2F6FED]" : "bg-[#F8F9FB] text-[#4A5568]"
                        }`}
                      >
                        <div>{date.toLocaleDateString(undefined, { weekday: "short" })}</div>
                        <div className="mt-1 font-['DM_Mono'] text-xs">
                          {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {rosterData.map((employee) => {
                  const totalHours = calculateEmployeeWeeklyHours(employee);
                  const capAlert = totalHours >= Number(employee.max_hours_per_week) - 2;

                  return (
                    <tr key={employee.id}>
                      <td className="sticky left-0 z-10 min-w-[220px] border-r border-t border-[#E4E8EF] bg-white p-3 align-top">
                        <div className="space-y-2">
                          <div className="font-semibold text-[#0F1620]">{employee.name}</div>
                          <span className="inline-flex rounded-full bg-[#EEF3FD] px-2 py-0.5 text-xs font-medium text-[#2F6FED]">
                            {employee.department}
                          </span>
                          <div className="font-['DM_Mono'] text-xs font-medium text-[#4A5568]">
                            {formatHours(totalHours)} / {employee.max_hours_per_week} hrs
                          </div>
                          {capAlert ? (
                            <span className="inline-flex rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-medium text-[#D97706]">
                              ⚠ Cap Alert
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {weekDates.map((date) => {
                        const dateKey = getDateKey(date);
                        const assignment = findAssignmentForDate(employee, dateKey);

                        return (
                          <td key={`${employee.id}-${dateKey}`} className="min-w-[136px] p-0 align-top">
                            <RosterCell
                              key={`${employee.id}-${dateKey}-${assignment?.id || "empty"}-${assignment?.status || "none"}`}
                              assignment={assignment}
                              employee={employee}
                              date={date}
                              onOpenAssign={openAssignModal}
                              onOpenSwap={openSwapModal}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rosterData.length === 0 ? (
            <div className="border-t border-[#E4E8EF] bg-white p-6 text-sm text-[#8A96A8]">
              No employees or assignments found for this week.
            </div>
          ) : null}
        </div>
      ) : null}

      {modal.open && modal.type === "assign" ? (
        <AssignShiftModal
          employee={modal.employee}
          date={modal.date}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      ) : null}

      {modal.open && modal.type === "swap" ? (
        <SwapRequestModal
          assignment={modal.assignment}
          employee={modal.employee}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      ) : null}
    </main>
  );
}

export default RosterDashboard;
