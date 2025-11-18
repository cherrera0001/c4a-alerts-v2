import { api } from "./api.js";

export const ctiService = {
  getCTIItems: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.severity) params.append("severity", filters.severity);
    if (filters.sector) params.append("sector", filters.sector);
    if (filters.region) params.append("region", filters.region);
    if (filters.limit) params.append("limit", filters.limit);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/cti?${queryString}` : "/api/cti";
    return api.get(endpoint);
  },

  getCTIItemById: async (id) => {
    return api.get(`/api/cti/${id}`);
  },

  getRelevanceForAssets: async (ctiItemId) => {
    return api.get(`/api/cti/${ctiItemId}/relevance`);
  },
};
