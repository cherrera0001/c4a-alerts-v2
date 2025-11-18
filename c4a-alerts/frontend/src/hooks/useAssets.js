import { useState, useEffect } from "react";
import { assetsService } from "../services/assets.service";
import { toast } from "react-hot-toast";

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assetsService.getAssets();
      setAssets(data.assets || data || []);
    } catch (err) {
      setError(err);
      toast.error(err.message || "Error al cargar activos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const createAsset = async (assetData) => {
    try {
      const newAsset = await assetsService.createAsset(assetData);
      setAssets((prev) => [...prev, newAsset]);
      toast.success("Activo creado exitosamente");
      return newAsset;
    } catch (err) {
      toast.error(err.message || "Error al crear activo");
      throw err;
    }
  };

  const updateAsset = async (id, assetData) => {
    try {
      const updated = await assetsService.updateAsset(id, assetData);
      setAssets((prev) =>
        prev.map((asset) => (asset.id === id ? updated : asset))
      );
      toast.success("Activo actualizado exitosamente");
      return updated;
    } catch (err) {
      toast.error(err.message || "Error al actualizar activo");
      throw err;
    }
  };

  const deleteAsset = async (id) => {
    try {
      await assetsService.deleteAsset(id);
      setAssets((prev) => prev.filter((asset) => asset.id !== id));
      toast.success("Activo eliminado exitosamente");
    } catch (err) {
      toast.error(err.message || "Error al eliminar activo");
      throw err;
    }
  };

  const refresh = () => {
    fetchAssets();
  };

  return {
    assets,
    loading,
    error,
    createAsset,
    updateAsset,
    deleteAsset,
    refresh,
  };
}
