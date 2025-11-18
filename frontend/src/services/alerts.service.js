import { api } from "./api.js";

export const alertsService = {
  getAlerts: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.startAfter) queryParams.append("startAfter", params.startAfter);
    if (params.severity) queryParams.append("severity", params.severity);
    if (params.status) queryParams.append("status", params.status);
    if (params.orderBy) queryParams.append("orderBy", params.orderBy);
    if (params.orderDirection) queryParams.append("orderDirection", params.orderDirection);

    const queryString = queryParams.toString();
    const endpoint = `/api/alerts${queryString ? `?${queryString}` : ""}`;
    const response = await api.get(endpoint);
    // El backend devuelve { success: true, data: { alerts, pagination } }
    return response.data || response;
  },

  getAlertById: async (id) => {
    const response = await api.get(`/api/alerts/${id}`);
    return response.data || response;
  },

  createAlert: async (data) => {
    const response = await api.post("/api/alerts", data);
    // El backend devuelve { success: true, data: alert }
    return response.data || response;
  },

  updateAlert: async (id, data) => {
    const response = await api.put(`/api/alerts/${id}`, data);
    return response.data || response;
  },

  deleteAlert: async (id) => {
    return api.delete(`/api/alerts/${id}`);
  },

  getStats: async () => {
    const response = await api.get("/api/alerts/stats");
    // El backend devuelve { success: true, data: { total, bySeverity, byStatus } }
    return response.data || response;
  },
};

