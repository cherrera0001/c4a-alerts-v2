import axios from "axios";
import { logger } from "../../utils/logger.js";
import { ctiConfig } from "../../config/env.js";

/**
 * Cliente para NVD (National Vulnerability Database)
 * Implementa integración con NVD API v2.0 para obtener CVEs y sus datos
 */

class NvdClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || ctiConfig.nvd.baseURL;
    this.apiKey = config.apiKey || ctiConfig.nvd.apiKey; // Opcional, pero recomendado para rate limits
    this.timeout = config.timeout || 30000; // 30 segundos
    this.enabled = ctiConfig.nvd.enabled;
    
    // Rate limits sin API key: 5 requests / 30 segundos
    // Con API key: 50 requests / 30 segundos
    this.rateLimitDelay = this.apiKey ? 600 : 6000; // ms entre requests
    this.lastRequest = 0;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        ...(this.apiKey && { apiKey: this.apiKey }),
        Accept: "application/json",
      },
      timeout: this.timeout,
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * Espera si es necesario para cumplir rate limits
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }

  /**
   * Obtiene CVEs recientes desde una fecha específica
   * @param {Object} options - Opciones de búsqueda
   * @param {Date} options.pubStartDate - Fecha de inicio de publicación
   * @param {Date} options.pubEndDate - Fecha de fin de publicación
   * @param {number} options.resultsPerPage - Resultados por página (max 2000)
   * @returns {Promise<Array>} Lista de CVEs normalizados
   */
  async fetchRecentCves(options = {}) {
    try {
      await this.waitForRateLimit();

      const pubStartDate = options.pubStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días por defecto
      const pubEndDate = options.pubEndDate || new Date();
      
      const params = {
        pubStartDate: pubStartDate.toISOString(),
        pubEndDate: pubEndDate.toISOString(),
        resultsPerPage: Math.min(options.resultsPerPage || 20, 2000),
        startIndex: options.startIndex || 0,
      };

      logger.info("Obteniendo CVEs de NVD", { 
        pubStartDate: params.pubStartDate,
        pubEndDate: params.pubEndDate 
      });

      const response = await this.client.get("", { params });

      if (response.status !== 200 || !response.data || !response.data.vulnerabilities) {
        logger.warn("Respuesta inesperada de NVD", { 
          status: response.status,
          data: response.data 
        });
        return [];
      }

      const cves = response.data.vulnerabilities || [];
      return cves.map(cve => this.normalizeCve(cve));
    } catch (error) {
      logger.error("Error obteniendo CVEs de NVD", { 
        error: error.message 
      });
      throw new Error(`Error en NVD: ${error.message}`);
    }
  }

  /**
   * Obtiene un CVE específico por ID
   * @param {string} cveId - ID del CVE (ej: CVE-2024-1234)
   * @returns {Promise<Object|null>} CVE normalizado o null si no existe
   */
  async fetchCveById(cveId) {
    if (!cveId || !cveId.match(/^CVE-\d{4}-\d{4,}$/)) {
      throw new Error(`CVE ID inválido: ${cveId}`);
    }

    try {
      await this.waitForRateLimit();

      const response = await this.client.get(`?cveId=${cveId}`);

      if (response.status !== 200 || !response.data || !response.data.vulnerabilities) {
        return null;
      }

      const cves = response.data.vulnerabilities;
      if (cves.length === 0) {
        return null;
      }

      return this.normalizeCve(cves[0]);
    } catch (error) {
      logger.error("Error obteniendo CVE de NVD", { 
        cveId,
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Normaliza un CVE de NVD al formato interno
   * @param {Object} nvdCve - CVE de NVD API v2.0
   * @returns {Object} CVE normalizado
   */
  normalizeCve(nvdCve) {
    const cve = nvdCve.cve || {};
    const config = cve.configurations || [];
    
    // Extraer CVEs
    const cveId = cve.id || "";
    
    // Extraer CWEs de métricas
    const cwes = new Set();
    if (cve.weaknesses) {
      for (const weakness of cve.weaknesses) {
        if (weakness.description) {
          for (const desc of weakness.description) {
            if (desc.value) {
              cwes.add(desc.value);
            }
          }
        }
      }
    }

    // Extraer referencias
    const references = [];
    if (cve.references) {
      for (const ref of cve.references) {
        if (ref.url) {
          references.push(ref.url);
        }
      }
    }

    // Determinar severidad (CVSS v3.1 > v3.0 > v2.0)
    let severity = "MEDIUM";
    let cvssScore = null;

    if (cve.metrics && cve.metrics.cvssMetricV31 && cve.metrics.cvssMetricV31.length > 0) {
      const cvss = cve.metrics.cvssMetricV31[0].cvssData;
      cvssScore = cvss.baseScore;
      if (cvssScore >= 9.0) severity = "CRITICAL";
      else if (cvssScore >= 7.0) severity = "HIGH";
      else if (cvssScore >= 4.0) severity = "MEDIUM";
      else severity = "LOW";
    } else if (cve.metrics && cve.metrics.cvssMetricV30 && cve.metrics.cvssMetricV30.length > 0) {
      const cvss = cve.metrics.cvssMetricV30[0].cvssData;
      cvssScore = cvss.baseScore;
      if (cvssScore >= 9.0) severity = "CRITICAL";
      else if (cvssScore >= 7.0) severity = "HIGH";
      else if (cvssScore >= 4.0) severity = "MEDIUM";
      else severity = "LOW";
    } else if (cve.metrics && cve.metrics.cvssMetricV2 && cve.metrics.cvssMetricV2.length > 0) {
      const cvss = cve.metrics.cvssMetricV2[0].cvssData;
      cvssScore = cvss.baseScore;
      if (cvssScore >= 7.0) severity = "HIGH";
      else if (cvssScore >= 4.0) severity = "MEDIUM";
      else severity = "LOW";
    }

    // Extraer descripción
    let description = "";
    if (cve.descriptions) {
      for (const desc of cve.descriptions) {
        if (desc.lang === "en" && desc.value) {
          description = desc.value;
          break;
        }
      }
    }

    // Extraer fecha de publicación
    const publishedAt = cve.published 
      ? new Date(cve.published) 
      : new Date();

    return {
      source: "NVD",
      title: `${cveId}: ${description.substring(0, 100)}${description.length > 100 ? "..." : ""}`,
      summary: description,
      cveIds: [cveId],
      cwes: Array.from(cwes),
      actors: [],
      sector: [],
      regions: [],
      references: references,
      severity: severity,
      publishedAt: publishedAt,
      metadata: {
        cvss_score: cvssScore,
        cvss_version: cve.metrics?.cvssMetricV31 ? "3.1" : 
                     cve.metrics?.cvssMetricV30 ? "3.0" : 
                     cve.metrics?.cvssMetricV2 ? "2.0" : null,
        nvd_id: cveId,
        last_modified: cve.lastModified ? new Date(cve.lastModified).toISOString() : null,
        configurations: config.length,
      },
    };
  }

  /**
   * Verifica la conectividad con NVD
   * @returns {Promise<boolean>} true si está conectado
   */
  async testConnection() {
    try {
      await this.waitForRateLimit();
      // Intentar obtener el CVE más reciente como prueba
      const recentCves = await this.fetchRecentCves({ 
        resultsPerPage: 1,
        pubStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
      });
      return recentCves !== null;
    } catch (error) {
      logger.error("Error verificando conexión con NVD", { error: error.message });
      return false;
    }
  }
}

export default NvdClient;
export { NvdClient };

