import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "../utils/logger.js";

const CVE_TO_CWE_MAPPING = {
  "CVE-2021-44228": ["CWE-502"],
  "CVE-2021-45046": ["CWE-502"],
};

const CWE_TO_TACTICS_MAPPING = {
  "CWE-79": ["T1059.001", "T1059.003"],
  "CWE-502": ["T1190", "T1055"],
  "CWE-89": ["T1190", "T1055"],
};

export async function ingestFeedItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") {
    const error = new Error("rawItem es requerido y debe ser un objeto");
    error.statusCode = 400;
    throw error;
  }

  try {
    const normalizedItem = {
      source: rawItem.source || "OTHER",
      title: rawItem.title?.trim() || "",
      summary: rawItem.summary?.trim() || "",
      cveIds: Array.isArray(rawItem.cveIds) ? rawItem.cveIds : [],
      cwes: Array.isArray(rawItem.cwes) ? rawItem.cwes : [],
      actors: Array.isArray(rawItem.actors) ? rawItem.actors : [],
      sector: Array.isArray(rawItem.sector) ? rawItem.sector : [],
      regions: Array.isArray(rawItem.regions) ? rawItem.regions : [],
      references: Array.isArray(rawItem.references) ? rawItem.references : [],
      severity: rawItem.severity || "MEDIUM",
      publishedAt: rawItem.publishedAt || null,
      ingestedAt: FieldValue.serverTimestamp(),
      enriched: false,
      enrichmentData: {},
    };

    const docRef = await db.collection("cti_items").add(normalizedItem);
    
    logger.info("Item CTI ingerido", { ctiItemId: docRef.id, source: normalizedItem.source });

    const doc = await docRef.get();
    const docData = doc.data();

    return {
      id: docRef.id,
      ...docData,
      ingestedAt: docData.ingestedAt?.toDate?.() || docData.ingestedAt || new Date(),
      publishedAt: docData.publishedAt ? new Date(docData.publishedAt) : null,
    };
  } catch (error) {
    logger.error("Error al ingerir item CTI", { error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al ingerir el item CTI en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function enrichItem(item) {
  if (!item || !item.id) {
    const error = new Error("item es requerido y debe tener un id");
    error.statusCode = 400;
    throw error;
  }

  try {
    const mappedTactics = [];
    const probableTargets = [];
    const recommendedControls = [];

    for (const cveId of item.cveIds || []) {
      const cwes = CVE_TO_CWE_MAPPING[cveId] || [];
      
      for (const cwe of cwes) {
        const tactics = CWE_TO_TACTICS_MAPPING[cwe] || [];
        mappedTactics.push(...tactics);
      }
    }

    if (item.sector && item.sector.length > 0) {
      probableTargets.push(...item.sector);
    }

    if (item.cwes && item.cwes.length > 0) {
      recommendedControls.push(`Aplicar controles para: ${item.cwes.join(", ")}`);
    }

    const enrichmentData = {
      mappedTactics: [...new Set(mappedTactics)],
      probableTargets: [...new Set(probableTargets)],
      recommendedControls,
    };

    await db.collection("cti_items").doc(item.id).update({
      enriched: true,
      enrichmentData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("Item CTI enriquecido", { ctiItemId: item.id });

    return {
      ...item,
      enriched: true,
      enrichmentData,
    };
  } catch (error) {
    logger.error("Error al enriquecer item CTI", { ctiItemId: item.id, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al enriquecer el item CTI en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function getCtiItems(filters = {}) {
  try {
    const limit = Math.min(Math.max(parseInt(filters.limit) || 20, 1), 100);
    const orderBy = filters.orderBy || "publishedAt";
    const orderDirection = filters.orderDirection === "asc" ? "asc" : "desc";

    let query = db.collection("cti_items");

    if (filters.source) {
      query = query.where("source", "==", filters.source);
    }

    if (filters.severity) {
      query = query.where("severity", "==", filters.severity);
    }

    query = query.orderBy(orderBy, orderDirection).limit(limit);

    if (filters.startAfter) {
      const startAfterDoc = await db.collection("cti_items").doc(filters.startAfter).get();
      if (!startAfterDoc.exists) {
        const error = new Error("Documento de inicio para paginación no encontrado");
        error.statusCode = 400;
        throw error;
      }
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        ingestedAt: data.ingestedAt?.toDate?.() || data.ingestedAt || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      };
    });

    const hasMore = snapshot.docs.length === limit;
    const lastDocId = hasMore ? snapshot.docs[snapshot.docs.length - 1].id : null;

    return {
      items,
      pagination: {
        limit,
        count: items.length,
        hasMore,
        lastDocId,
      },
    };
  } catch (error) {
    logger.error("Error al obtener items CTI", { error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al obtener los items CTI de la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}
