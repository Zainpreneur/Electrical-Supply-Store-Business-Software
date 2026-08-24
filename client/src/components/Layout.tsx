import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/", label: "Dashboard", icon: "📊", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/pos", label: "New Sale (POS)", icon: "🧾", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/sales", label: "Sales History", icon: "🗂️", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/products", label: "Products", icon: "🔌", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/categories", label: "Categories", icon: "🏷️", roles: ["ADMIN", "MANAGER"] },
  { to: "/suppliers", label: "Suppliers", icon: "🚚", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/purchase-orders", label: "Purchase Orders", icon: "📦", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/customers", label: "Customers", icon: "👥", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/reports", label: "Reports", icon: "📈", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { to: "/users", label: "Users", icon: "🔐", roles: ["ADMIN"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-800">ElectroSupply</p>
            <p className="text-xs text-slate-400">Store Manager</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {nav
            .filter((item) => !user || item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full">
            Log out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-slate-800">ElectroSupply</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary text-xs">
            Log out
          </button>
        </header>
        <main className="flex-1 overflow-x-hidden bg-slate-100 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
