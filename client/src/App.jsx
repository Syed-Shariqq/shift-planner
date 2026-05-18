import { useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./index.css";
import AdminDashboard from "./components/AdminDashboard.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { useRoster } from "./context/RosterContext.jsx";

function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser } = useRoster();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useRoster();
  const links = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/roster", label: "Roster" },
    { to: "/admin/swaps", label: "Swaps" },
    { to: "/admin/history", label: "History" },
    { to: "/admin/shifts", label: "Shift Definitions" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#0F1620]">
      <div className="flex min-h-screen">
        <aside className="flex w-72 shrink-0 flex-col border-r border-[#E4E8EF] bg-[#FFFFFF]">
          <div className="border-b border-[#E4E8EF] px-6 py-6">
            <div className="text-xl font-bold text-[#0F1620]">ShiftPlanner</div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    "block rounded-md px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#EEF3FD] text-[#2F6FED] font-semibold"
                      : "text-[#4A5568] hover:bg-[#F1F4F9] hover:text-[#0F1620]",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-[#E4E8EF] p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-md border border-[#CBD3DF] bg-[#FFFFFF] px-4 py-3 text-sm font-semibold text-[#0F1620] transition-colors hover:bg-[#F1F4F9]"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-[#F8F9FB] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PagePanel({ title, eyebrow, children }) {
  return (
    <section className="rounded-lg border border-[#E4E8EF] bg-[#FFFFFF] p-6 shadow-sm">
      <div className="mb-6">
        <p className="font-['DM_Mono'] text-xs font-medium uppercase tracking-normal text-[#8A96A8]">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0F1620]">{title}</h1>
      </div>
      <div className="text-sm leading-6 text-[#4A5568]">{children}</div>
    </section>
  );
}

function RosterDashboard() {
  const { employees, fetchRosterData, getWeekDates, weekOffset, setWeekOffset } = useRoster();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const weekDates = getWeekDates(weekOffset);

  const moveWeek = async (nextOffset) => {
    setError("");
    setIsLoading(true);

    try {
      await fetchRosterData(nextOffset);
    } catch (caughtError) {
      setWeekOffset(nextOffset);
      setError(caughtError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PagePanel title="Roster" eyebrow="Weekly plan">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-['DM_Mono'] text-sm font-medium text-[#4A5568]">
          {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => moveWeek(weekOffset - 1)}
            className="rounded-md border border-[#CBD3DF] bg-[#FFFFFF] px-3 py-2 text-sm font-semibold text-[#0F1620] hover:bg-[#F1F4F9]"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => moveWeek(weekOffset + 1)}
            className="rounded-md border border-[#CBD3DF] bg-[#FFFFFF] px-3 py-2 text-sm font-semibold text-[#0F1620] hover:bg-[#F1F4F9]"
          >
            Next
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-[#DC2626]/20 bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[#E4E8EF]">
        <div className="grid grid-cols-8 bg-[#F1F4F9] text-xs font-semibold uppercase text-[#4A5568]">
          <div className="border-r border-[#E4E8EF] p-3">Employee</div>
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="border-r border-[#E4E8EF] p-3 last:border-r-0">
              {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
          ))}
        </div>
        {employees.length === 0 ? (
          <div className="bg-[#FFFFFF] p-5 text-sm text-[#8A96A8]">
            {isLoading ? "Loading roster." : "No roster assignments found."}
          </div>
        ) : (
          employees.map((employee) => (
            <div key={employee.id} className="grid grid-cols-8 border-t border-[#E4E8EF] bg-[#FFFFFF]">
              <div className="border-r border-[#E4E8EF] p-3 font-semibold text-[#0F1620]">{employee.name}</div>
              {employee.assignments.map((day) => (
                <div key={day.date} className="min-h-20 border-r border-[#E4E8EF] p-3 last:border-r-0">
                  {day.assignment ? (
                    <div className="rounded-md bg-[#EEF3FD] px-3 py-2 text-xs font-semibold text-[#2F6FED]">
                      {day.assignment.shift_name}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </PagePanel>
  );
}

function SwapApprovalPage() {
  const { pendingSwapsCount } = useRoster();

  return (
    <PagePanel title="Swaps" eyebrow="Approvals">
      <div className="rounded-lg border border-[#E4E8EF] bg-[#FFFBEB] p-5 text-[#D97706]">
        <span className="font-['DM_Mono'] text-2xl font-medium">{pendingSwapsCount}</span>
        <span className="ml-3 text-sm font-semibold">pending requests</span>
      </div>
    </PagePanel>
  );
}

function ShiftHistoryPage() {
  return (
    <PagePanel title="History" eyebrow="Audit trail">
      <div className="overflow-hidden rounded-lg border border-[#E4E8EF] bg-[#FFFFFF]">
        <div className="grid grid-cols-4 bg-[#F1F4F9] p-3 text-xs font-semibold uppercase text-[#4A5568]">
          <div>Date</div>
          <div>Employee</div>
          <div>Action</div>
          <div>Changed by</div>
        </div>
        <div className="p-5 text-sm text-[#8A96A8]">No history records found.</div>
      </div>
    </PagePanel>
  );
}

function ShiftDefinitionsPage() {
  const { shifts } = useRoster();

  return (
    <PagePanel title="Shift Definitions" eyebrow="Templates">
      <div className="grid gap-3">
        {shifts.length === 0 ? (
          <div className="rounded-lg border border-[#E4E8EF] bg-[#FFFFFF] p-5 text-sm text-[#8A96A8]">
            No shift templates found.
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="rounded-lg border border-[#E4E8EF] bg-[#FFFFFF] p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#0F1620]">{shift.name}</div>
                <div className="h-4 w-4 rounded-sm border border-[#CBD3DF]" style={{ backgroundColor: shift.color_code }} />
              </div>
              <div className="mt-2 font-['DM_Mono'] text-sm text-[#4A5568]">
                {shift.start_time} - {shift.end_time}
              </div>
            </div>
          ))
        )}
      </div>
    </PagePanel>
  );
}

function EmployeeCalendarPage() {
  const { getWeekDates, logout, weekOffset } = useRoster();
  const navigate = useNavigate();
  const weekDates = getWeekDates(weekOffset);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 text-[#0F1620]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-['DM_Mono'] text-xs font-medium uppercase tracking-normal text-[#8A96A8]">Employee</p>
            <h1 className="mt-2 text-2xl font-bold">My Calendar</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-[#CBD3DF] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F1620] hover:bg-[#F1F4F9]"
          >
            Logout
          </button>
        </div>

        <section className="grid gap-3 rounded-lg border border-[#E4E8EF] bg-[#FFFFFF] p-6 shadow-sm md:grid-cols-7">
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="rounded-lg border border-[#E4E8EF] bg-[#F1F4F9] p-4">
              <div className="font-['DM_Mono'] text-xs font-medium uppercase text-[#8A96A8]">
                {date.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div className="mt-2 text-lg font-bold text-[#0F1620]">{date.getDate()}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="roster" element={<RosterDashboard />} />
        <Route path="swaps" element={<SwapApprovalPage />} />
        <Route path="history" element={<ShiftHistoryPage />} />
        <Route path="shifts" element={<ShiftDefinitionsPage />} />
      </Route>

      <Route
        path="/employee/calendar"
        element={
          <ProtectedRoute requiredRole="Employee">
            <EmployeeCalendarPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
