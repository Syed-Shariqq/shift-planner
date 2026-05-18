import { Component } from "react";
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
import EmployeeCalendarPage from "./components/EmployeeCalendarPage.jsx";
import LoginPage from "./components/LoginPage.jsx";
import RosterDashboard from "./components/RosterDashboard.jsx";
import SwapApprovalPage from "./components/SwapApprovalPage.jsx";
import ShiftDefinitionsPage from "./components/ShiftDefinitionsPage.jsx";
import ShiftHistoryPage from "./components/ShiftHistoryPage.jsx";
import { useRoster } from "./context/RosterContext.jsx";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FB] px-6 font-['Figtree'] text-[#0F1620]">
          <section className="w-full max-w-md rounded-xl border border-[#E4E8EF] bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-[#0F1620]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[#4A5568]">Refresh the page and try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D5CD6]"
            >
              Refresh
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

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

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
