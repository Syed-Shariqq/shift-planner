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
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FB] px-4 py-8 font-['Figtree'] md:px-6 lg:px-8">
      <section className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-md sm:p-8">
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
              className="min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm text-[#0F1620] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#0F1620]">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 pr-11 text-sm text-[#0F1620] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                className="absolute inset-y-0 right-0 flex min-h-[44px] w-11 items-center justify-center text-[#4A5568] transition-colors hover:text-[#2F6FED]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                    <path d="M9.88 5.09A10.94 10.94 0 0112 4c5 0 9 5 9 8a9.77 9.77 0 01-2.2 3.67" />
                    <path d="M6.1 6.1C4.25 7.39 3 9.6 3 12c0 3 4 8 9 8a10.9 10.9 0 005.9-1.9" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="min-h-[44px] w-full rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
        </form>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => fillDemoCredentials("admin@demo.com", "admin123")}
            className="min-h-[44px] flex-1 rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm font-medium text-[#4A5568] transition-colors hover:bg-[#EEF3FD]"
          >
            Login as Admin
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials("emp1@demo.com", "emp123")}
            className="min-h-[44px] flex-1 rounded-lg border border-[#E4E8EF] bg-white px-3 py-2 text-sm font-medium text-[#4A5568] transition-colors hover:bg-[#EEF3FD]"
          >
            Login as Employee
          </button>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
