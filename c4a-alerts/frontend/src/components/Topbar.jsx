import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Conectado a</span>
        <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          C4A Alerts · {import.meta.env.VITE_ENV || "QA"}
        </span>
      </div>
      <button
        onClick={handleLogout}
        className="text-xs border border-slate-700 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
      >
        Cerrar sesión
      </button>
    </header>
  );
}




