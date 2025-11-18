import DOMPurify from "isomorphic-dompurify";
import { logger } from "../utils/logger.js";

/**
 * Sanitización robusta contra XSS y inyección de código
 * Usa DOMPurify para limpiar HTML/JavaScript malicioso
 */

// Configuración estricta de DOMPurify - sin tags HTML permitidos
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
  ADD_TAGS: [],
  ADD_ATTR: [],
};

/**
 * Sanitiza una cadena de texto removiendo HTML y JavaScript
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return str;
  
  // Limpiar caracteres nulos y caracteres de control
  const cleaned = str.replace(/[\x00-\x1F\x7F]/g, "");
  
  // Aplicar DOMPurify
  const sanitized = DOMPurify.sanitize(cleaned, DOMPURIFY_CONFIG);
  
  // Limitar longitud para prevenir DoS
  const maxLength = 100000; // 100KB
  if (sanitized.length > maxLength) {
    logger.warn("String demasiado largo después de sanitización", { 
      originalLength: str.length, 
      sanitizedLength: sanitized.length 
    });
    return sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitiza recursivamente un objeto
 */
export function sanitizeObject(obj, depth = 0, maxDepth = 20) {
  // Prevenir recursión infinita
  if (depth > maxDepth) {
    logger.warn("Profundidad máxima alcanzada en sanitización de objeto");
    return null;
  }

  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  
  // Preservar números, booleanos y funciones (con cuidado)
  if (typeof obj !== "object") {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    // Limitar tamaño de arrays para prevenir DoS
    const maxArrayLength = 1000;
    if (obj.length > maxArrayLength) {
      logger.warn("Array demasiado grande en sanitización", { length: obj.length });
      return obj.slice(0, maxArrayLength).map(item => sanitizeObject(item, depth + 1, maxDepth));
    }
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth));
  }
  
  // Sanitizar objetos
  if (typeof obj === "object") {
    // Limitar número de keys para prevenir DoS
    const keys = Object.keys(obj);
    const maxKeys = 100;
    if (keys.length > maxKeys) {
      logger.warn("Objeto con demasiadas keys en sanitización", { keyCount: keys.length });
      return {};
    }

    const sanitized = {};
    for (const key of keys) {
      // Sanitizar keys también
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey && Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1, maxDepth);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware para sanitizar el body de las peticiones
 */
export function sanitizeBody(req, res, next) {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (error) {
    logger.error("Error en sanitización de body", { error: error.message });
    // En caso de error, rechazar la petición
    res.status(400).json({
      success: false,
      error: "Error en validación de datos",
    });
  }
}
