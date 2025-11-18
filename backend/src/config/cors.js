import cors from "cors";
import { corsConfig as corsEnvConfig } from "./env.js";

/**
 * Configuración CORS estricta
 * Solo permite orígenes explícitamente definidos
 * En producción, rechaza cualquier origen no listado
 */
const allowedOrigins = corsEnvConfig.origins.length > 0
  ? corsEnvConfig.origins
  : process.env.NODE_ENV === "production" 
    ? [] 
    : ["http://localhost:5173", "http://localhost:5175", "http://localhost:3000"];

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // En producción, rechazar orígenes no definidos
    if (process.env.NODE_ENV === "production") {
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
      return;
    }

    // En desarrollo, permitir localhost pero mantener whitelist
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost")) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  credentials: corsEnvConfig.credentials,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400, // 24 horas de cache para preflight
  optionsSuccessStatus: 204,
});
