import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { getUserById } from "./auth.service.js";
import { notifyOnAlert } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export async function createAlert(userId, data) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("userId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const organizationId = user.organizationId;

    // Mapear type a severity si no viene severity
    let severity = data.severity || (data.type === "CRITICAL" ? "critical" : data.type === "WARNING" ? "high" : data.type === "INFO" ? "medium" : "medium");
    let status = data.status || "pending";

    const newAlert = {
      organizationId,
      userId,
      assetId: data.assetId || null,
      type: data.type || "INFO",
      title: data.title.trim(),
      description: data.description?.trim() || "",
      source: data.source || "MANUAL",
      severity: severity,
      status: status,
      cveIds: Array.isArray(data.cveIds) ? data.cveIds : [],
      tactics: Array.isArray(data.tactics) ? data.tactics : [],
      metadata: data.metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("alerts").add(newAlert);
    
    logger.info("Alerta creada", { alertId: docRef.id, userId });

    const doc = await docRef.get();
    const docData = doc.data();

    const alertWithId = {
      id: docRef.id,
      ...docData,
      createdAt: docData.createdAt?.toDate?.() || docData.createdAt || new Date(),
    };

    getUserById(userId)
      .then(user => {
        if (user) {
          return notifyOnAlert(user, alertWithId);
        }
      })
      .catch(err => {
        logger.error("Error en notificaciones de alerta", { alertId: alertWithId.id, error: err.message });
      });

    return alertWithId;
  } catch (error) {
    logger.error("Error al crear alerta", { userId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al crear la alerta en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function getAlertsForUser(userId, filters = {}) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("userId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const limit = Math.min(Math.max(parseInt(filters.limit) || 20, 1), 100);
    const orderBy = filters.orderBy || "createdAt";
    const orderDirection = filters.orderDirection === "asc" ? "asc" : "desc";

    let query = db.collection("alerts").where("userId", "==", userId);

    if (filters.assetId) {
      query = query.where("assetId", "==", filters.assetId);
    }

    if (filters.type) {
      query = query.where("type", "==", filters.type);
    }

    // Nota: Firestore no permite múltiples where con diferentes campos sin índices compuestos
    // Por ahora, aplicamos los filtros en memoria después de obtener los resultados
    const snapshot = await query.orderBy(orderBy, orderDirection).limit(100).get();
    
    let alerts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      };
    });

    // Filtrar por severity si está presente
    if (filters.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }

    // Filtrar por status si está presente
    if (filters.status) {
      alerts = alerts.filter(alert => alert.status === filters.status);
    }

    // Aplicar límite después del filtrado
    alerts = alerts.slice(0, limit);

    if (filters.startAfter) {
      const startAfterDoc = await db.collection("alerts").doc(filters.startAfter).get();
      if (!startAfterDoc.exists) {
        const error = new Error("Documento de inicio para paginación no encontrado");
        error.statusCode = 400;
        throw error;
      }
    }
    
    const hasMore = alerts.length === limit;
    const lastDocId = hasMore && alerts.length > 0 ? alerts[alerts.length - 1].id : null;

    return {
      alerts,
      pagination: {
        limit,
        count: alerts.length,
        hasMore,
        lastDocId,
      },
    };
  } catch (error) {
    logger.error("Error al obtener alertas", { userId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al obtener las alertas de la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function getAlertsStats(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("userId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    // Obtener todas las alertas del usuario
    const snapshot = await db.collection("alerts")
      .where("userId", "==", userId)
      .get();

    const alerts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      };
    });

    // Calcular estadísticas
    const total = alerts.length;
    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    const byStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      archived: 0,
    };

    alerts.forEach((alert) => {
      if (alert.severity && bySeverity[alert.severity] !== undefined) {
        bySeverity[alert.severity]++;
      }
      if (alert.status && byStatus[alert.status] !== undefined) {
        byStatus[alert.status]++;
      }
    });

    return {
      total,
      bySeverity,
      byStatus,
    };
  } catch (error) {
    logger.error("Error al obtener estadísticas de alertas", { userId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al obtener las estadísticas de la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}
