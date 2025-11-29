import { useMemo } from "react";
import Layout from "../components/Layout";
import StatsCards from "../components/StatsCards";
import AlertsTable from "../components/AlertsTable";
import { useAlerts } from "../hooks/useAlerts";

export default function Dashboard() {
  const { alerts, stats, loading, error } = useAlerts({ limit: 10 });

  const computedStats = useMemo(() => {
    if (stats) {
      return stats;
    }

    const base = {
      total: alerts.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
    };

    alerts.forEach((alert) => {
      const severity = alert.severity?.toLowerCase();
      if (severity && base.bySeverity[severity] !== undefined) {
        base.bySeverity[severity]++;
      }
    });

    return base;
  }, [alerts, stats]);

  const criticalAssets = useMemo(() => {
    return 0;
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Panel de Control</h1>
          <p className="text-xs text-slate-400 mt-1">
            Visión general de alertas y estado del sistema CTI
          </p>
        </div>
      </div>

      <StatsCards stats={computedStats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60">
          <h2 className="text-sm font-semibold mb-2">Activos Críticos</h2>
          <p className="text-2xl font-semibold text-red-400">{criticalAssets}</p>
          <p className="text-xs text-slate-400 mt-1">Activos que requieren atención inmediata</p>
        </div>

        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60">
          <h2 className="text-sm font-semibold mb-2">Estado del Sistema CTI</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-sm text-slate-300">Operacional</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Todas las fuentes de inteligencia están activas y funcionando correctamente
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Últimas Alertas</h2>
        <AlertsTable alerts={alerts} loading={loading} error={error} />
      </div>
    </Layout>
  );
}




