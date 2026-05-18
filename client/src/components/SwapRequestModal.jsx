import "../index.css";
import { useEffect, useState } from "react";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function SwapRequestModal({ assignment, employee, onClose, onSuccess }) {
  const { getToken } = useRoster();
  const [peers, setPeers] = useState([]);
  const [selectedPeerId, setSelectedPeerId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchPeers() {
      setError("");
      setIsFetching(true);

      try {
        const result = await apiFetch(
          `users?department=${encodeURIComponent(employee.department)}`,
          {},
          getToken()
        );
        const eligiblePeers = result.filter((peer) => Number(peer.id) !== Number(employee.id));

        if (isMounted) {
          setPeers(eligiblePeers);
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

    fetchPeers();

    return () => {
      isMounted = false;
    };
  }, [employee.department, employee.id, getToken]);

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
      window.setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled = isFetching || isSubmitting || peers.length === 0 || !selectedPeerId || Boolean(successMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm font-['Figtree']">
      <section className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between border-b border-[#E4E8EF] pb-4">
          <h2 className="text-lg font-bold text-[#0F1620]">Request Shift Swap</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[#8A96A8] transition-colors hover:text-[#0F1620]"
            aria-label="Close swap request modal"
          >
            ×
          </button>
        </header>

        <div className="rounded-lg bg-[#F1F4F9] p-3 text-sm text-[#0F1620]">
          <div>
            <span className="font-medium text-[#4A5568]">Date:</span> {formatDate(assignment.date)}
          </div>
          <div className="mt-1">
            <span className="font-medium text-[#4A5568]">Shift:</span> {assignment.shift_name}
          </div>
          <div className="mt-1">
            <span className="font-medium text-[#4A5568]">Time:</span> {assignment.start_time}–{assignment.end_time}
          </div>
        </div>

        <form className="mt-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#4A5568]">
            Select colleague to swap with
            <select
              value={selectedPeerId}
              onChange={(event) => setSelectedPeerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
              disabled={isFetching || peers.length === 0 || Boolean(successMessage)}
              required
            >
              <option value="">{isFetching ? "Loading colleagues..." : "Select colleague"}</option>
              {peers.map((peer) => (
                <option key={peer.id} value={peer.id}>
                  {peer.name}
                </option>
              ))}
            </select>
          </label>

          {!isFetching && peers.length === 0 ? (
            <p className="mt-2 text-sm text-[#8A96A8]">No colleagues available in your department</p>
          ) : null}

          <label className="mt-4 block text-sm font-medium text-[#4A5568]">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
              disabled={Boolean(successMessage)}
            />
          </label>

          {error ? (
            <div className="mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-3 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-sm text-[#16A34A]">
              {successMessage}
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
              disabled={submitDisabled}
              className="w-full rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Requesting..." : "Request Swap"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SwapRequestModal;
