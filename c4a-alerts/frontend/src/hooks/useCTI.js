import { useState, useEffect } from "react";
import { ctiService } from "../services/cti.service";
import { toast } from "react-hot-toast";

export function useCTI(filters = {}) {
  const [ctiItems, setCtiItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCTIItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ctiService.getCTIItems(filters);
      setCtiItems(data.items || data || []);
    } catch (err) {
      setError(err);
      toast.error(err.message || "Error al cargar items de CTI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCTIItems();
  }, [JSON.stringify(filters)]);

  const getRelevance = async (ctiItemId) => {
    try {
      const data = await ctiService.getRelevanceForAssets(ctiItemId);
      return data;
    } catch (err) {
      toast.error(err.message || "Error al obtener relevancia");
      throw err;
    }
  };

  const refresh = () => {
    fetchCTIItems();
  };

  return {
    ctiItems,
    loading,
    error,
    getRelevance,
    refresh,
  };
}
