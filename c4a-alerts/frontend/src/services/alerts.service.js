import { api } from "./api.js";

export const alertsService = {
  getAlerts: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.severity) params.append("severity", filters.severity);
    if (filters.status) params.append("status", filters.status);
    if (filters.limit) params.append("limit", filters.limit);
    if (filters.startAfter) params.append("startAfter", filters.startAfter);
    if (filters.orderBy) params.append("orderBy", filters.orderBy);
    if (filters.orderDirection) params.append("orderDirection", filters.orderDirection);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/alerts?${queryString}` : "/api/alerts";
    return api.get(endpoint);
  },

  getAlertById: async (id) => {
    return api.get(`/api/alerts/${id}`);
  },

  getAlertStats: async () => {
    return api.get("/api/alerts/stats");
  },

  createAlert: async (data) => {
    return api.post("/api/alerts", data);
  },

  updateAlert: async (id, data) => {
    return api.put(`/api/alerts/${id}`, data);
  },

  deleteAlert: async (id) => {
    return api.delete(`/api/alerts/${id}`);
  },
};




