const SEVERITY_MAP = {
  critical: { label: "Críticas", color: "text-red-400", bg: "bg-red-500/10" },
  high: { label: "Altas", color: "text-orange-400", bg: "bg-orange-500/10" },
  medium: { label: "Medias", color: "text-amber-400", bg: "bg-amber-500/10" },
  low: { label: "Bajas", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  info: { label: "Informativas", color: "text-sky-400", bg: "bg-sky-500/10" },
};

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs text-slate-400">Alertas totales</p>
        <p className="text-2xl font-semibold">
          {stats?.total ?? 0}
        </p>
      </div>
      {Object.entries(SEVERITY_MAP).map(([key, config]) => (
        <div
          key={key}
          className={`rounded-2xl border border-slate-800 ${config.bg} p-4`}
        >
          <p className="text-xs text-slate-400">{config.label}</p>
          <p className={`text-2xl font-semibold ${config.color}`}>
            {stats?.bySeverity?.[key] ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}



