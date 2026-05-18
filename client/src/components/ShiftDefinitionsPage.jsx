import "../index.css";
import { useCallback, useEffect, useState } from "react";
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

function ShiftDefinitionsPage() {
  const { getToken } = useRoster();
  const [form, setForm] = useState(emptyForm);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setError("");

    try {
      await apiFetch(
        `shifts/${shiftId}`,
        {
          method: "DELETE",
        },
        getToken()
      );

      await fetchTemplates();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] font-['Figtree'] text-[#0F1620]">
      <h1 className="mb-6 text-2xl font-bold text-[#0F1620]">Shift Templates</h1>

      <section className="mb-6 rounded-xl border border-[#E4E8EF] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#0F1620]">Create New Template</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[#4A5568]">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#4A5568]">Start Time</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(event) => updateForm("start_time", event.target.value)}
                className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#4A5568]">End Time</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(event) => updateForm("end_time", event.target.value)}
                className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#4A5568]">Break Minutes</span>
              <input
                type="number"
                min="0"
                value={form.break_minutes}
                onChange={(event) => updateForm("break_minutes", event.target.value)}
                className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F6FED]"
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
                  className="h-10 w-16 rounded-lg border border-[#E4E8EF] bg-white p-1"
                />
                <input
                  type="text"
                  value={form.color_code}
                  onChange={(event) => updateForm("color_code", event.target.value)}
                  className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 font-['DM_Mono'] text-sm focus:ring-2 focus:ring-[#2F6FED]"
                  required
                />
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-[#DC2626]">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Creating Template" : "Create Template"}
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
          <div className="rounded-xl border border-[#E4E8EF] bg-white p-8 text-center text-sm text-[#8A96A8] shadow-sm">
            No shift templates found
          </div>
        ) : null}

        {!loading && templates.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="relative overflow-hidden rounded-xl border border-[#E4E8EF] bg-white p-4 pl-6 shadow-sm"
              >
                <div
                  className="absolute left-0 top-0 h-full w-3 rounded-l"
                  style={{ backgroundColor: template.color_code }}
                />
                <div className="font-semibold text-[#0F1620]">{template.name}</div>
                <div className="mt-2 font-['DM_Mono'] text-sm text-[#4A5568]">
                  {template.start_time} - {template.end_time}
                </div>
                <div className="mt-1 text-xs text-[#8A96A8]">{template.break_minutes} min break</div>
                <button
                  type="button"
                  onClick={() => handleDelete(template.id)}
                  className="mt-4 text-xs text-[#DC2626] hover:underline"
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default ShiftDefinitionsPage;
