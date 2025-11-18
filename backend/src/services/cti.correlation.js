import { db } from "../config/firebase.js";
import { logger } from "../utils/logger.js";
import { getAssetsForOrganization } from "./assets.service.js";
import { createAlert } from "./alerts.service.js";
import { getCtiItems } from "./cti.service.js";

/**
 * Servicio de correlación automática CTI → Activos → Alertas
 * Compara items CTI con el inventario de activos del cliente
 * Genera alertas automáticamente cuando hay coincidencias
 */

class CtiCorrelation {
  constructor() {
    // Mapeo de tecnologías comunes a CVEs (puede extenderse con IA)
    this.techToCvePatterns = {
      "apache": /apache|httpd/i,
      "nginx": /nginx/i,
      "nodejs": /node[.\s]?js|node\.js/i,
      "react": /react/i,
      "angular": /angular/i,
      "vue": /vue/i,
      "express": /express[.\s]?js|express\.js/i,
      "mongodb": /mongo[.\s]?db|mongo\.db/i,
      "postgresql": /postgres|postgresql/i,
      "mysql": /mysql|maria[.\s]?db/i,
      "redis": /redis/i,
      "docker": /docker/i,
      "kubernetes": /k8s|kubernetes/i,
      "wordpress": /wordpress/i,
      "drupal": /drupal/i,
      "php": /php/i,
      "python": /python/i,
      "java": /java/i,
      "spring": /spring[.\s]?boot|spring\.boot/i,
      ".net": /\.net|dotnet|asp\.net/i,
    };
  }

  /**
   * Extrae tecnologías de un activo basado en tags, nombre y metadata
   * @param {Object} asset - Activo
   * @returns {string[]} Lista de tecnologías detectadas
   */
  extractTechnologies(asset) {
    const technologies = new Set();
    
    // Buscar en tags
    if (asset.tags && Array.isArray(asset.tags)) {
      for (const tag of asset.tags) {
        const tagLower = tag.toLowerCase();
        for (const [tech, pattern] of Object.entries(this.techToCvePatterns)) {
          if (pattern.test(tagLower)) {
            technologies.add(tech);
          }
        }
      }
    }

    // Buscar en nombre
    if (asset.name) {
      const nameLower = asset.name.toLowerCase();
      for (const [tech, pattern] of Object.entries(this.techToCvePatterns)) {
        if (pattern.test(nameLower)) {
          technologies.add(tech);
        }
      }
    }

    // Buscar en metadata
    if (asset.metadata) {
      const metadataStr = JSON.stringify(asset.metadata).toLowerCase();
      for (const [tech, pattern] of Object.entries(this.techToCvePatterns)) {
        if (pattern.test(metadataStr)) {
          technologies.add(tech);
        }
      }
    }

    return Array.from(technologies);
  }

  /**
   * Verifica si un CVE es relevante para un activo
   * @param {Object} ctiItem - Item CTI
   * @param {Object} asset - Activo
   * @returns {boolean} true si es relevante
   */
  isCveRelevantForAsset(ctiItem, asset) {
    // Si el item CTI no tiene CVEs, no es relevante
    if (!ctiItem.cveIds || ctiItem.cveIds.length === 0) {
      return false;
    }

    // Extraer tecnologías del activo
    const assetTechnologies = this.extractTechnologies(asset);
    
    if (assetTechnologies.length === 0) {
      // Sin tecnologías detectadas, asumir relevancia genérica si la severidad es alta
      return ctiItem.severity === "CRITICAL" || ctiItem.severity === "HIGH";
    }

    // Buscar menciones de tecnologías en el resumen/título del CTI item
    const ctiText = (ctiItem.title || "") + " " + (ctiItem.summary || "");
    const ctiTextLower = ctiText.toLowerCase();

    for (const tech of assetTechnologies) {
      const pattern = this.techToCvePatterns[tech];
      if (pattern && pattern.test(ctiTextLower)) {
        return true;
      }
    }

    // Si la severidad es crítica o alta, considerar relevante aunque no haya match exacto
    if (ctiItem.severity === "CRITICAL") {
      return true;
    }

    return false;
  }

  /**
   * Determina el tipo de alerta basado en severidad del CTI item
   * @param {string} severity - Severidad del CTI item
   * @returns {string} Tipo de alerta (CRITICAL, WARNING, INFO)
   */
  determineAlertType(severity) {
    switch (severity) {
      case "CRITICAL":
        return "CRITICAL";
      case "HIGH":
        return "WARNING";
      case "MEDIUM":
        return "WARNING";
      case "LOW":
        return "INFO";
      default:
        return "INFO";
    }
  }

  /**
   * Correlaciona un item CTI con los activos de una organización
   * @param {string} organizationId - ID de la organización
   * @param {Object} ctiItem - Item CTI a correlacionar
   * @returns {Promise<Array>} Lista de alertas generadas
   */
  async correlateCtiItemWithAssets(organizationId, ctiItem) {
    if (!organizationId || !ctiItem || !ctiItem.id) {
      throw new Error("organizationId y ctiItem son requeridos");
    }

    try {
      logger.info("Correlacionando item CTI con activos", {
        organizationId,
        ctiItemId: ctiItem.id,
        cveIds: ctiItem.cveIds,
      });

      // Obtener todos los activos de la organización
      const assetsResult = await getAssetsForOrganization(organizationId, {
        limit: 1000, // Obtener hasta 1000 activos
      });

      const assets = assetsResult.assets || [];
      const alertsGenerated = [];

      // Correlacionar con cada activo
      for (const asset of assets) {
        if (this.isCveRelevantForAsset(ctiItem, asset)) {
          try {
            // Generar alerta
            const alertType = this.determineAlertType(ctiItem.severity);
            
            // Encontrar un usuario de la organización para asociar la alerta
            // Por ahora, usamos el primer usuario disponible (en producción se debería mejorar)
            const usersSnapshot = await db
              .collection("users")
              .where("organizationId", "==", organizationId)
              .limit(1)
              .get();

            if (usersSnapshot.empty) {
              logger.warn("No hay usuarios en la organización para generar alerta", {
                organizationId,
              });
              continue;
            }

            const userId = usersSnapshot.docs[0].id;

            const alert = await createAlert(userId, {
              assetId: asset.id,
              type: alertType,
              title: `CTI: ${ctiItem.title}`,
              description: `Vulnerabilidad detectada relacionada con el activo "${asset.name}". ${ctiItem.summary || ""}`,
              source: "CTI_FEED",
              cveIds: ctiItem.cveIds || [],
              tactics: ctiItem.enrichmentData?.mappedTactics || [],
              metadata: {
                ctiItemId: ctiItem.id,
                ctiSource: ctiItem.source,
                severity: ctiItem.severity,
                correlationReason: "CVE relevante para tecnología del activo",
                assetName: asset.name,
                assetType: asset.type,
              },
            });

            alertsGenerated.push(alert);
            logger.info("Alerta generada por correlación CTI", {
              alertId: alert.id,
              assetId: asset.id,
              ctiItemId: ctiItem.id,
            });
          } catch (error) {
            logger.error("Error generando alerta por correlación", {
              error: error.message,
              assetId: asset.id,
              ctiItemId: ctiItem.id,
            });
          }
        }
      }

      logger.info("Correlación CTI completada", {
        organizationId,
        ctiItemId: ctiItem.id,
        assetsEvaluated: assets.length,
        alertsGenerated: alertsGenerated.length,
      });

      return alertsGenerated;
    } catch (error) {
      logger.error("Error en correlación CTI", {
        error: error.message,
        organizationId,
        ctiItemId: ctiItem?.id,
      });
      throw error;
    }
  }

  /**
   * Correlaciona todos los items CTI recientes con los activos de una organización
   * @param {string} organizationId - ID de la organización
   * @param {Object} options - Opciones de correlación
   * @returns {Promise<Object>} Resumen de correlación
   */
  async correlateRecentCtiItems(organizationId, options = {}) {
    if (!organizationId) {
      throw new Error("organizationId es requerido");
    }

    try {
      logger.info("Iniciando correlación masiva de CTI items", { organizationId });

      // Obtener items CTI recientes (últimos 30 días por defecto)
      const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const ctiResult = await getCtiItems({
        limit: options.limit || 100,
        orderBy: "publishedAt",
        orderDirection: "desc",
      });

      const ctiItems = ctiResult.items || [];
      const results = {
        organizationId,
        itemsEvaluated: ctiItems.length,
        alertsGenerated: 0,
        errors: [],
        startTime: new Date(),
      };

      // Correlacionar cada item
      for (const ctiItem of ctiItems) {
        // Solo correlacionar si fue publicado después de 'since'
        const publishedAt = ctiItem.publishedAt 
          ? (ctiItem.publishedAt instanceof Date ? ctiItem.publishedAt : new Date(ctiItem.publishedAt))
          : null;

        if (publishedAt && publishedAt < since) {
          continue;
        }

        try {
          const alerts = await this.correlateCtiItemWithAssets(organizationId, ctiItem);
          results.alertsGenerated += alerts.length;
        } catch (error) {
          results.errors.push({
            ctiItemId: ctiItem.id,
            error: error.message,
          });
          logger.error("Error correlacionando item CTI", {
            ctiItemId: ctiItem.id,
            error: error.message,
          });
        }
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;

      logger.info("Correlación masiva completada", {
        organizationId,
        itemsEvaluated: results.itemsEvaluated,
        alertsGenerated: results.alertsGenerated,
        errors: results.errors.length,
        duration: `${results.duration}ms`,
      });

      return results;
    } catch (error) {
      logger.error("Error en correlación masiva de CTI", {
        error: error.message,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Correlaciona un nuevo item CTI con todas las organizaciones activas
   * @param {Object} ctiItem - Item CTI recién ingerido
   * @returns {Promise<Object>} Resumen de correlación
   */
  async correlateCtiItemWithAllOrganizations(ctiItem) {
    if (!ctiItem || !ctiItem.id) {
      throw new Error("ctiItem es requerido");
    }

    try {
      logger.info("Correlacionando item CTI con todas las organizaciones", {
        ctiItemId: ctiItem.id,
      });

      // Obtener todas las organizaciones únicas
      const assetsSnapshot = await db
        .collection("assets")
        .select("organizationId")
        .get();

      const organizationIds = new Set();
      for (const doc of assetsSnapshot.docs) {
        const data = doc.data();
        if (data.organizationId) {
          organizationIds.add(data.organizationId);
        }
      }

      const results = {
        ctiItemId: ctiItem.id,
        organizationsEvaluated: organizationIds.size,
        totalAlertsGenerated: 0,
        errors: [],
        startTime: new Date(),
      };

      // Correlacionar con cada organización
      for (const organizationId of organizationIds) {
        try {
          const alerts = await this.correlateCtiItemWithAssets(organizationId, ctiItem);
          results.totalAlertsGenerated += alerts.length;
        } catch (error) {
          results.errors.push({
            organizationId,
            error: error.message,
          });
          logger.error("Error correlacionando item CTI con organización", {
            organizationId,
            ctiItemId: ctiItem.id,
            error: error.message,
          });
        }
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;

      logger.info("Correlación con todas las organizaciones completada", {
        ctiItemId: ctiItem.id,
        organizationsEvaluated: results.organizationsEvaluated,
        totalAlertsGenerated: results.totalAlertsGenerated,
        errors: results.errors.length,
      });

      return results;
    } catch (error) {
      logger.error("Error en correlación global de CTI", {
        error: error.message,
        ctiItemId: ctiItem?.id,
      });
      throw error;
    }
  }
}

export default CtiCorrelation;
export { CtiCorrelation };

