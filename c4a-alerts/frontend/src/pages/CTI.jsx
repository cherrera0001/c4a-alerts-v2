import { useState } from "react";
import Layout from "../components/Layout";
import AlertSeverityBadge from "../components/AlertSeverityBadge";
import { useCTI } from "../hooks/useCTI";
import { toast } from "react-hot-toast";

export default function CTI() {
  const [filters, setFilters] = useState({
    severity: "",
    sector: "",
    region: "",
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [relevanceData, setRelevanceData] = useState(null);
  const { ctiItems, loading, error, getRelevance, refresh } = useCTI(filters);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      severity: "",
      sector: "",
      region: "",
    });
  };

  const handleViewRelevance = async (itemId) => {
    try {
      const data = await getRelevance(itemId);
      setRelevanceData(data);
    } catch (err) {
      console.error("Error al obtener relevancia:", err);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Inteligencia de Amenazas (CTI)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Análisis de amenazas y su relevancia para tus activos
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-xs border border-slate-700 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="border border-slate-800 rounded-2xl p-4 mb-6 bg-slate-900/60">
        <h2 className="text-sm font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Sector</label>
            <input
              type="text"
              value={filters.sector}
              onChange={(e) => handleFilterChange("sector", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Financiero, Salud"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Región</label>
            <input
              type="text"
              value={filters.region}
              onChange={(e) => handleFilterChange("region", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: América Latina"
            />
          </div>
        </div>

        {(filters.severity || filters.sector || filters.region) && (
          <button
            onClick={clearFilters}
            className="mt-4 text-xs text-emerald-400 hover:text-emerald-300"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando items de CTI...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">
          Error: {error.message || "Error desconocido"}
        </div>
      ) : ctiItems.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-700 rounded-xl">
          No hay items de CTI disponibles
        </div>
      ) : (
        <div className="space-y-4">
          {ctiItems.map((item) => (
            <div
              key={item.id}
              className="border border-slate-800 rounded-2xl p-6 bg-slate-900/60 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertSeverityBadge severity={item.severity} />
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-300 mt-2">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {item.cves && item.cves.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400">CVEs Asociados</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.cves.map((cve, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono"
                        >
                          {cve}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.attackTactics && item.attackTactics.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400">Tácticas ATT&CK</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.attackTactics.map((tactic, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-purple-500/10 rounded border border-purple-500/30 text-purple-300"
                        >
                          {tactic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {item.sectors && item.sectors.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400">Sectores Afectados</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.sectors.map((sector, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                        >
                          {sector}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.regions && item.regions.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400">Regiones Afectadas</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.regions.map((region, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedItem(item)}
                  className="text-xs border border-slate-700 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Ver detalle
                </button>
                <button
                  onClick={() => handleViewRelevance(item.id)}
                  className="text-xs border border-emerald-500/30 px-3 py-1 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                >
                  Relevancia para mis activos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Detalle de CTI</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Severidad</label>
                <div className="mt-1">
                  <AlertSeverityBadge severity={selectedItem.severity} />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Título</label>
                <p className="mt-1 text-sm font-semibold">{selectedItem.title}</p>
              </div>

              {selectedItem.description && (
                <div>
                  <label className="text-xs text-slate-400">Descripción</label>
                  <p className="mt-1 text-sm text-slate-300">{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.cves && selectedItem.cves.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400">CVEs</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedItem.cves.map((cve, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono"
                      >
                        {cve}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.attackTactics && selectedItem.attackTactics.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400">Tácticas ATT&CK</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedItem.attackTactics.map((tactic, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-purple-500/10 rounded border border-purple-500/30 text-purple-300"
                      >
                        {tactic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.sectors && selectedItem.sectors.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400">Sectores</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedItem.sectors.map((sector, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.regions && selectedItem.regions.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400">Regiones</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedItem.regions.map((region, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {relevanceData && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setRelevanceData(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Relevancia para Mis Activos</h2>
              <button
                onClick={() => setRelevanceData(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {relevanceData.message ? (
                <p className="text-sm text-slate-300">{relevanceData.message}</p>
              ) : (
                <p className="text-sm text-slate-300">
                  Esta funcionalidad será alimentada por agentes de IA en el futuro.
                  Aquí se mostrará el análisis de relevancia de esta amenaza para tus activos específicos.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

