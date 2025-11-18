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
    return api.get(endpoint);
  },

  getAlertById: async (id) => {
    return api.get(`/api/alerts/${id}`);
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

  getStats: async () => {
    return api.get("/api/alerts/stats");
  },
};

