import { z } from "zod";
import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof z.ZodError) {
    logger.error("Error de validación Zod", { errors: err.errors });
    return res.status(400).json({
      success: false,
      error: "Error de validación",
      details: err.errors.map((e) => ({
        field: e.path.join(".") || "root",
        message: e.message,
        code: e.code,
      })),
    });
  }

  if (err.statusCode) {
    logger.error(`Error ${err.statusCode}`, { message: err.message });
    return res.status(err.statusCode).json({
      success: false,
      error: err.message || "Error en la petición",
      ...(process.env.NODE_ENV === "development" && { 
        stack: err.stack,
        details: err.details 
      }),
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    logger.error("Error de sintaxis JSON", { message: err.message });
    return res.status(400).json({
      success: false,
      error: "Error de sintaxis JSON",
      message: "El cuerpo de la petición no es un JSON válido",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }

  logger.error("Error no manejado", { stack: err.stack });
  const statusCode = err.status || 500;
  const message = err.message || "Error interno del servidor";

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      ...(err.code && { code: err.code }),
    }),
  });
}
