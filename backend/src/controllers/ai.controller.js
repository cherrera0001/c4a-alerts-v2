import IAClient from "../services/ia/ia.client.js";
import { EnricherAgent } from "../services/agents/agent.enricher.js";
import { TriageAgent } from "../services/agents/agent.triage.js";
import { ReporterAgent } from "../services/agents/agent.reporter.js";
import { logger } from "../utils/logger.js";
import { db } from "../config/firebase.js";

/**
 * Controladores para endpoints de IA y Agentes
 */

const iaClient = new IAClient({
  enabled: !!process.env.OPENAI_API_KEY || 
           !!process.env.AZURE_OPENAI_API_KEY || 
           !!process.env.GOOGLE_AI_API_KEY,
});

const enricherAgent = new EnricherAgent({ iaClient });
const triageAgent = new TriageAgent({ iaClient });
const reporterAgent = new ReporterAgent({ iaClient });

/**
 * POST /api/ai/enrich/:id
 * Enriquece un item CTI usando IA
 */
export async function enrichCtiWithAI(req, res, next) {
  try {
    const { id } = req.params;

    // Obtener item CTI
    const doc = await db.collection("cti_items").doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Item CTI no encontrado",
      });
    }

    const ctiItem = { id: doc.id, ...doc.data() };

    // Enriquecer con agente
    const enriched = await enricherAgent.run({ ctiItem });

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/predict/impact
 * Predice el impacto de una amenaza para activos
 */
export async function predictImpact(req, res, next) {
  try {
    const { ctiItemId, organizationId } = req.body;

    if (!ctiItemId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: "ctiItemId y organizationId son requeridos",
      });
    }

    // Obtener item CTI
    const ctiDoc = await db.collection("cti_items").doc(ctiItemId).get();
    if (!ctiDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Item CTI no encontrado",
      });
    }

    const ctiItem = { id: ctiDoc.id, ...ctiDoc.data() };

    // Ejecutar triage
    const triageResult = await triageAgent.run({
      ctiItem,
      organizationId,
    });

    res.json({
      success: true,
      data: triageResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/recommend/mitigations
 * Genera recomendaciones de mitigación usando IA
 */
export async function recommendMitigations(req, res, next) {
  try {
    const { ctiItemId, assetId } = req.body;

    if (!ctiItemId) {
      return res.status(400).json({
        success: false,
        error: "ctiItemId es requerido",
      });
    }

    // Obtener item CTI
    const ctiDoc = await db.collection("cti_items").doc(ctiItemId).get();
    if (!ctiDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Item CTI no encontrado",
      });
    }

    const ctiItem = { id: ctiDoc.id, ...ctiDoc.data() };

    // Obtener activo si se proporciona
    let asset = null;
    if (assetId) {
      const assetDoc = await db.collection("assets").doc(assetId).get();
      if (assetDoc.exists) {
        asset = { id: assetDoc.id, ...assetDoc.data() };
      }
    }

    // Generar plan de mitigación
    const mitigationPlan = await iaClient.generateMitigationPlan(ctiItem, asset);

    res.json({
      success: true,
      data: {
        ctiItemId,
        assetId,
        mitigationPlan,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/agents/status
 * Obtiene estado de todos los agentes
 */
export async function getAgentsStatus(req, res, next) {
  try {
    const status = {
      enricher: enricherAgent.getStats(),
      triage: triageAgent.getStats(),
      reporter: reporterAgent.getStats(),
      iaClient: {
        enabled: iaClient.enabled,
        provider: iaClient.provider,
        connection: await iaClient.testConnection(),
      },
      timestamp: new Date(),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/agents/ingest
 * Dispara ingestión automática de CTI
 */
export async function triggerIngestion(req, res, next) {
  try {
    const { IngestorAgent } = await import("../services/agents/agent.ingestor.js");
    const ingestorAgent = new IngestorAgent();

    const { sources, options } = req.body;

    // Ejecutar en background (no bloquear respuesta)
    ingestorAgent.run({ sources, options })
      .then((result) => {
        logger.info("Ingestión automática completada", {
          totalItems: result.total?.items || 0,
        });
      })
      .catch((error) => {
        logger.error("Error en ingestión automática", {
          error: error.message,
        });
      });

    res.status(202).json({
      success: true,
      message: "Ingestión automática iniciada",
      data: {
        startedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/agents/report
 * Genera un reporte usando el agente reporter
 */
export async function generateReport(req, res, next) {
  try {
    const { type, organizationId, userId, period } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: "type es requerido (executive, technical, threat_landscape)",
      });
    }

    // Ejecutar agente reporter
    const report = await reporterAgent.run({
      type,
      organizationId,
      userId,
      period,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

