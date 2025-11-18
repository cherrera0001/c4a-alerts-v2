import { BaseAgent } from "./agent.base.js";
import { enrichItem } from "../cti.service.js";
import IAClient from "../ia/ia.client.js";
import { logger } from "../../utils/logger.js";

/**
 * Agente de Enriquecimiento CTI
 * Usa IA para enriquecer items CTI con:
 * - Resúmenes mejorados
 * - Mapeo a MITRE ATT&CK
 * - Clasificación de sectores/regiones/actores
 * - Recomendaciones de mitigación
 */

class EnricherAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: "EnricherAgent",
      ...config,
    });

    this.iaClient = config.iaClient || new IAClient({
      enabled: !!process.env.OPENAI_API_KEY || 
               !!process.env.AZURE_OPENAI_API_KEY || 
               !!process.env.GOOGLE_AI_API_KEY,
    });

    this.autoEnrich = config.autoEnrich !== false;
    this.enableMitreMapping = config.enableMitreMapping !== false;
    this.enableClassification = config.enableClassification !== false;
  }

  /**
   * Enriquece un item CTI usando IA
   * @param {Object} input - { ctiItem: {...} }
   * @returns {Promise<Object>} Item CTI enriquecido
   */
  async process(input) {
    const { ctiItem } = input;

    if (!ctiItem || !ctiItem.id) {
      throw new Error("ctiItem con id es requerido");
    }

    try {
      logger.info("Enriqueciendo item CTI con IA", { ctiItemId: ctiItem.id });

      const enrichmentData = {
        mappedTactics: ctiItem.enrichmentData?.mappedTactics || [],
        probableTargets: ctiItem.enrichmentData?.probableTargets || [],
        recommendedControls: ctiItem.enrichmentData?.recommendedControls || [],
        aiSummary: null,
        mitreMapping: null,
        classification: null,
        mitigationPlan: null,
      };

      // 1. Generar resumen mejorado con IA
      if (ctiItem.summary && this.iaClient) {
        try {
          enrichmentData.aiSummary = await this.iaClient.summarizeThreat(
            ctiItem.summary || ctiItem.title,
            { focus: "CVEs, severidad y impacto" }
          );
        } catch (error) {
          logger.warn("Error generando resumen con IA", { 
            ctiItemId: ctiItem.id,
            error: error.message 
          });
        }
      }

      // 2. Mapear a MITRE ATT&CK con IA
      if (this.enableMitreMapping && this.iaClient) {
        try {
          enrichmentData.mitreMapping = await this.iaClient.mapThreatToMitre(ctiItem);
          if (enrichmentData.mitreMapping?.tactics) {
            enrichmentData.mappedTactics = [
              ...new Set([
                ...enrichmentData.mappedTactics,
                ...enrichmentData.mitreMapping.tactics,
              ]),
            ];
          }
        } catch (error) {
          logger.warn("Error mapeando a MITRE con IA", { 
            ctiItemId: ctiItem.id,
            error: error.message 
          });
        }
      }

      // 3. Clasificar (sectores, regiones, actores) con IA
      if (this.enableClassification && this.iaClient) {
        try {
          enrichmentData.classification = await this.iaClient.classifyCtiItem(ctiItem);
          
          if (enrichmentData.classification?.sectors) {
            enrichmentData.probableTargets = [
              ...new Set([
                ...enrichmentData.probableTargets,
                ...enrichmentData.classification.sectors,
              ]),
            ];
          }
        } catch (error) {
          logger.warn("Error clasificando con IA", { 
            ctiItemId: ctiItem.id,
            error: error.message 
          });
        }
      }

      // 4. Generar plan de mitigación con IA
      if (this.iaClient) {
        try {
          enrichmentData.mitigationPlan = await this.iaClient.generateMitigationPlan(ctiItem);
          
          if (enrichmentData.mitigationPlan?.recommendedControls) {
            enrichmentData.recommendedControls = [
              ...new Set([
                ...enrichmentData.recommendedControls,
                ...enrichmentData.mitigationPlan.recommendedControls,
              ]),
            ];
          }
        } catch (error) {
          logger.warn("Error generando plan de mitigación con IA", { 
            ctiItemId: ctiItem.id,
            error: error.message 
          });
        }
      }

      // Guardar enriquecimiento en la base de datos
      const enrichedItem = await enrichItem({
        ...ctiItem,
        enrichmentData,
      });

      logger.info("Item CTI enriquecido exitosamente", { 
        ctiItemId: ctiItem.id,
        hasMitreMapping: !!enrichmentData.mitreMapping,
        hasClassification: !!enrichmentData.classification,
        hasMitigationPlan: !!enrichmentData.mitigationPlan,
      });

      return enrichedItem;
    } catch (error) {
      logger.error("Error en proceso de enriquecimiento", { 
        ctiItemId: ctiItem?.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Valida la entrada para el agente
   * @param {Object} input - Entrada a validar
   * @returns {boolean} true si es válida
   */
  validateInput(input) {
    return super.validateInput(input) &&
           input.ctiItem &&
           typeof input.ctiItem === "object" &&
           input.ctiItem.id;
  }
}

export default EnricherAgent;
export { EnricherAgent };

