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
    <main className="min-h-screen bg-[#F8F9FB] font-['Figtree'] text-[#0F1620]">
      <h1 className="mb-6 text-2xl font-bold text-[#0F1620]">Swap Requests</h1>

      {loading ? <LoadingSpinner /> : null}

      {!loading && error ? <p className="mb-4 text-sm text-[#DC2626]">{error}</p> : null}

      {!loading ? (
        <section className="overflow-hidden rounded-xl border border-[#E4E8EF] bg-white shadow-sm">
          {swaps.length === 0 ? (
            <div className="py-16 text-center text-[#8A96A8]">✓ No pending swap requests</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                      Requester
                    </th>
                    <th className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                      Their Shift
                    </th>
                    <th className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                      Date
                    </th>
                    <th className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                      Target Employee
                    </th>
                    <th className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                      Reason
                    </th>
                    <th className="border-b border-[#E4E8EF] bg-[#F8F9FB] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {swaps.map((swap) => (
                    <tr key={swap.id} className="border-b border-[#E4E8EF] transition-colors hover:bg-[#F8F9FB]">
                      <td className="px-4 py-3 text-sm text-[#0F1620]">{swap.from_employee_name}</td>
                      <td className="px-4 py-3 text-sm text-[#0F1620]">
                        <div className="font-semibold">{swap.shift_name}</div>
                        <div className="font-['DM_Mono'] text-xs text-[#8A96A8]">
                          {swap.shift_time?.start_time} - {swap.shift_time?.end_time}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0F1620]">{formatDate(swap.shift_date)}</td>
                      <td className="px-4 py-3 text-sm text-[#0F1620]">{swap.to_employee_name}</td>
                      <td className="px-4 py-3 text-sm text-[#0F1620]" title={swap.reason || ""}>
                        {truncateReason(swap.reason)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0F1620]">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => processSwap(swap.id, "Approved")}
                            className="rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#15803D]"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => processSwap(swap.id, "Rejected")}
                            className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C]"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
