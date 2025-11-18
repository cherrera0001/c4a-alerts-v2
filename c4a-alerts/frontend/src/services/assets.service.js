import { api } from "./api.js";

export const assetsService = {
  getAssets: async () => {
    return api.get("/api/assets");
  },

  getAssetById: async (id) => {
    return api.get(`/api/assets/${id}`);
  },

  createAsset: async (data) => {
    return api.post("/api/assets", data);
  },

  updateAsset: async (id, data) => {
    return api.put(`/api/assets/${id}`, data);
  },

  deleteAsset: async (id) => {
    return api.delete(`/api/assets/${id}`);
  },
};
