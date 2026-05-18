import "../index.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ButtonSpinner() {
  return (
    <svg className="mr-2 inline h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function SwapRequestModal({ isOpen = true, onClose, assignment, employee = null, onSuccess = null }) {
  const { getToken } = useRoster();
  const [peers, setPeers] = useState([]);
  const [selectedPeerId, setSelectedPeerId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const department = useMemo(() => {
    return assignment?.department || assignment?.employee_department || employee?.department || "";
  }, [assignment?.department, assignment?.employee_department, employee?.department]);

  const currentEmployeeId = useMemo(() => {
    return assignment?.user_id || employee?.id || "";
  }, [assignment?.user_id, employee?.id]);

  const resetState = () => {
    setPeers([]);
    setSelectedPeerId("");
    setReason("");
    setError("");
    setSuccessMessage("");
    setIsFetching(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchPeers() {
      resetState();
      if (!department) {
        setError("Department is required to load colleagues");
        return;
      }
      setIsFetching(true);
      try {
        const result = await apiFetch(
          `users?department=${encodeURIComponent(department)}`,
          {},
          getToken()
        );
        const eligiblePeers = result.filter((peer) => Number(peer.id) !== Number(currentEmployeeId));
        if (isMounted) setPeers(eligiblePeers);
      } catch (caughtError) {
        if (isMounted) setError(caughtError.message);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    }
    if (isOpen && assignment) fetchPeers();
    return () => { isMounted = false; };
  }, [assignment, currentEmployeeId, department, getToken, isOpen]);

  /* Escape to close */
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    try {
      await apiFetch(
        "swaps",
        {
          method: "POST",
          body: JSON.stringify({
            from_assignment_id: assignment.id,
            to_user_id: selectedPeerId,
            reason,
          }),
        },
        getToken()
      );
      setSuccessMessage("Swap request sent successfully");
      if (onSuccess) {
        window.setTimeout(() => { onSuccess(); }, 1500);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !assignment) return null;

  const submitDisabled = isFetching || isSubmitting || peers.length === 0 || !selectedPeerId || Boolean(successMessage);

  return createPortal(
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-black/40 font-['Figtree'] backdrop-blur-[3px] sm:items-center sm:px-4 sm:py-6"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-modal-title"
    >
      <section className="animate-modal-panel flex min-h-screen w-full flex-col overflow-y-auto bg-white shadow-2xl ring-1 ring-black/[0.06] sm:min-h-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-[#E4E8EF] px-6 py-5">
          <div>
            <h2 id="swap-modal-title" className="text-base font-bold tracking-tight text-[#0F1620]">
              Request Shift Swap
            </h2>
            <p className="mt-0.5 text-sm text-[#8A96A8]">Submit a swap request for approval</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8A96A8] transition-all hover:bg-[#F1F4F9] hover:text-[#0F1620] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Shift info pill */}
        <div className="mx-6 mt-5 rounded-xl border border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A96A8]">Shift Details</p>
          <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
            <span className="text-[#4A5568]">Date</span>
            <span className="font-medium text-[#0F1620]">{formatDate(assignment.date)}</span>
            <span className="text-[#4A5568]">Shift</span>
            <span className="font-medium text-[#0F1620]">{assignment.shift_name}</span>
            <span className="text-[#4A5568]">Time</span>
            <span className="font-['DM_Mono'] text-xs font-medium text-[#0F1620]">
              {assignment.start_time} – {assignment.end_time}
            </span>
          </div>
        </div>

        <form className="flex flex-1 flex-col px-6 py-5" onSubmit={handleSubmit}>
          {/* Colleague selector */}
          <div>
            <label htmlFor="peer-select" className="block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
              Swap With
            </label>
            <div className="relative mt-1.5">
              <select
                id="peer-select"
                value={selectedPeerId}
                onChange={(event) => setSelectedPeerId(event.target.value)}
                className="w-full appearance-none rounded-lg border border-[#E4E8EF] bg-white px-3 py-2.5 pr-8 text-sm text-[#0F1620] transition-shadow focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isFetching || peers.length === 0 || Boolean(successMessage)}
                required
              >
                <option value="">{isFetching ? "Loading colleagues…" : "Select colleague"}</option>
                {peers.map((peer) => (
                  <option key={peer.id} value={peer.id}>{peer.name}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A96A8]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>

          {/* Loading skeleton */}
          {isFetching && (
            <div className="mt-3 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#E4E8EF]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#E4E8EF]" />
            </div>
          )}

          {/* No peers state */}
          {!isFetching && peers.length === 0 && !error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] px-3 py-2.5 text-sm text-[#8A96A8]">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              No colleagues available in your department
            </div>
          )}

          {/* Reason */}
          <div className="mt-4">
            <label htmlFor="swap-reason" className="block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
              Reason <span className="ml-1 normal-case font-normal text-[#8A96A8]">(optional)</span>
            </label>
            <textarea
              id="swap-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Briefly explain why you need the swap…"
              className="mt-1.5 min-h-[80px] w-full resize-none rounded-lg border border-[#E4E8EF] bg-white px-3 py-2.5 text-sm placeholder-[#CBD3DF] transition-shadow focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 disabled:opacity-60"
              disabled={Boolean(successMessage)}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#DC2626]">
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5 text-sm font-medium text-[#16A34A]">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-4 py-2.5 text-sm font-medium text-[#0F1620] transition-all hover:bg-[#F1F4F9] hover:border-[#CBD3DF] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1D5CD6] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED] focus-visible:ring-offset-2"
            >
              {isSubmitting && <ButtonSpinner />}
              {isSubmitting ? "Requesting…" : "Request Swap"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}

export default SwapRequestModal;
