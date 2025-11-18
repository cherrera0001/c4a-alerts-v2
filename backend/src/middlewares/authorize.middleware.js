import { logger } from "../utils/logger.js";

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn("authorize: usuario no autenticado");
      return res.status(401).json({
        success: false,
        error: "No autenticado",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      logger.warn("authorize: acceso denegado", {
        userId: req.user.id,
        userRole,
        allowedRoles,
      });
      return res.status(403).json({
        success: false,
        error: "Acceso denegado. No tienes permisos suficientes.",
      });
    }

    next();
  };
}

export const requireAdmin = authorize("admin");
export const requireAnalyst = authorize("admin", "analyst");

