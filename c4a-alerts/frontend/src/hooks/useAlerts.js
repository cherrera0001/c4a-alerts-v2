import { useState, useEffect } from "react";
import { alertsService } from "../services/alerts.service";
import { toast } from "react-hot-toast";

export function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await alertsService.getAlerts(filters);
      setAlerts(data.alerts || data || []);
    } catch (err) {
      setError(err);
      toast.error(err.message || "Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await alertsService.getAlertStats();
      setStats(data);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [JSON.stringify(filters)]);

  const refresh = () => {
    fetchAlerts();
    fetchStats();
  };

  return {
    alerts,
    stats,
    loading,
    error,
    refresh,
  };
}

