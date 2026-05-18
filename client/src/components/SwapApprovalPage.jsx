import "../index.css";
import { useEffect, useState } from "react";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

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

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const processSwap = async (swapId, status) => {
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
          body: JSON.stringify({
            status,
            manager_id: currentUser.id,
          }),
        },
        getToken()
      );

      showToast(status === "Approved" ? "Swap approved successfully" : "Swap rejected");
    } catch (caughtError) {
      setSwaps(previousSwaps);
      setPendingSwapsCount(previousSwaps.length);
      setError(caughtError.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] px-4 py-6 font-['Figtree'] text-[#0F1620] md:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-[#0F1620]">Swap Requests</h1>

      {loading ? <LoadingSpinner /> : null}

      {!loading && error ? (
        <div className="mb-4 w-full rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
      ) : null}

      {!loading ? (
        <section className="mx-auto w-full max-w-2xl">
          {swaps.length === 0 ? (
            <div className="rounded-xl border border-[#E4E8EF] bg-white py-16 text-center text-[#8A96A8] shadow-sm">
              No pending swap requests
            </div>
          ) : (
            <div className="space-y-4">
              {swaps.map((swap) => (
                <article key={swap.id} className="rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-[#0F1620]">{swap.from_employee_name}</p>
                      <p className="mt-1 break-words text-sm text-[#4A5568]">Target: {swap.to_employee_name}</p>
                      <p className="mt-2 break-words text-sm text-[#0F1620]">
                        <span className="font-semibold">{swap.shift_name}</span>
                      </p>
                      <p className="font-['DM_Mono'] text-xs text-[#8A96A8]">
                        {swap.shift_time?.start_time} - {swap.shift_time?.end_time}
                      </p>
                      <p className="mt-1 text-sm text-[#4A5568]">{formatDate(swap.shift_date)}</p>
                      {swap.reason ? (
                        <p className="mt-2 break-words text-sm text-[#4A5568]" title={swap.reason}>
                          {truncateReason(swap.reason)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <button
                        type="button"
                        onClick={() => processSwap(swap.id, "Approved")}
                        className="min-h-[44px] w-full rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] sm:w-auto"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => processSwap(swap.id, "Rejected")}
                        className="min-h-[44px] w-full rounded-lg bg-[#DC2626] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C] sm:w-auto"
                      >
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
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-[#0F1620] px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

export default SwapApprovalPage;
