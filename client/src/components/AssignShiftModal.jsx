import "../index.css";
import { useEffect, useMemo, useState } from "react";
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

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildDateTime(date, time) {
  const [hours, minutes, secondsWithFraction = "0"] = String(time).split(":");
  const seconds = secondsWithFraction.split(".")[0];
  const dateTime = new Date(date);

  dateTime.setHours(Number(hours), Number(minutes), Number(seconds), 0);

  return dateTime;
}

function calculateShiftHours(date, shift) {
  const startDate = buildDateTime(date, shift.start_time);
  const endDate = buildDateTime(date, shift.end_time);

  if (endDate < startDate) {
    endDate.setTime(endDate.getTime() + millisecondsInOneDay);
  }

  return (endDate.getTime() - startDate.getTime()) / millisecondsInOneHour - Number(shift.break_minutes || 0) / 60;
}

function formatHours(hours) {
  return Number(hours).toFixed(1).replace(".0", "");
}

function AssignShiftModal({ employee, date, onClose, onSuccess }) {
  const { getToken } = useRoster();
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    let isMounted = true;

    async function fetchShifts() {
      setError("");
      setIsFetching(true);

      try {
        const result = await apiFetch("shifts", {}, getToken());

        if (isMounted) {
          setShifts(result);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError.message);
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    }

    fetchShifts();

    return () => {
      isMounted = false;
    };
  }, [getToken]);

  useEffect(() => {
    setError("");
    setSelectedShiftId("");
  }, [employee?.id, date?.getTime()]);

  const selectedShift = useMemo(
    () => shifts.find((shift) => Number(shift.id) === Number(selectedShiftId)) || null,
    [selectedShiftId, shifts]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await apiFetch(
        "assignments",
        {
          method: "POST",
          body: JSON.stringify({
            user_id: employee.id,
            shift_id: selectedShiftId,
            date: getDateKey(date),
          }),
        },
        getToken()
      );

      await onSuccess();
      onClose();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm font-['Figtree']">
      <section className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between border-b border-[#E4E8EF] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F1620]">Assign Shift</h2>
            <p className="mt-1 text-sm text-[#8A96A8]">
              {employee.name} · {formatDate(date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[#8A96A8] transition-colors hover:text-[#0F1620]"
            aria-label="Close assign shift modal"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#4A5568]">
            Shift
            <select
              value={selectedShiftId}
              onChange={(event) => setSelectedShiftId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
              disabled={isFetching}
              required
            >
              <option value="">{isFetching ? "Loading shifts..." : "Select a shift"}</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} · {shift.start_time}–{shift.end_time}
                </option>
              ))}
            </select>
          </label>

          {selectedShift ? (
            <div className="mt-4 rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] p-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: selectedShift.color_code }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#0F1620]">{selectedShift.name}</div>
                  <div className="mt-1 text-sm text-[#4A5568]">
                    {selectedShift.start_time}–{selectedShift.end_time}
                  </div>
                </div>
                <div className="font-['DM_Mono'] text-sm font-medium text-[#0F1620]">
                  {formatHours(calculateShiftHours(date, selectedShift))} hrs
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E4E8EF] bg-white px-4 py-2 text-sm font-medium text-[#0F1620] transition-colors hover:bg-[#F1F4F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isFetching || !selectedShiftId}
              className="w-full rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Assigning..." : "Assign Shift"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AssignShiftModal;
