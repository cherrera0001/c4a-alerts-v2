import { useState } from "react";
import Layout from "../components/Layout";
import AlertSeverityBadge from "../components/AlertSeverityBadge";
import { useAlerts } from "../hooks/useAlerts";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

export default function Alerts() {
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { alerts, stats, loading, error, refresh } = useAlerts(filters);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      severity: "",
      status: "",
      startDate: "",
      endDate: "",
    });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const dateObj = date instanceof Date ? date : date.toDate?.() || new Date(date);
      return format(dateObj, "dd/MM/yyyy HH:mm");
    } catch {
      return "-";
    }
  };

  const severityCounts = {
    critical: alerts.filter((a) => a.severity?.toLowerCase() === "critical").length,
    high: alerts.filter((a) => a.severity?.toLowerCase() === "high").length,
    medium: alerts.filter((a) => a.severity?.toLowerCase() === "medium").length,
    low: alerts.filter((a) => a.severity?.toLowerCase() === "low").length,
    info: alerts.filter((a) => a.severity?.toLowerCase() === "info").length,
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Alertas</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestiona y filtra todas tus alertas de seguridad
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-xs border border-slate-700 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(severityCounts).map(([severity, count]) => (
          <div
            key={severity}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <p className="text-xs text-slate-400 capitalize">{severity}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>

      <div className="border border-slate-800 rounded-2xl p-4 mb-6 bg-slate-900/60">
        <h2 className="text-sm font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Severidad</label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange("severity", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas</option>
              <option value="critical">Crítica</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
              <option value="info">Informativa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos</option>
              <option value="new">Nueva</option>
              <option value="acknowledged">Reconocida</option>
              <option value="resolved">Resuelta</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Fecha desde</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Fecha hasta</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {(filters.severity || filters.status || filters.startDate || filters.endDate) && (
          <button
            onClick={clearFilters}
            className="mt-4 text-xs text-emerald-400 hover:text-emerald-300"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="text-left px-4 py-2">Severidad</th>
              <th className="text-left px-4 py-2">Título</th>
              <th className="text-left px-4 py-2 hidden md:table-cell">Origen</th>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                  Cargando alertas...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-red-400">
                  Error: {error.message || "Error desconocido"}
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                  No hay alertas que coincidan con los filtros
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <td className="px-4 py-2">
                    <AlertSeverityBadge severity={alert.severity} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{alert.title}</div>
                    {alert.description && (
                      <div className="text-xs text-slate-400 line-clamp-1 mt-1">
                        {alert.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400 hidden md:table-cell">
                    {alert.source || "-"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {formatDate(alert.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlert(alert);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedAlert && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Detalle de Alerta</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Severidad</label>
                <div className="mt-1">
                  <AlertSeverityBadge severity={selectedAlert.severity} />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Título</label>
                <p className="mt-1 text-sm">{selectedAlert.title}</p>
              </div>

              {selectedAlert.description && (
                <div>
                  <label className="text-xs text-slate-400">Descripción</label>
                  <p className="mt-1 text-sm text-slate-300">{selectedAlert.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Origen</label>
                  <p className="mt-1 text-sm">{selectedAlert.source || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fecha</label>
                  <p className="mt-1 text-sm">{formatDate(selectedAlert.createdAt)}</p>
                </div>
              </div>

              {selectedAlert.cveId && (
                <div>
                  <label className="text-xs text-slate-400">CVE</label>
                  <p className="mt-1 text-sm font-mono">{selectedAlert.cveId}</p>
                </div>
              )}

              {selectedAlert.cvssScore && (
                <div>
                  <label className="text-xs text-slate-400">CVSS Score</label>
                  <p className="mt-1 text-sm">{selectedAlert.cvssScore}</p>
                </div>
              )}

              {selectedAlert.tags && selectedAlert.tags.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400">Tags</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedAlert.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
