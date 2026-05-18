import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import apiFetch from "../utils/api.js";

export const RosterContext = createContext(null);

let activeTokenRef = { current: null };

export function getToken() {
  return activeTokenRef.current;
}

function getMondayForOffset(offset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);

  monday.setDate(today.getDate() - daysSinceMonday + offset * 7);

  return monday;
}

function getISOWeek(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);

  return {
    year: utcDate.getUTCFullYear(),
    weekNumber,
  };
}

export function RosterProvider({ children }) {
  const tokenRef = useRef(null);
  activeTokenRef = tokenRef;

  const [currentUser, setCurrentUserState] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [shifts, setShifts] = useState([]);
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);

  const setCurrentUser = useCallback((user, token) => {
    tokenRef.current = token;
    setCurrentUserState(user);
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    setCurrentUserState(null);
    setEmployees([]);
    setAssignments({});
    setShifts([]);
    setPendingSwapsCount(0);
  }, []);

  const getWeekDates = useCallback((offset) => {
    const monday = getMondayForOffset(offset);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, []);

  const getISOWeekString = useCallback((offset) => {
    const [monday] = getWeekDates(offset);
    const { year, weekNumber } = getISOWeek(monday);

    return `${year}-${String(weekNumber).padStart(2, "0")}`;
  }, [getWeekDates]);

  const fetchRosterData = useCallback(async (offset) => {
    const week = getISOWeekString(offset);
    const roster = await apiFetch(`roster?week=${week}`, {}, tokenRef.current);
    const nextAssignments = {};

    for (const employee of roster.employees || []) {
      nextAssignments[employee.id] = {};

      for (const day of employee.assignments || []) {
        nextAssignments[employee.id][day.date] = day.assignment;
      }
    }

    setWeekOffset(offset);
    setEmployees(roster.employees || []);
    setAssignments(nextAssignments);

    return roster;
  }, [getISOWeekString]);

  const value = useMemo(
    () => ({
      currentUser,
      weekOffset,
      employees,
      assignments,
      shifts,
      pendingSwapsCount,
      setWeekOffset,
      setEmployees,
      setAssignments,
      setShifts,
      setPendingSwapsCount,
      setCurrentUser,
      logout,
      getWeekDates,
      getISOWeekString,
      fetchRosterData,
    }),
    [
      currentUser,
      weekOffset,
      employees,
      assignments,
      shifts,
      pendingSwapsCount,
      setCurrentUser,
      logout,
      getWeekDates,
      getISOWeekString,
      fetchRosterData,
    ]
  );

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

export function useRoster() {
  const context = useContext(RosterContext);

  if (!context) {
    throw new Error("useRoster must be used within a RosterProvider");
  }

  return context;
}
