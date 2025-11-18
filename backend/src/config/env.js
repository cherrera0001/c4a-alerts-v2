import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sistema de carga de variables de entorno desde múltiples fuentes
 * Orden de prioridad:
 * 1. Variables de entorno del sistema (process.env)
 * 2. Archivo .env.local (para desarrollo local)
 * 3. Archivo .env (para desarrollo)
 * 4. Valores por defecto
 */

// Cargar .env base si existe
const envPath = path.join(__dirname, "../../.env");
const envLocalPath = path.join(__dirname, "../../.env.local");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false });
  console.log("✅ Variables de entorno cargadas desde .env.local");
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
  console.log("✅ Variables de entorno cargadas desde .env");
} else {
  console.warn("⚠️  No se encontró archivo .env. Usando variables del sistema.");
}

/**
 * Obtiene una variable de entorno con valor por defecto
 * @param {string} key - Nombre de la variable
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {string|any} Valor de la variable o valor por defecto
 */
export function getEnv(key, defaultValue = null) {
  // Prioridad: process.env (variables del sistema) > valores por defecto
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

/**
 * Obtiene una variable de entorno requerida
 * Lanza error si no existe
 * @param {string} key - Nombre de la variable
 * @returns {string} Valor de la variable
 * @throws {Error} Si la variable no existe
 */
export function getEnvRequired(key) {
  const value = process.env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Variable de entorno requerida faltante: ${key}`);
  }
  return value;
}

/**
 * Configuración del servidor
 */
export const serverConfig = {
  port: parseInt(getEnv("PORT", "3001"), 10),
  nodeEnv: getEnv("NODE_ENV", "development"),
  logLevel: getEnv("LOG_LEVEL", process.env.NODE_ENV === "production" ? "INFO" : "DEBUG"),
};

/**
 * Configuración de autenticación
 */
export const authConfig = {
  jwtSecret: getEnv("JWT_SECRET", "CHANGE_ME_NOW_USE_A_STRONG_SECRET_IN_PRODUCTION"),
  jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "7d"),
};

/**
 * Configuración de CORS
 */
export const corsConfig = {
  origins: getEnv("CORS_ORIGIN", "http://localhost:5173,http://localhost:5175")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  credentials: getEnv("CORS_CREDENTIALS", "true") === "true",
};

/**
 * Configuración de Firebase
 */
export const firebaseConfig = {
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  privateKey: getEnv("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
  clientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
  // Verificar si Firebase está configurado
  isConfigured: () => {
    return !!(
      firebaseConfig.projectId &&
      firebaseConfig.privateKey &&
      firebaseConfig.clientEmail
    );
  },
};

/**
 * Configuración de SMTP (Email)
 */
export const smtpConfig = {
  host: getEnv("SMTP_HOST"),
  port: parseInt(getEnv("SMTP_PORT", "587"), 10),
  secure: getEnv("SMTP_SECURE", "false") === "true",
  user: getEnv("SMTP_USER"),
  pass: getEnv("SMTP_PASS"),
  from: getEnv("SMTP_FROM", "noreply@c4a-alerts.com"),
  // Verificar si SMTP está configurado
  isConfigured: () => {
    return !!(
      smtpConfig.host &&
      smtpConfig.user &&
      smtpConfig.pass
    );
  },
};

/**
 * Configuración de Twilio (WhatsApp)
 */
export const twilioConfig = {
  accountSid: getEnv("TWILIO_ACCOUNT_SID"),
  authToken: getEnv("TWILIO_AUTH_TOKEN"),
  whatsappFrom: getEnv("TWILIO_WHATSAPP_FROM"),
  // Verificar si Twilio está configurado
  isConfigured: () => {
    return !!(
      twilioConfig.accountSid &&
      twilioConfig.authToken &&
      twilioConfig.whatsappFrom
    );
  },
};

/**
 * Configuración de Telegram
 */
export const telegramConfig = {
  botToken: getEnv("TELEGRAM_BOT_TOKEN"),
  chatId: getEnv("TELEGRAM_CHAT_ID"),
  // Verificar si Telegram está configurado
  isConfigured: () => {
    return !!(
      telegramConfig.botToken &&
      telegramConfig.chatId
    );
  },
};

/**
 * Configuración de CTI (Cyber Threat Intelligence)
 */
export const ctiConfig = {
  misp: {
    baseURL: getEnv("MISP_BASE_URL"),
    apiKey: getEnv("MISP_API_KEY"),
    enabled: !!getEnv("MISP_BASE_URL") && !!getEnv("MISP_API_KEY"),
  },
  nvd: {
    apiKey: getEnv("NVD_API_KEY"),
    enabled: !!getEnv("NVD_API_KEY"),
    baseURL: "https://services.nvd.nist.gov/rest/json/cves/2.0",
  },
  rss: {
    enabled: getEnv("RSS_ENABLED", "true") === "true",
    feeds: getEnv("RSS_FEEDS", "")
      .split(",")
      .map((feed) => feed.trim())
      .filter(Boolean),
  },
};

/**
 * Configuración de IA (Inteligencia Artificial)
 */
export const iaConfig = {
  provider: getEnv("IA_PROVIDER", 
    getEnv("OPENAI_API_KEY") ? "openai" : 
    getEnv("GOOGLE_AI_API_KEY") ? "gemini" : 
    "azure"),
  openai: {
    apiKey: getEnv("OPENAI_API_KEY"),
    model: getEnv("OPENAI_MODEL", "gpt-4-turbo-preview"),
    baseURL: getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    enabled: !!getEnv("OPENAI_API_KEY"),
  },
  azure: {
    apiKey: getEnv("AZURE_OPENAI_API_KEY"),
    endpoint: getEnv("AZURE_OPENAI_ENDPOINT"),
    deployment: getEnv("AZURE_OPENAI_DEPLOYMENT", "gpt-4"),
    apiVersion: getEnv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
    enabled: !!(getEnv("AZURE_OPENAI_API_KEY") && getEnv("AZURE_OPENAI_ENDPOINT")),
  },
  gemini: {
    apiKey: getEnv("GOOGLE_AI_API_KEY"),
    model: getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
    baseURL: getEnv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
    enabled: !!getEnv("GOOGLE_AI_API_KEY"),
  },
  // Determinar qué proveedor está habilitado
  getEnabledProvider: () => {
    if (iaConfig.openai.enabled) return "openai";
    if (iaConfig.azure.enabled) return "azure";
    if (iaConfig.gemini.enabled) return "gemini";
    return null;
  },
};

/**
 * Resumen de configuración (sin valores sensibles)
 */
export function getConfigSummary() {
  return {
    server: {
      port: serverConfig.port,
      nodeEnv: serverConfig.nodeEnv,
      logLevel: serverConfig.logLevel,
    },
    auth: {
      jwtConfigured: !!authConfig.jwtSecret && authConfig.jwtSecret !== "CHANGE_ME_NOW_USE_A_STRONG_SECRET_IN_PRODUCTION",
      jwtExpiresIn: authConfig.jwtExpiresIn,
    },
    cors: {
      origins: corsConfig.origins,
      credentials: corsConfig.credentials,
    },
    firebase: {
      configured: firebaseConfig.isConfigured(),
    },
    smtp: {
      configured: smtpConfig.isConfigured(),
    },
    twilio: {
      configured: twilioConfig.isConfigured(),
    },
    telegram: {
      configured: telegramConfig.isConfigured(),
    },
    cti: {
      misp: ctiConfig.misp.enabled,
      nvd: ctiConfig.nvd.enabled,
      rss: ctiConfig.rss.enabled,
    },
    ia: {
      provider: iaConfig.getEnabledProvider(),
      openai: iaConfig.openai.enabled,
      azure: iaConfig.azure.enabled,
      gemini: iaConfig.gemini.enabled,
    },
  };
}

export default {
  server: serverConfig,
  auth: authConfig,
  cors: corsConfig,
  firebase: firebaseConfig,
  smtp: smtpConfig,
  twilio: twilioConfig,
  telegram: telegramConfig,
  cti: ctiConfig,
  ia: iaConfig,
  getEnv,
  getEnvRequired,
  getConfigSummary,
};

