const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem("c4a_token");

    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error desconocido" }));
        const customError = new Error(error.message || error.error || "Error en la petición");
        customError.response = {
          status: response.status,
          statusText: response.statusText,
          data: error,
        };
        throw customError;
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      // Detectar errores de conexión específicamente
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        const connectionError = new Error(
          "No se puede conectar con el servidor. Por favor, verifica que el backend esté corriendo en " + this.baseURL
        );
        connectionError.name = "ConnectionError";
        connectionError.originalError = error;
        console.error("API Connection Error:", connectionError.message);
        throw connectionError;
      }
      
      console.error("API Error:", error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_URL);

