import "../index.css";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

const colorCodeRegex = /^#[0-9A-Fa-f]{6}$/;

const emptyForm = {
  name: "",
  start_time: "",
  end_time: "",
  break_minutes: "0",
  color_code: "#2F6FED",
};

/* ─── Confirmation dialog ─────────────────────────────────────────── */
function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return createPortal(
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 font-['Figtree'] backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-confirm-panel w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF2F2]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[#0F1620]">{title}</h3>
        <p className="mt-1 text-sm text-[#4A5568]">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[#E4E8EF] bg-white px-4 py-2.5 text-sm font-medium text-[#0F1620] transition-all hover:bg-[#F1F4F9] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#B91C1C] active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ShiftDefinitionsPage() {
  const { getToken } = useRoster();
  const [form, setForm] = useState(emptyForm);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch("shifts", {}, getToken());
      setTemplates(result);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const updateForm = (key, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!colorCodeRegex.test(form.color_code)) {
      setError("Invalid color code format");
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch(
        "shifts",
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            start_time: form.start_time,
            end_time: form.end_time,
            break_minutes: Number(form.break_minutes),
            color_code: form.color_code,
          }),
        },
        getToken()
      );

      setForm(emptyForm);
      await fetchTemplates();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shiftId) => {
    setConfirmDeleteId(null);
    setError("");
    try {
      await apiFetch(
        `shifts/${shiftId}`,
        { method: "DELETE" },
        getToken()
      );
      await fetchTemplates();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <main className="bg-[#F8F9FB] px-6 py-8 font-['Figtree'] text-[#0F1620] md:px-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-[#0F1620]">Shift Templates</h1>

      <section className="mb-6 rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#0F1620]">Create New Template</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
              required
            />
          </label>

            <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">Start Time</span>
            <input
              type="time"
              value={form.start_time}
              onChange={(event) => updateForm("start_time", event.target.value)}
              className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">End Time</span>
            <input
              type="time"
              value={form.end_time}
              onChange={(event) => updateForm("end_time", event.target.value)}
              className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">Break Minutes</span>
            <input
              type="number"
              min="0"
              value={form.break_minutes}
              onChange={(event) => updateForm("break_minutes", event.target.value)}
              className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
              required
            />
          </label>

            <div>
              <span className="mb-1 block text-xs font-medium text-[#4A5568]">Color Code</span>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={colorCodeRegex.test(form.color_code) ? form.color_code : "#2F6FED"}
                  onChange={(event) => updateForm("color_code", event.target.value)}
                  className="min-h-[44px] w-16 rounded-lg border border-[#E4E8EF] bg-white p-1"
                />
                <input
                  type="text"
                  value={form.color_code}
                  onChange={(event) => updateForm("color_code", event.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 font-['DM_Mono'] text-sm focus:ring-2 focus:ring-[#2F6FED]"
                  required
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#DC2626]">
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-[#2F6FED] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1D5CD6] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create Template"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-[#0F1620]">Existing Templates</h2>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E8EF] border-t-[#2F6FED]" />
          </div>
        ) : null}

        {!loading && templates.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[#E4E8EF] py-14 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F4F9] text-[#8A96A8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
              </svg>
            </span>
            <p className="text-sm font-medium text-[#4A5568]">No shift templates yet</p>
            <p className="mt-0.5 text-xs text-[#8A96A8]">Use the form above to create your first template</p>
          </div>
        ) : null}

        {!loading && templates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="group relative overflow-hidden rounded-xl border border-[#E4E8EF] bg-white p-4 pl-6 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md"
              >
                <div
                  className="absolute left-0 top-0 h-full w-[5px] rounded-l"
                  style={{ backgroundColor: template.color_code }}
                />
                <div className="font-semibold text-[#0F1620]">{template.name}</div>
                <div className="mt-2 font-['DM_Mono'] text-sm text-[#4A5568]">
                  {template.start_time} – {template.end_time}
                </div>
                <div className="mt-1 text-xs text-[#8A96A8]">{template.break_minutes} min break</div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(template.id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#DC2626] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#FEF2F2] active:scale-[0.97]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                    </svg>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {confirmDeleteId !== null && (
        <ConfirmDialog
          title="Delete shift template?"
          message="This template will be permanently removed. Any existing assignments using it will be unaffected."
          confirmLabel="Delete Template"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </main>
  );
}

export default ShiftDefinitionsPage;
