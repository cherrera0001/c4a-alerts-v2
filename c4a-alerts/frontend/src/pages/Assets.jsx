import { useState } from "react";
import Layout from "../components/Layout";
import { useAssets } from "../hooks/useAssets";
import { toast } from "react-hot-toast";

export default function Assets() {
  const { assets, loading, error, createAsset, updateAsset, deleteAsset, refresh } = useAssets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    criticality: "medium",
    tags: "",
    description: "",
  });

  const handleOpenModal = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name || "",
        type: asset.type || "",
        criticality: asset.criticality || "medium",
        tags: asset.tags?.join(", ") || "",
        description: asset.description || "",
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: "",
        type: "",
        criticality: "medium",
        tags: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setFormData({
      name: "",
      type: "",
      criticality: "medium",
      tags: "",
      description: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const assetData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      if (editingAsset) {
        await updateAsset(editingAsset.id, assetData);
      } else {
        await createAsset(assetData);
      }
      handleCloseModal();
      refresh();
    } catch (err) {
      console.error("Error al guardar activo:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este activo?")) {
      try {
        await deleteAsset(id);
      } catch (err) {
        console.error("Error al eliminar activo:", err);
      }
    }
  };

  const criticalityColors = {
    critical: "text-red-400 bg-red-500/10 border-red-500/40",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/40",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/40",
    low: "text-yellow-400 bg-yellow-500/10 border-yellow-500/40",
  };

  const criticalityLabels = {
    critical: "Crítico",
    high: "Alto",
    medium: "Medio",
    low: "Bajo",
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Activos</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestiona tus activos de seguridad
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
        >
          + Nuevo Activo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando activos...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">
          Error: {error.message || "Error desconocido"}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-700 rounded-xl">
          No hay activos registrados. Crea tu primer activo para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{asset.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{asset.type}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${criticalityColors[asset.criticality] || criticalityColors.medium}`}
                >
                  {criticalityLabels[asset.criticality] || "Medio"}
                </span>
              </div>

              {asset.description && (
                <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                  {asset.description}
                </p>
              )}

              {asset.tags && asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {asset.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleOpenModal(asset)}
                  className="flex-1 text-xs border border-slate-700 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="flex-1 text-xs border border-red-500/30 px-3 py-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingAsset ? "Editar Activo" : "Nuevo Activo"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Tipo</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej: Servidor, Aplicación, Base de datos"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Criticalidad</label>
                <select
                  value={formData.criticality}
                  onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Medio</option>
                  <option value="low">Bajo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Tags (separados por comas)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej: producción, web, crítico"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  {editingAsset ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
