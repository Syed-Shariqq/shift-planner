import "../index.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

function ButtonSpinner() {
  return (
    <svg className="mr-2 inline h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function EditShiftModal({ assignment, employee, date, onClose, onSuccess }) {
  const { getToken } = useRoster();
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState(assignment?.shift_id || "");
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirmation state for delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchShifts() {
      setError("");
      setIsFetching(true);
      try {
        const result = await apiFetch("shifts", {}, getToken());
        if (isMounted) setShifts(result);
      } catch (caughtError) {
        if (isMounted) setError(caughtError.message);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    }
    fetchShifts();
    return () => { isMounted = false; };
  }, [getToken]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const selectedShift = useMemo(
    () => shifts.find((shift) => Number(shift.id) === Number(selectedShiftId)) || null,
    [selectedShiftId, shifts]
  );

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (String(selectedShiftId) === String(assignment.shift_id)) {
      onClose(); // No changes
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await apiFetch(
        `assignments/${assignment.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            shift_id: selectedShiftId,
          }),
        },
        getToken()
      );
      await onSuccess("Shift updated successfully", "success");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError("");
    setIsDeleting(true);
    try {
      await apiFetch(
        `assignments/${assignment.id}`,
        {
          method: "DELETE",
        },
        getToken()
      );
      await onSuccess("Shift removed successfully", "success");
    } catch (caughtError) {
      setError(caughtError.message);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const canSubmit = !isSubmitting && !isDeleting && !isFetching && Boolean(selectedShiftId);

  return createPortal(
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 font-['Figtree'] backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <section className="animate-modal-panel flex min-h-screen w-full flex-col overflow-y-auto bg-white shadow-2xl ring-1 ring-black/[0.06] sm:min-h-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl">
        <header className="flex items-start justify-between border-b border-[#E4E8EF] px-6 py-5">
          <div>
            <h2 id="edit-modal-title" className="text-base font-bold tracking-tight text-[#0F1620]">
              Edit Shift
            </h2>
            <p className="mt-0.5 text-sm text-[#8A96A8]">
              {employee.name}
              <span className="mx-1.5 text-[#CBD3DF]">·</span>
              {formatDate(date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8A96A8] transition-all hover:bg-[#F1F4F9] hover:text-[#0F1620] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleUpdate} className="px-6 py-5">
          <div>
            <label htmlFor="shift-select" className="block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
              Shift Template
            </label>
            <div className="relative mt-1.5">
              <select
                id="shift-select"
                value={selectedShiftId}
                onChange={(event) => setSelectedShiftId(event.target.value)}
                className="w-full appearance-none rounded-lg border border-[#E4E8EF] bg-white px-3 py-2.5 pr-8 text-sm text-[#0F1620] transition-shadow focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isFetching || isSubmitting || isDeleting}
                required
              >
                <option value="">{isFetching ? "Loading shifts…" : "Select a shift template"}</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} · {shift.start_time}–{shift.end_time}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A96A8]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>

          {isFetching && (
            <div className="mt-3 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-[#E4E8EF]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#E4E8EF]" />
            </div>
          )}

          {selectedShift && (
            <div className="mt-4 rounded-xl border border-[#E4E8EF] bg-[#F8F9FB] p-3.5">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-lg shadow-sm" style={{ backgroundColor: selectedShift.color_code }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#0F1620]">{selectedShift.name}</div>
                  <div className="mt-0.5 font-['DM_Mono'] text-xs text-[#4A5568]">
                    {selectedShift.start_time} – {selectedShift.end_time}
                    {selectedShift.break_minutes > 0 && (
                      <span className="ml-2 text-[#8A96A8]">· {selectedShift.break_minutes} min break</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-[#EEF3FD] px-2.5 py-1 font-['DM_Mono'] text-xs font-semibold text-[#2F6FED]">
                  {formatHours(calculateShiftHours(date, selectedShift))} hrs
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#DC2626]">
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          {showDeleteConfirm ? (
            <div className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-center ring-1 ring-inset ring-[#FCA5A5]/20">
              <h3 className="text-sm font-bold text-[#991B1B]">Delete this shift?</h3>
              <p className="mt-1 text-xs text-[#DC2626]">This action can be reverted by assigning a new shift later.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg border border-[#FECACA] bg-white px-3 py-2 text-sm font-medium text-[#991B1B] hover:bg-[#FEF2F2] active:scale-[0.98] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center rounded-lg bg-[#DC2626] px-3 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] active:scale-[0.98] disabled:opacity-60"
                >
                  {isDeleting ? <ButtonSpinner /> : "Yes, Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!canSubmit}
                className="min-h-[44px] flex-1 rounded-lg border border-[#E4E8EF] bg-white px-4 py-2.5 text-sm font-medium text-[#DC2626] transition-all hover:bg-[#FEF2F2] hover:border-[#FECACA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] sm:flex-none"
              >
                Delete Shift
              </button>
              <div className="flex flex-1 gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] flex-1 rounded-lg border border-[#E4E8EF] bg-white px-4 py-2.5 text-sm font-medium text-[#0F1620] transition-all hover:bg-[#F1F4F9] hover:border-[#CBD3DF] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED] sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1D5CD6] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED] focus-visible:ring-offset-2"
                >
                  {isSubmitting && <ButtonSpinner />}
                  {isSubmitting ? "Updating…" : "Update Shift"}
                </button>
              </div>
            </div>
          )}
        </form>
      </section>
    </div>,
    document.body
  );
}

export default EditShiftModal;
