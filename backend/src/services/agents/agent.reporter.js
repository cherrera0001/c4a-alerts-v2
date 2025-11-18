import { BaseAgent } from "./agent.base.js";
import IAClient from "../ia/ia.client.js";
import { getCtiItems } from "../cti.service.js";
import { getAlertsForUser } from "../alerts.service.js";
import { logger } from "../../utils/logger.js";
import { db } from "../../config/firebase.js";

/**
 * Agente Reporter
 * Genera reportes ejecutivos y técnicos sobre amenazas y alertas
 * Usa IA para crear resúmenes y análisis
 */

class ReporterAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: "ReporterAgent",
      ...config,
    });

    this.iaClient = config.iaClient || new IAClient({
      enabled: !!process.env.OPENAI_API_KEY || 
               !!process.env.AZURE_OPENAI_API_KEY || 
               !!process.env.GOOGLE_AI_API_KEY,
    });

    this.reportTypes = ["executive", "technical", "threat_landscape"];
  }

  /**
   * Genera un reporte
   * @param {Object} input - { type: "executive|technical|threat_landscape", organizationId: "...", userId: "...", period: {...} }
   * @returns {Promise<Object>} Reporte generado
   */
  async process(input) {
    const { type, organizationId, userId, period } = input;

    if (!type || !this.reportTypes.includes(type)) {
      throw new Error(`Tipo de reporte inválido. Debe ser uno de: ${this.reportTypes.join(", ")}`);
    }

    if (!organizationId && !userId) {
      throw new Error("organizationId o userId es requerido");
    }

    try {
      logger.info("Generando reporte", { type, organizationId, userId });

      // Calcular período
      const endDate = period?.endDate || new Date();
      const startDate = period?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días

      let report = null;

      switch (type) {
        case "executive":
          report = await this.generateExecutiveReport(organizationId, userId, startDate, endDate);
          break;
        case "technical":
          report = await this.generateTechnicalReport(organizationId, userId, startDate, endDate);
          break;
        case "threat_landscape":
          report = await this.generateThreatLandscapeReport(organizationId, startDate, endDate);
          break;
        default:
          throw new Error(`Tipo de reporte no implementado: ${type}`);
      }

      logger.info("Reporte generado exitosamente", { type, reportId: report.id });

      return report;
    } catch (error) {
      logger.error("Error generando reporte", {
        type,
        error: error.message,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Genera un reporte ejecutivo
   * @param {string} organizationId - ID de la organización
   * @param {string} userId - ID del usuario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<Object>} Reporte ejecutivo
   */
  async generateExecutiveReport(organizationId, userId, startDate, endDate) {
    // Obtener datos agregados
    const stats = await this.collectStatistics(organizationId, userId, startDate, endDate);

    let aiSummary = null;
    if (this.iaClient && this.iaClient.enabled) {
      try {
        const systemPrompt = `Eres un analista de ciberseguridad creando un reporte ejecutivo.
Crea un resumen ejecutivo claro, conciso y orientado a decisiones de negocio.
Enfócate en riesgos, impacto potencial y recomendaciones estratégicas.`;

        const userPrompt = `Genera un resumen ejecutivo para el siguiente período:

Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}

Estadísticas:
- Total de alertas: ${stats.alerts.total}
- Alertas críticas: ${stats.alerts.byType.CRITICAL || 0}
- Alertas de advertencia: ${stats.alerts.byType.WARNING || 0}
- Items CTI procesados: ${stats.cti.total}
- Amenazas críticas: ${stats.cti.bySeverity.CRITICAL || 0}

Top amenazas:
${stats.cti.topThreats.map((t, i) => `${i + 1}. ${t.title}`).join("\n")}

Responde con un resumen de máximo 3 párrafos.`;

        aiSummary = await this.iaClient.chat(systemPrompt, userPrompt, {
          maxTokens: 800,
        });
      } catch (error) {
        logger.warn("Error generando resumen ejecutivo con IA", { error: error.message });
      }
    }

    return {
      id: `exec_${Date.now()}`,
      type: "executive",
      organizationId,
      userId,
      period: { startDate, endDate },
      generatedAt: new Date(),
      summary: aiSummary || this.generateTextSummary(stats),
      statistics: stats,
      recommendations: this.generateExecutiveRecommendations(stats),
    };
  }

  /**
   * Genera un reporte técnico
   * @param {string} organizationId - ID de la organización
   * @param {string} userId - ID del usuario
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<Object>} Reporte técnico
   */
  async generateTechnicalReport(organizationId, userId, startDate, endDate) {
    // Obtener datos detallados
    const stats = await this.collectDetailedStatistics(organizationId, userId, startDate, endDate);

    return {
      id: `tech_${Date.now()}`,
      type: "technical",
      organizationId,
      userId,
      period: { startDate, endDate },
      generatedAt: new Date(),
      statistics: stats,
      cveDetails: stats.cti.cveDetails || [],
      mitreTactics: stats.cti.mitreTactics || [],
      assetVulnerabilities: stats.assets.vulnerable || [],
      alertsBreakdown: stats.alerts.breakdown || [],
    };
  }

  /**
   * Genera un reporte de landscape de amenazas
   * @param {string} organizationId - ID de la organización
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<Object>} Reporte de threat landscape
   */
  async generateThreatLandscapeReport(organizationId, startDate, endDate) {
    // Obtener todos los items CTI del período
    const ctiResult = await getCtiItems({
      limit: 500,
      orderBy: "publishedAt",
      orderDirection: "desc",
    });

    const ctiItems = ctiResult.items.filter(item => {
      const pubDate = item.publishedAt instanceof Date 
        ? item.publishedAt 
        : new Date(item.publishedAt);
      return pubDate >= startDate && pubDate <= endDate;
    });

    // Análisis de amenazas
    const threatAnalysis = this.analyzeThreats(ctiItems);

    let aiAnalysis = null;
    if (this.iaClient && this.iaClient.enabled) {
      try {
        const systemPrompt = `Eres un experto en threat intelligence.
Analiza el landscape de amenazas y proporciona insights estratégicos.
Identifica tendencias, sectores más afectados y recomendaciones defensivas.`;

        const userPrompt = `Analiza el siguiente landscape de amenazas:

Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
Total de amenazas: ${ctiItems.length}

Distribución por severidad:
${Object.entries(threatAnalysis.severity).map(([s, c]) => `- ${s}: ${c}`).join("\n")}

Top CVEs:
${threatAnalysis.topCves.slice(0, 10).map((cve, i) => `${i + 1}. ${cve}`).join("\n")}

Proporciona un análisis de máximo 500 palabras.`;

        aiAnalysis = await this.iaClient.chat(systemPrompt, userPrompt, {
          maxTokens: 1500,
        });
      } catch (error) {
        logger.warn("Error generando análisis de threat landscape con IA", {
          error: error.message,
        });
      }
    }

    return {
      id: `threat_${Date.now()}`,
      type: "threat_landscape",
      organizationId,
      period: { startDate, endDate },
      generatedAt: new Date(),
      threatAnalysis,
      aiAnalysis: aiAnalysis || null,
      trends: this.identifyTrends(ctiItems),
    };
  }

  /**
   * Recolecta estadísticas básicas
   */
  async collectStatistics(organizationId, userId, startDate, endDate) {
    // Obtener alertas del usuario
    const alertsResult = userId
      ? await getAlertsForUser(userId, { limit: 1000 })
      : { alerts: [] };

    const alerts = alertsResult.alerts.filter(alert => {
      const created = alert.createdAt instanceof Date 
        ? alert.createdAt 
        : new Date(alert.createdAt);
      return created >= startDate && created <= endDate;
    });

    // Obtener items CTI del período
    const ctiResult = await getCtiItems({
      limit: 500,
      orderBy: "publishedAt",
      orderDirection: "desc",
    });

    const ctiItems = ctiResult.items.filter(item => {
      const pubDate = item.publishedAt instanceof Date 
        ? item.publishedAt 
        : new Date(item.publishedAt);
      return pubDate >= startDate && pubDate <= endDate;
    });

    // Calcular estadísticas
    const alertsByType = {};
    for (const alert of alerts) {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    }

    const ctiBySeverity = {};
    for (const item of ctiItems) {
      ctiBySeverity[item.severity] = (ctiBySeverity[item.severity] || 0) + 1;
    }

    // Top amenazas (por severidad y fecha)
    const topThreats = ctiItems
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      })
      .slice(0, 10);

    return {
      alerts: {
        total: alerts.length,
        byType: alertsByType,
      },
      cti: {
        total: ctiItems.length,
        bySeverity: ctiBySeverity,
        topThreats: topThreats.map(item => ({
          id: item.id,
          title: item.title,
          severity: item.severity,
          cveIds: item.cveIds || [],
        })),
      },
    };
  }

  /**
   * Recolecta estadísticas detalladas
   */
  async collectDetailedStatistics(organizationId, userId, startDate, endDate) {
    const stats = await this.collectStatistics(organizationId, userId, startDate, endDate);

    // Obtener items CTI para análisis detallado
    const ctiResult = await getCtiItems({
      limit: 500,
      orderBy: "publishedAt",
      orderDirection: "desc",
    });

    const ctiItems = ctiResult.items.filter(item => {
      const pubDate = item.publishedAt instanceof Date 
        ? item.publishedAt 
        : new Date(item.publishedAt);
      return pubDate >= startDate && pubDate <= endDate;
    });

    // Extraer todos los CVEs
    const allCves = new Set();
    for (const item of ctiItems) {
      if (item.cveIds) {
        item.cveIds.forEach(cve => allCves.add(cve));
      }
    }

    // Extraer tácticas MITRE
    const mitreTactics = new Set();
    for (const item of ctiItems) {
      if (item.enrichmentData?.mappedTactics) {
        item.enrichmentData.mappedTactics.forEach(t => mitreTactics.add(t));
      }
    }

    return {
      ...stats,
      cti: {
        ...stats.cti,
        cveDetails: Array.from(allCves),
        mitreTactics: Array.from(mitreTactics),
      },
    };
  }

  /**
   * Analiza amenazas
   */
  analyzeThreats(ctiItems) {
    const severity = {};
    const cves = new Map();

    for (const item of ctiItems) {
      severity[item.severity] = (severity[item.severity] || 0) + 1;

      if (item.cveIds) {
        for (const cve of item.cveIds) {
          cves.set(cve, (cves.get(cve) || 0) + 1);
        }
      }
    }

    const topCves = Array.from(cves.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cve]) => cve)
      .slice(0, 20);

    return {
      severity,
      topCves,
      totalItems: ctiItems.length,
    };
  }

  /**
   * Identifica tendencias
   */
  identifyTrends(ctiItems) {
    // Agrupar por semana
    const weekly = {};
    for (const item of ctiItems) {
      const pubDate = item.publishedAt instanceof Date 
        ? item.publishedAt 
        : new Date(item.publishedAt);
      const week = `${pubDate.getFullYear()}-W${Math.ceil(pubDate.getDate() / 7)}`;
      weekly[week] = (weekly[week] || 0) + 1;
    }

    return {
      weeklyDistribution: weekly,
      trendDirection: this.calculateTrendDirection(weekly),
    };
  }

  /**
   * Calcula dirección de tendencia
   */
  calculateTrendDirection(weekly) {
    const weeks = Object.keys(weekly).sort();
    if (weeks.length < 2) {
      return "stable";
    }

    const recent = weekly[weeks[weeks.length - 1]] || 0;
    const previous = weekly[weeks[weeks.length - 2]] || 0;

    if (recent > previous * 1.2) {
      return "increasing";
    }
    if (recent < previous * 0.8) {
      return "decreasing";
    }
    return "stable";
  }

  /**
   * Genera resumen de texto (sin IA)
   */
  generateTextSummary(stats) {
    let summary = `Resumen del período:\n\n`;
    summary += `Total de alertas: ${stats.alerts.total}\n`;
    summary += `Alertas críticas: ${stats.alerts.byType.CRITICAL || 0}\n`;
    summary += `Items CTI procesados: ${stats.cti.total}\n`;
    summary += `Amenazas críticas: ${stats.cti.bySeverity.CRITICAL || 0}\n\n`;
    summary += `Top amenazas:\n${stats.cti.topThreats.map((t, i) => `${i + 1}. ${t.title}`).join("\n")}`;
    return summary;
  }

  /**
   * Genera recomendaciones ejecutivas
   */
  generateExecutiveRecommendations(stats) {
    const recommendations = [];

    if ((stats.alerts.byType.CRITICAL || 0) > 10) {
      recommendations.push({
        priority: "high",
        action: "Revisar y priorizar inmediatamente las alertas críticas",
        reason: "Alto número de alertas críticas detectadas",
      });
    }

    if ((stats.cti.bySeverity.CRITICAL || 0) > 5) {
      recommendations.push({
        priority: "high",
        action: "Implementar parches de seguridad urgentes",
        reason: "Múltiples amenazas críticas en el landscape",
      });
    }

    if (stats.cti.total > 100) {
      recommendations.push({
        priority: "medium",
        action: "Revisar procesos de gestión de amenazas",
        reason: "Alto volumen de amenazas detectadas",
      });
    }

    return recommendations;
  }

  /**
   * Valida la entrada
   */
  validateInput(input) {
    return super.validateInput(input) &&
           input.type &&
           this.reportTypes.includes(input.type) &&
           (input.organizationId || input.userId);
  }
}

export default ReporterAgent;
export { ReporterAgent };

