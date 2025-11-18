import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { getUserById } from "./auth.service.js";
import { logger } from "../utils/logger.js";

export async function createAsset(userId, data) {
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
    if (!organizationId) {
      const error = new Error("El usuario debe pertenecer a una organización");
      error.statusCode = 400;
      throw error;
    }

    const newAsset = {
      organizationId,
      name: data.name.trim(),
      type: data.type,
      criticality: data.criticality,
      tags: Array.isArray(data.tags) ? data.tags : [],
      metadata: data.metadata || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("assets").add(newAsset);
    
    logger.info("Activo creado", { assetId: docRef.id, userId, organizationId });

    const doc = await docRef.get();
    const docData = doc.data();

    return {
      id: docRef.id,
      ...docData,
      createdAt: docData.createdAt?.toDate?.() || docData.createdAt || new Date(),
      updatedAt: docData.updatedAt?.toDate?.() || docData.updatedAt || new Date(),
    };
  } catch (error) {
    logger.error("Error al crear activo", { userId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al crear el activo en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function getAssetsForOrganization(organizationId, filters = {}) {
  if (!organizationId || typeof organizationId !== "string") {
    const error = new Error("organizationId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const limit = Math.min(Math.max(parseInt(filters.limit) || 50, 1), 100);
    const orderBy = filters.orderBy || "createdAt";
    const orderDirection = filters.orderDirection === "asc" ? "asc" : "desc";

    let query = db.collection("assets").where("organizationId", "==", organizationId);

    if (filters.type) {
      query = query.where("type", "==", filters.type);
    }

    if (filters.criticality) {
      query = query.where("criticality", "==", filters.criticality);
    }

    query = query.orderBy(orderBy, orderDirection).limit(limit);

    if (filters.startAfter) {
      const startAfterDoc = await db.collection("assets").doc(filters.startAfter).get();
      if (!startAfterDoc.exists) {
        const error = new Error("Documento de inicio para paginación no encontrado");
        error.statusCode = 400;
        throw error;
      }
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.get();

    const assets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
      };
    });

    return {
      assets,
      pagination: {
        limit,
        count: assets.length,
      },
    };
  } catch (error) {
    logger.error("Error al obtener activos", { organizationId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al obtener los activos de la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function getAssetById(organizationId, assetId) {
  if (!organizationId || typeof organizationId !== "string") {
    const error = new Error("organizationId es requerido");
    error.statusCode = 400;
    throw error;
  }

  if (!assetId || typeof assetId !== "string") {
    const error = new Error("assetId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const doc = await db.collection("assets").doc(assetId).get();

    if (!doc.exists) {
      const error = new Error("Activo no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const data = doc.data();

    if (data.organizationId !== organizationId) {
      const error = new Error("No autorizado para acceder a este activo");
      error.statusCode = 403;
      throw error;
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
    };
  } catch (error) {
    logger.error("Error al obtener activo", { assetId, organizationId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al obtener el activo de la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function updateAsset(organizationId, assetId, data) {
  if (!organizationId || typeof organizationId !== "string") {
    const error = new Error("organizationId es requerido");
    error.statusCode = 400;
    throw error;
  }

  if (!assetId || typeof assetId !== "string") {
    const error = new Error("assetId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const docRef = db.collection("assets").doc(assetId);
    const doc = await docRef.get();

    if (!doc.exists) {
      const error = new Error("Activo no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const existingData = doc.data();

    if (existingData.organizationId !== organizationId) {
      const error = new Error("No autorizado para actualizar este activo");
      error.statusCode = 403;
      throw error;
    }

    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.criticality !== undefined) updateData.criticality = data.criticality;
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    logger.info("Activo actualizado", { assetId, organizationId });

    return {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt || null,
      updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt || null,
    };
  } catch (error) {
    logger.error("Error al actualizar activo", { assetId, organizationId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al actualizar el activo en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function deleteAsset(organizationId, assetId) {
  if (!organizationId || typeof organizationId !== "string") {
    const error = new Error("organizationId es requerido");
    error.statusCode = 400;
    throw error;
  }

  if (!assetId || typeof assetId !== "string") {
    const error = new Error("assetId es requerido");
    error.statusCode = 400;
    throw error;
  }

  try {
    const doc = await db.collection("assets").doc(assetId).get();

    if (!doc.exists) {
      const error = new Error("Activo no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const data = doc.data();

    if (data.organizationId !== organizationId) {
      const error = new Error("No autorizado para eliminar este activo");
      error.statusCode = 403;
      throw error;
    }

    await db.collection("assets").doc(assetId).delete();

    logger.info("Activo eliminado", { assetId, organizationId });
  } catch (error) {
    logger.error("Error al eliminar activo", { assetId, organizationId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al eliminar el activo de la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

