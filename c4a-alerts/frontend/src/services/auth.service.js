import { api } from "./api.js";

export const authService = {
  login: async (email, password) => {
    const response = await api.post("/api/auth/login", { email, password });
    if (response.token) {
      localStorage.setItem("c4a_token", response.token);
      if (response.user) {
        localStorage.setItem("c4a_user", JSON.stringify(response.user));
      }
    }
    return response;
  },

  register: async (email, password, name) => {
    const response = await api.post("/api/auth/register", { email, password, name });
    if (response.token) {
      localStorage.setItem("c4a_token", response.token);
      if (response.user) {
        localStorage.setItem("c4a_user", JSON.stringify(response.user));
      }
    }
    return response;
  },

  getProfile: async () => {
    return api.get("/api/auth/me");
  },

  updateProfile: async (data) => {
    return api.patch("/api/auth/profile", data);
  },

  changePassword: async (currentPassword, newPassword) => {
    return api.post("/api/auth/change-password", { currentPassword, newPassword });
  },

  logout: () => {
    localStorage.removeItem("c4a_token");
    localStorage.removeItem("c4a_user");
  },

  getToken: () => {
    return localStorage.getItem("c4a_token");
  },

  getUser: () => {
    const userStr = localStorage.getItem("c4a_user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },
};



