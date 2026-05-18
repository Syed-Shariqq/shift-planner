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
    <div className="flex h-screen overflow-hidden bg-[#F8F9FB] text-[#0F1620]">
      {/* Sidebar — fixed height, never scrolls with content */}
      <aside className="flex h-screen w-64 shrink-0 flex-col bg-white" style={{ borderRight: "1px solid #E4E8EF" }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid #E4E8EF" }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2F6FED]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-[#0F1620]">ShiftPlanner</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#8A96A8]">Menu</p>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 mb-0.5",
                  isActive
                    ? "bg-[#EEF3FD] text-[#2F6FED] font-semibold"
                    : "text-[#4A5568] hover:bg-[#F1F4F9] hover:text-[#0F1620]",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#2F6FED]" />
                  )}
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid #E4E8EF" }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#4A5568] transition-all duration-150 hover:bg-[#FEF2F2] hover:text-[#DC2626]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content — scrolls independently */}
      <main className="flex-1 overflow-y-auto bg-[#F8F9FB]">
        <Outlet />
      </main>
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
