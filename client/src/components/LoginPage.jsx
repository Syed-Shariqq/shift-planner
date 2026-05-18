import "../index.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoster } from "../context/RosterContext.jsx";
import apiFetch from "../utils/api.js";

function ButtonSpinner() {
  return (
    <svg className="mr-2 inline h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useRoster();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fillDemoCredentials = (nextEmail, nextPassword) => {
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError("");
  };

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
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FB] px-4 font-['Figtree']">
      {/* Subtle grid background texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #0F1620 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="page-enter relative z-10 w-full max-w-[400px]">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F6FED] shadow-lg shadow-[#2F6FED]/25">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1620]">ShiftPlanner</h1>
          <p className="mt-1.5 text-sm text-[#8A96A8]">Workforce scheduling for modern teams</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E4E8EF] bg-white p-8 shadow-sm ring-1 ring-black/[0.04]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 h-11 w-full rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] px-3 text-sm text-[#0F1620] placeholder-[#CBD3DF] focus:border-[#2F6FED] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-[#8A96A8]">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] px-3 pr-11 text-sm text-[#0F1620] focus:border-[#2F6FED] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#8A96A8] transition-colors hover:text-[#2F6FED]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A10.94 10.94 0 0112 4c5 0 9 5 9 8a9.77 9.77 0 01-2.2 3.67M6.1 6.1C4.25 7.39 3 9.6 3 12c0 3 4 8 9 8a10.9 10.9 0 005.9-1.9" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#DC2626]">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-[#2F6FED] text-sm font-semibold text-white shadow-sm shadow-[#2F6FED]/30 transition-all hover:bg-[#1D5CD6] hover:shadow-md hover:shadow-[#2F6FED]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <ButtonSpinner />}
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E4E8EF]" />
            <span className="text-xs text-[#8A96A8]">Quick access</span>
            <div className="h-px flex-1 bg-[#E4E8EF]" />
          </div>

          {/* Demo credentials */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => fillDemoCredentials("admin@demo.com", "admin123")}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] text-sm font-medium text-[#4A5568] transition-all hover:border-[#2F6FED]/30 hover:bg-[#EEF3FD] hover:text-[#2F6FED]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials("emp1@demo.com", "emp123")}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E4E8EF] bg-[#F8F9FB] text-sm font-medium text-[#4A5568] transition-all hover:border-[#2F6FED]/30 hover:bg-[#EEF3FD] hover:text-[#2F6FED]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Employee Demo
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#8A96A8]">
          ShiftPlanner · Workforce Management Platform
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
