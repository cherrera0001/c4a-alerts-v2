import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { alertsService } from "../services/alerts.service";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertsData, statsData] = await Promise.all([
        alertsService.getAlerts(filters),
        alertsService.getStats(),
      ]);
      // Las respuestas ya vienen con data extraída, pero por si acaso
      const alerts = alertsData?.alerts || alertsData || [];
      const stats = statsData || {};
      setAlerts(Array.isArray(alerts) ? alerts : []);
      setStats(stats);
    } catch (error) {
      toast.error(error.message || "Error al cargar datos");
      setAlerts([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const severityColors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
    info: "bg-gray-500",
  };

  const statusColors = {
    pending: "bg-yellow-500",
    processing: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
    archived: "bg-gray-500",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">
                C4A <span className="text-emerald-400">Alerts</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Panel de Alertas</h2>
          <p className="text-sm text-slate-400">
            Visión en tiempo real de los eventos de seguridad
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <div className="text-sm text-slate-400 mb-1">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            {Object.entries(stats.bySeverity).map(([severity, count]) => (
              <div key={severity} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <div className="text-sm text-slate-400 mb-1 capitalize">{severity}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            >
              <option value="">Todas las severidades</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <button
            onClick={async () => {
              try {
                const sampleAlerts = [
                  {
                    title: "Alerta de prueba - Intrusión detectada",
                    description: "Sistema de prueba: Se detectó actividad sospechosa en el servidor web",
                    type: "CRITICAL",
                    source: "MANUAL",
                    severity: "critical",
                    status: "pending",
                  },
                  {
                    title: "Alerta de prueba - Vulnerabilidad encontrada",
                    description: "Sistema de prueba: Nueva vulnerabilidad requiere atención inmediata",
                    type: "WARNING",
                    source: "CTI_FEED",
                    severity: "high",
                    status: "processing",
                    cveIds: ["CVE-2024-9999"],
                  },
                ];

                for (const alert of sampleAlerts) {
                  await alertsService.createAlert(alert);
                }
                
                toast.success("Alertas de prueba creadas");
                loadData();
              } catch (error) {
                toast.error(error.message || "Error al crear alertas de prueba");
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            + Crear alertas de prueba
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando alertas...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No hay alertas disponibles</div>
        ) : (
          <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Severidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{alert.title}</div>
                      {alert.description && (
                        <div className="text-xs text-slate-400 mt-1 truncate max-w-md">
                          {alert.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${severityColors[alert.severity] || "bg-gray-500"}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusColors[alert.status] || "bg-gray-500"}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {alert.createdAt
                        ? format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

