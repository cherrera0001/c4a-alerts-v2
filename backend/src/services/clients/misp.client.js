import axios from "axios";
import { logger } from "../../utils/logger.js";
import { ctiConfig } from "../../config/env.js";

/**
 * Cliente para MISP (Malware Information Sharing Platform)
 * Implementa integración con API de MISP para ingestión automática de eventos
 */

class MispClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || ctiConfig.misp.baseURL || "https://misp.example.com";
    this.apiKey = config.apiKey || ctiConfig.misp.apiKey;
    this.timeout = config.timeout || 30000; // 30 segundos
    this.verifySSL = config.verifySSL !== false;
    this.enabled = ctiConfig.misp.enabled || !!(this.apiKey && this.baseURL);
    
    if (!this.enabled) {
      logger.warn("MISP no configurado - Cliente MISP no funcional", {
        baseURL: this.baseURL,
        hasApiKey: !!this.apiKey,
      });
    }

    this.client = axios.create({
      baseURL: `${this.baseURL}/attributes`,
      headers: {
        Authorization: this.apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: this.timeout,
      validateStatus: (status) => status < 500, // No lanzar error en 4xx
    });
  }

  /**
   * Obtiene eventos recientes de MISP
   * @param {Object} options - Opciones de búsqueda
   * @param {number} options.limit - Límite de eventos a obtener
   * @param {Date} options.since - Fecha desde la cual obtener eventos
   * @param {string[]} options.tags - Tags a filtrar
   * @returns {Promise<Array>} Lista de eventos normalizados
   */
  async fetchEvents(options = {}) {
    if (!this.apiKey) {
      throw new Error("MISP API key no configurada");
    }

    try {
      const params = {
        limit: options.limit || 100,
        page: options.page || 1,
      };

      if (options.since) {
        params.timestamp = Math.floor(options.since.getTime() / 1000);
      }

      if (options.tags && options.tags.length > 0) {
        params.tags = options.tags.join("||");
      }

      logger.info("Obteniendo eventos de MISP", { params });

      const response = await this.client.get("/rest/search", {
        params: {
          ...params,
          published: 1, // Solo eventos publicados
          distribution: [0, 1, 2, 3], // Todos los niveles de distribución
        },
      });

      if (response.status !== 200 || !response.data.response) {
        logger.warn("Respuesta inesperada de MISP", { 
          status: response.status,
          data: response.data 
        });
        return [];
      }

      const events = Array.isArray(response.data.response.Attribute) 
        ? response.data.response.Attribute 
        : [];

      return events.map(event => this.normalizeEvent(event));
    } catch (error) {
      logger.error("Error obteniendo eventos de MISP", { 
        error: error.message,
        baseURL: this.baseURL 
      });
      throw new Error(`Error en MISP: ${error.message}`);
    }
  }

  /**
   * Normaliza un evento de MISP al formato interno
   * @param {Object} mispEvent - Evento de MISP
   * @returns {Object} Evento normalizado
   */
  normalizeEvent(mispEvent) {
    // Extraer CVEs del evento
    const cveIds = [];
    const cwes = [];
    const actors = [];
    const sectors = [];
    const regions = [];
    const references = [];

    // Buscar atributos relevantes
    if (mispEvent.Event && mispEvent.Event.Attribute) {
      const attributes = Array.isArray(mispEvent.Event.Attribute)
        ? mispEvent.Event.Attribute
        : [mispEvent.Event.Attribute];

      for (const attr of attributes) {
        if (!attr) continue;

        switch (attr.type) {
          case "vulnerability":
          case "cve":
            if (attr.value) cveIds.push(attr.value.toUpperCase());
            break;
          case "weakness":
            if (attr.value) cwes.push(attr.value.toUpperCase());
            break;
          case "threat-actor":
            if (attr.value) actors.push(attr.value);
            break;
          case "target-sector":
            if (attr.value) sectors.push(attr.value);
            break;
          case "target-location":
            if (attr.value) regions.push(attr.value);
            break;
          case "link":
          case "external-link":
            if (attr.value) references.push(attr.value);
            break;
        }
      }
    }

    // Extraer información de tags
    if (mispEvent.Event && mispEvent.Event.Tag) {
      const tags = Array.isArray(mispEvent.Event.Tag)
        ? mispEvent.Event.Tag
        : [mispEvent.Event.Tag];

      for (const tag of tags) {
        if (!tag || !tag.name) continue;

        const tagName = tag.name.toLowerCase();
        if (tagName.startsWith("cve:")) {
          cveIds.push(tagName.replace("cve:", "").toUpperCase());
        } else if (tagName.startsWith("actor:")) {
          actors.push(tagName.replace("actor:", ""));
        } else if (tagName.includes("sector:")) {
          sectors.push(tagName.split(":")[1]);
        } else if (tagName.includes("region:")) {
          regions.push(tagName.split(":")[1]);
        }
      }
    }

    // Determinar severidad basada en threat level
    let severity = "MEDIUM";
    if (mispEvent.Event) {
      const threatLevel = mispEvent.Event.threat_level_id || 3;
      if (threatLevel === 1) severity = "CRITICAL";
      else if (threatLevel === 2) severity = "HIGH";
      else if (threatLevel === 3) severity = "MEDIUM";
      else severity = "LOW";
    }

    return {
      source: "MISP",
      title: mispEvent.Event?.info || mispEvent.info || "Evento MISP sin título",
      summary: mispEvent.Event?.info || mispEvent.info || "",
      cveIds: [...new Set(cveIds)], // Eliminar duplicados
      cwes: [...new Set(cwes)],
      actors: [...new Set(actors)],
      sector: [...new Set(sectors)],
      regions: [...new Set(regions)],
      references: [...new Set(references)],
      severity: severity,
      publishedAt: mispEvent.Event?.date 
        ? new Date(mispEvent.Event.date) 
        : new Date(),
      metadata: {
        misp_event_id: mispEvent.Event?.id || mispEvent.id,
        misp_uuid: mispEvent.Event?.uuid || mispEvent.uuid,
        distribution: mispEvent.Event?.distribution || 0,
        threat_level_id: mispEvent.Event?.threat_level_id || 3,
        org: mispEvent.Event?.orgc?.name || "Unknown",
      },
    };
  }

  /**
   * Verifica la conectividad con MISP
   * @returns {Promise<boolean>} true si está conectado
   */
  async testConnection() {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await this.client.get("/rest/users/view/me");
      return response.status === 200;
    } catch (error) {
      logger.error("Error verificando conexión con MISP", { error: error.message });
      return false;
    }
  }
}

export default MispClient;
export { MispClient };

