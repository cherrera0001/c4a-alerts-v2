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

    const newAlert = {
      organizationId,
      userId,
      assetId: data.assetId || null,
      type: data.type || "INFO",
      title: data.title.trim(),
      description: data.description?.trim() || "",
      source: data.source || "MANUAL",
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

    query = query.orderBy(orderBy, orderDirection).limit(limit);

    if (filters.startAfter) {
      const startAfterDoc = await db.collection("alerts").doc(filters.startAfter).get();
      if (!startAfterDoc.exists) {
        const error = new Error("Documento de inicio para paginación no encontrado");
        error.statusCode = 400;
        throw error;
      }
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.get();

    const alerts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      };
    });

    const hasMore = snapshot.docs.length === limit;
    const lastDocId = hasMore ? snapshot.docs[snapshot.docs.length - 1].id : null;

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
