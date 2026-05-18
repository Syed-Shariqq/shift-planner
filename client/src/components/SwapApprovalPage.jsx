import "../index.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

/* ─── Confirmation dialog ────────────────────────────────────────── */
function ConfirmDialog({ title, message, confirmLabel, confirmVariant = "primary", onConfirm, onCancel }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const confirmClass = confirmVariant === "danger"
    ? "flex-1 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#B91C1C] active:scale-[0.98]"
    : "flex-1 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#15803D] active:scale-[0.98]";

  return createPortal(
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 font-['Figtree'] backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-confirm-panel w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]">
        <h3 className="text-base font-bold text-[#0F1620]">{title}</h3>
        <p className="mt-1.5 text-sm text-[#4A5568]">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[#E4E8EF] bg-white px-4 py-2.5 text-sm font-medium text-[#0F1620] transition-all hover:bg-[#F1F4F9] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncateReason(reason) {
  if (!reason) {
    return "";
  }

  return reason.length > 40 ? `${reason.slice(0, 40)}...` : reason;
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E8EF] border-t-[#2F6FED]" />
    </div>
  );
}

function SwapApprovalPage() {
  const { currentUser, getToken, setPendingSwapsCount } = useRoster();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("default");
  const [pendingAction, setPendingAction] = useState(null); // { swapId, status }

  useEffect(() => {
    let isMounted = true;

    async function fetchPendingSwaps() {
      setLoading(true);
      setError("");

      try {
        const result = await apiFetch("swaps/pending", {}, getToken());

        if (isMounted) {
          setSwaps(result);
          setPendingSwapsCount(result.length);
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

    fetchPendingSwaps();

    return () => {
      isMounted = false;
    };
  }, [getToken, setPendingSwapsCount]);

  const showToast = (message, type = "default") => {
    setToast(message);
    setToastType(type);
    window.setTimeout(() => { setToast(""); }, 3000);
  };

  /* Called after the user confirms in the dialog */
  const processSwap = async (swapId, status) => {
    setPendingAction(null);
    setError("");
    const previousSwaps = swaps;
    const nextSwaps = swaps.filter((swap) => swap.id !== swapId);
    setSwaps(nextSwaps);
    setPendingSwapsCount(nextSwaps.length);
    try {
      await apiFetch(
        `swaps/${swapId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, manager_id: currentUser.id }),
        },
        getToken()
      );
      showToast(
        status === "Approved" ? "Swap approved successfully" : "Swap rejected",
        status === "Approved" ? "success" : "default"
      );
    } catch (caughtError) {
      setSwaps(previousSwaps);
      setPendingSwapsCount(previousSwaps.length);
      setError(caughtError.message);
    }
  };

  const requestConfirm = (swapId, status) => {
    setPendingAction({ swapId, status });
  };

  return (
    <main className="bg-[#F8F9FB] px-4 py-6 font-['Figtree'] text-[#0F1620] sm:px-6 lg:px-8 lg:py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-[#0F1620]">Swap Requests</h1>

      {loading ? <LoadingSpinner /> : null}

      {!loading && error ? (
        <div className="mb-4 w-full rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
      ) : null}

      {!loading ? (
        <section className="mx-auto w-full max-w-3xl">
          {swaps.length === 0 ? (
            <div className="rounded-xl border border-[#E4E8EF] bg-white py-16 text-center text-[#8A96A8] shadow-sm">
              No pending swap requests
            </div>
          ) : (
          <div className="space-y-3">
              {swaps.map((swap) => (
                <article key={swap.id} className="rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {/* Employee flow */}
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF3FD] text-xs font-bold text-[#2F6FED]">
                          {swap.from_employee_name?.[0]}
                        </span>
                        <span className="text-sm font-semibold text-[#0F1620]">{swap.from_employee_name}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A96A8" strokeWidth="2" strokeLinecap="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1F4F9] text-xs font-bold text-[#4A5568]">
                          {swap.to_employee_name?.[0]}
                        </span>
                        <span className="text-sm text-[#4A5568]">{swap.to_employee_name}</span>
                      </div>
                      {/* Shift details */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="rounded-full bg-[#F1F4F9] px-2.5 py-0.5 text-xs font-semibold text-[#0F1620]">
                          {swap.shift_name}
                        </span>
                        <span className="font-['DM_Mono'] text-xs text-[#8A96A8]">
                          {swap.shift_time?.start_time} – {swap.shift_time?.end_time}
                        </span>
                        <span className="text-xs text-[#8A96A8]">{formatDate(swap.shift_date)}</span>
                      </div>
                      {swap.reason && (
                        <p className="mt-2 text-xs text-[#4A5568]" title={swap.reason}>
                          {truncateReason(swap.reason)}
                        </p>
                      )}
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                      <button
                        type="button"
                        onClick={() => requestConfirm(swap.id, "Approved")}
                        className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#15803D] active:scale-[0.97] sm:w-auto"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => requestConfirm(swap.id, "Rejected")}
                        className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] bg-white px-3 py-2 text-xs font-semibold text-[#DC2626] transition-all hover:bg-[#FEF2F2] active:scale-[0.97] sm:w-auto"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
            toastType === "success" ? "bg-[#16A34A]" : "bg-[#0F1620]"
          }`}
        >
          {toastType === "success" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
          {toast}
        </div>
      ) : null}

      {pendingAction !== null && (
        <ConfirmDialog
          title={pendingAction.status === "Approved" ? "Approve this swap?" : "Reject this swap?"}
          message={
            pendingAction.status === "Approved"
              ? "The shift will be reassigned to the requesting employee's colleague."
              : "The swap request will be marked as rejected and no changes will be made."
          }
          confirmLabel={pendingAction.status === "Approved" ? "Approve" : "Reject"}
          confirmVariant={pendingAction.status === "Approved" ? "primary" : "danger"}
          onConfirm={() => processSwap(pendingAction.swapId, pendingAction.status)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}

export default SwapApprovalPage;
