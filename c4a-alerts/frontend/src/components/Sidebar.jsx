import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/dashboard", label: "Panel", icon: "📊" },
  { to: "/dashboard/alerts", label: "Alertas", icon: "🚨" },
  { to: "/dashboard/assets", label: "Activos", icon: "🧩" },
  { to: "/dashboard/cti", label: "CTI", icon: "🔍" },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
      <div className="px-4 py-4 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight">
          C4A <span className="text-emerald-400">Alerts</span>
        </h1>
        <p className="text-xs text-slate-400">
          Offensive Security Monitoring
        </p>
        {user && (
          <p className="text-xs text-slate-500 mt-1 truncate">
            {user.email || user.name || "Usuario"}
          </p>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_LINKS.map((link) => {
          const active = location.pathname === link.to || 
                        location.pathname.startsWith(`${link.to}/`);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}




