import "../index.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useRoster();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await apiFetch("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setCurrentUser(result.user, result.token);

      if (result.user.role === "Admin") {
        navigate("/admin/dashboard", { replace: true });
      }

      if (result.user.role === "Employee") {
        navigate("/employee/calendar", { replace: true });
      }
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FB] px-4 py-8 font-['Figtree']">
      <section className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#2F6FED]">ShiftPlanner</h1>
          <p className="mt-2 text-sm text-[#8A96A8]">Workforce Scheduling System</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#0F1620]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm text-[#0F1620] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#0F1620]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm text-[#0F1620] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
