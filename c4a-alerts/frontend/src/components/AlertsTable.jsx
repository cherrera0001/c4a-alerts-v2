import AlertSeverityBadge from "./AlertSeverityBadge";
import { format } from "date-fns";

export default function AlertsTable({ alerts, loading, error }) {
  if (loading) {
    return (
      <div className="mt-4 text-sm text-slate-400 border border-dashed border-slate-700 rounded-xl p-6 text-center">
        Cargando alertas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 text-sm text-red-400 border border-red-500/30 rounded-xl p-6 bg-red-500/10">
        Error al cargar alertas: {error.message || "Error desconocido"}
      </div>
    );
  }

  if (!alerts?.length) {
    return (
      <div className="mt-4 text-sm text-slate-400 border border-dashed border-slate-700 rounded-xl p-6">
        No hay alertas aún. Integra tus activos o envía alertas desde tu backend
        para ver actividad aquí.
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const dateObj = date instanceof Date ? date : date.toDate?.() || new Date(date);
      return format(dateObj, "dd/MM/yyyy HH:mm");
    } catch {
      return "-";
    }
  };

  return (
    <div className="mt-4 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/80 border-b border-slate-800">
          <tr>
            <th className="text-left px-4 py-2">Severidad</th>
            <th className="text-left px-4 py-2">Título</th>
            <th className="text-left px-4 py-2 hidden md:table-cell">Origen</th>
            <th className="text-left px-4 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {alerts.map((alert) => (
            <tr key={alert.id} className="hover:bg-slate-900/60 transition-colors">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}




