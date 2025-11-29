import { api } from "./api.js";

export const authService = {
  login: async (email, password, twoFactorCode = null) => {
    try {
      const response = await api.post("/api/auth/login", { 
        email, 
        password,
        ...(twoFactorCode && { twoFactorCode })
      });
      // El backend devuelve { success: true, data: { user, token } }
      const data = response.data || response;
      if (data.data && data.data.token) {
        localStorage.setItem("c4a_token", data.data.token);
        if (data.data.user) {
          localStorage.setItem("c4a_user", JSON.stringify(data.data.user));
        }
        return data.data;
      }
      return data;
    } catch (error) {
      // Si es error de 2FA requerido, lanzarlo con información adicional
      if (error.response && error.response.data && error.response.data.requires2FA) {
        const customError = new Error(error.response.data.error || "Se requiere código 2FA");
        customError.code = error.response.data.code || "2FA_REQUIRED";
        customError.userId = error.response.data.userId;
        customError.response = error.response;
        throw customError;
      }
      throw error;
    }
  },

  register: async (email, password, name) => {
    const response = await api.post("/api/auth/register", { email, password, name });
    // El backend devuelve { success: true, data: { user, token } }
    const data = response.data || response;
    if (data.token) {
      localStorage.setItem("c4a_token", data.token);
      if (data.user) {
        localStorage.setItem("c4a_user", JSON.stringify(data.user));
      }
    }
    return data;
  },

  getProfile: async () => {
    const response = await api.get("/api/auth/me");
    // El backend devuelve { success: true, data: { ...user } }
    return response.data || response;
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

