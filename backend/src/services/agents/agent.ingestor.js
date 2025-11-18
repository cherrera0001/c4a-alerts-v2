import { BaseAgent } from "./agent.base.js";
import CtiIngestor from "../cti.ingestor.js";
import CtiCorrelation from "../cti.correlation.js";
import { logger } from "../../utils/logger.js";

/**
 * Agente Ingestor CTI
 * Orquesta la ingestión automática de feeds CTI
 * Dispara correlación automática después de ingestión
 */

class IngestorAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: "IngestorAgent",
      ...config,
    });

    this.ctiIngestor = config.ctiIngestor || new CtiIngestor({
      enableMisp: config.enableMisp !== false,
      enableNvd: config.enableNvd !== false,
      enableRss: config.enableRss !== false,
    });

    this.correlation = config.correlation || new CtiCorrelation();
    this.autoCorrelate = config.autoCorrelate !== false;
    this.autoEnrich = config.autoEnrich !== false;
  }

  /**
   * Ejecuta ingestión completa de fuentes CTI
   * @param {Object} input - { sources: ["misp", "nvd", "rss"], options: {...} }
   * @returns {Promise<Object>} Resultado de ingestión
   */
  async process(input) {
    const { sources, options = {} } = input || {};

    try {
      logger.info("Iniciando ingestión automática de CTI", { sources });

      const ingestOptions = {
        enableMisp: !sources || sources.includes("misp"),
        enableNvd: !sources || sources.includes("nvd"),
        enableRss: !sources || sources.includes("rss"),
        autoEnrich: this.autoEnrich,
        ...options,
      };

      // Ingestar todas las fuentes
      const results = await this.ctiIngestor.ingestAllSources(ingestOptions);

      // Correlación automática si está habilitada
      if (this.autoCorrelate && results.total.items > 0) {
        try {
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

          // Correlacionar items CTI nuevos con cada organización
          const allItems = [
            ...(results.misp.items || []),
            ...(results.nvd.items || []),
            ...(results.rss.items || []),
          ];

          const correlationResults = {
            organizationsEvaluated: 0,
            totalAlertsGenerated: 0,
            errors: [],
          };

          for (const organizationId of organizationIds) {
            try {
              const orgCorrelation = await this.correlation.correlateRecentCtiItems(
                organizationId,
                {
                  limit: allItems.length,
                }
              );
              correlationResults.organizationsEvaluated++;
              correlationResults.totalAlertsGenerated += orgCorrelation.alertsGenerated || 0;
            } catch (error) {
              correlationResults.errors.push({
                organizationId,
                error: error.message,
              });
            }
          }

          results.correlation = correlationResults;
        } catch (error) {
          logger.error("Error en correlación automática post-ingestión", {
            error: error.message,
          });
          results.correlation = {
            error: error.message,
          };
        }
      }

      logger.info("Ingestión automática completada", {
        totalItems: results.total.items,
        alertsGenerated: results.correlation?.totalAlertsGenerated || 0,
      });

      return results;
    } catch (error) {
      logger.error("Error en proceso de ingestión", { error: error.message });
      throw error;
    }
  }

  /**
   * Verifica estado de fuentes CTI
   * @returns {Promise<Object>} Estado de cada fuente
   */
  async checkSourcesStatus() {
    return await this.ctiIngestor.checkSourcesStatus();
  }
}

export default IngestorAgent;
export { IngestorAgent };

