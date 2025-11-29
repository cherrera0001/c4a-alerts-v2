import { api } from "./api.js";

export const twoFactorService = {
  /**
   * Obtiene el estado de 2FA del usuario
   */
  getStatus: async () => {
    const response = await api.get("/api/auth/2fa/status");
    return response.data || response;
  },

  /**
   * Genera un nuevo secreto 2FA y QR code
   */
  setup: async () => {
    const response = await api.post("/api/auth/2fa/setup");
    return response.data || response;
  },

  /**
   * Habilita 2FA después de verificar el código
   */
  enable: async (token) => {
    const response = await api.post("/api/auth/2fa/enable", { token });
    return response.data || response;
  },

  /**
   * Deshabilita 2FA
   */
  disable: async () => {
    const response = await api.post("/api/auth/2fa/disable");
    return response.data || response;
  },
};


