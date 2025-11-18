import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "../utils/logger.js";
import { ingestFeedItem, enrichItem } from "./cti.service.js";
import MispClient from "./clients/misp.client.js";
import NvdClient from "./clients/nvd.client.js";
import RssClient from "./clients/rss.client.js";
import { ctiConfig } from "../config/env.js";

/**
 * Pipeline unificado de ingestión CTI
 * Orquesta la obtención de datos de múltiples fuentes (MISP, NVD, RSS)
 * Normaliza, deduplica y guarda en la base de datos
 */

class CtiIngestor {
  constructor(config = {}) {
    // Usar configuración desde env.js o parámetros
    const enableMisp = config.enableMisp !== undefined ? config.enableMisp : ctiConfig.misp.enabled;
    const enableNvd = config.enableNvd !== undefined ? config.enableNvd : ctiConfig.nvd.enabled;
    const enableRss = config.enableRss !== undefined ? config.enableRss : ctiConfig.rss.enabled;
    
    this.mispClient = config.mispClient || (enableMisp ? new MispClient() : null);
    this.nvdClient = config.nvdClient || (enableNvd ? new NvdClient() : null);
    this.rssClient = config.rssClient || (enableRss ? new RssClient() : null);
    
    // URLs de feeds RSS desde configuración o por defecto
    const defaultFeeds = [
      "https://www.cisa.gov/news-events/cybersecurity-advisories/rss.xml",
      "https://msrc.microsoft.com/update-guide/rss",
      "https://cloud.google.com/feeds/securitybulletins.rss",
    ];
    this.rssFeeds = config.rssFeeds || 
                    (ctiConfig.rss.feeds.length > 0 ? ctiConfig.rss.feeds : defaultFeeds);
    
    // Cache para deduplicación (en memoria, simple)
    this.processedHashes = new Set();
    this.cacheMaxSize = 10000;
  }

  /**
   * Genera un hash para deduplicación
   * @param {Object} item - Item CTI
   * @returns {string} Hash del item
   */
  generateHash(item) {
    // Hash basado en source, título y CVEs
    const key = `${item.source}|${item.title}|${item.cveIds.join(",")}`;
    return Buffer.from(key).toString("base64").substring(0, 32);
  }

  /**
   * Verifica si un item ya fue procesado (deduplicación)
   * @param {Object} item - Item CTI
   * @returns {boolean} true si ya fue procesado
   */
  isDuplicate(item) {
    const hash = this.generateHash(item);
    
    if (this.processedHashes.has(hash)) {
      return true;
    }
    
    // Añadir al cache
    if (this.processedHashes.size >= this.cacheMaxSize) {
      // Limpiar cache si está lleno (FIFO simple)
      const first = this.processedHashes.values().next().value;
      this.processedHashes.delete(first);
    }
    
    this.processedHashes.add(hash);
    return false;
  }

  /**
   * Ingestiona feeds de MISP
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Array>} Items ingeridos
   */
  async ingestMispFeeds(options = {}) {
    if (!this.mispClient) {
      logger.warn("Cliente MISP no disponible");
      return [];
    }

    try {
      logger.info("Iniciando ingestión de feeds MISP", options);

      const events = await this.mispClient.fetchEvents({
        limit: options.limit || 100,
        since: options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 días
        tags: options.tags,
      });

      const ingested = [];
      
      for (const event of events) {
        // Deduplicar
        if (this.isDuplicate(event)) {
          logger.debug("Item MISP duplicado, saltando", { title: event.title });
          continue;
        }

        try {
          const item = await ingestFeedItem(event);
          
          // Enriquecer automáticamente
          if (options.autoEnrich !== false) {
            await enrichItem(item);
          }
          
          ingested.push(item);
          logger.debug("Item MISP ingerido", { id: item.id, title: item.title });
        } catch (error) {
          logger.error("Error ingiriendo item MISP", { 
            error: error.message,
            title: event.title 
          });
        }
      }

      logger.info("Ingestión MISP completada", { 
        eventos: events.length,
        ingeridos: ingested.length 
      });

      return ingested;
    } catch (error) {
      logger.error("Error en ingestión MISP", { error: error.message });
      throw error;
    }
  }

  /**
   * Ingestiona feeds de NVD
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Array>} Items ingeridos
   */
  async ingestNvdFeeds(options = {}) {
    if (!this.nvdClient) {
      logger.warn("Cliente NVD no disponible");
      return [];
    }

    try {
      logger.info("Iniciando ingestión de feeds NVD", options);

      const pubStartDate = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pubEndDate = options.pubEndDate || new Date();

      const cves = await this.nvdClient.fetchRecentCves({
        pubStartDate,
        pubEndDate,
        resultsPerPage: options.limit || 20,
      });

      const ingested = [];
      
      for (const cve of cves) {
        // Deduplicar
        if (this.isDuplicate(cve)) {
          logger.debug("CVE duplicado, saltando", { cveId: cve.cveIds[0] });
          continue;
        }

        try {
          const item = await ingestFeedItem(cve);
          
          // Enriquecer automáticamente
          if (options.autoEnrich !== false) {
            await enrichItem(item);
          }
          
          ingested.push(item);
          logger.debug("CVE ingerido", { id: item.id, cveId: cve.cveIds[0] });
        } catch (error) {
          logger.error("Error ingiriendo CVE", { 
            error: error.message,
            cveId: cve.cveIds[0] 
          });
        }
      }

      logger.info("Ingestión NVD completada", { 
        cves: cves.length,
        ingeridos: ingested.length 
      });

      return ingested;
    } catch (error) {
      logger.error("Error en ingestión NVD", { error: error.message });
      throw error;
    }
  }

  /**
   * Ingestiona feeds RSS/Atom
   * @param {string[]} feedUrls - URLs de feeds (opcional, usa defaults si no se proporciona)
   * @param {Object} options - Opciones
   * @returns {Promise<Array>} Items ingeridos
   */
  async ingestRssFeeds(feedUrls = null, options = {}) {
    if (!this.rssClient) {
      logger.warn("Cliente RSS no disponible");
      return [];
    }

    const feeds = feedUrls || this.rssFeeds;
    const ingested = [];

    try {
      logger.info("Iniciando ingestión de feeds RSS", { feeds: feeds.length });

      for (const feedUrl of feeds) {
        try {
          const items = await this.rssClient.fetchFeed(feedUrl);
          
          for (const item of items) {
            // Deduplicar
            if (this.isDuplicate(item)) {
              logger.debug("Item RSS duplicado, saltando", { title: item.title });
              continue;
            }

            try {
              const ingestedItem = await ingestFeedItem(item);
              
              // Enriquecer automáticamente
              if (options.autoEnrich !== false) {
                await enrichItem(ingestedItem);
              }
              
              ingested.push(ingestedItem);
              logger.debug("Item RSS ingerido", { id: ingestedItem.id, title: item.title });
            } catch (error) {
              logger.error("Error ingiriendo item RSS", { 
                error: error.message,
                title: item.title 
              });
            }
          }

          logger.debug("Feed RSS procesado", { feedUrl, items: items.length });
        } catch (error) {
          logger.error("Error procesando feed RSS", { 
            feedUrl,
            error: error.message 
          });
          // Continuar con otros feeds aunque uno falle
        }
      }

      logger.info("Ingestión RSS completada", { 
        feeds: feeds.length,
        ingeridos: ingested.length 
      });

      return ingested;
    } catch (error) {
      logger.error("Error en ingestión RSS", { error: error.message });
      throw error;
    }
  }

  /**
   * Ingestiona todas las fuentes CTI disponibles
   * @param {Object} options - Opciones globales
   * @returns {Promise<Object>} Resumen de ingestión
   */
  async ingestAllSources(options = {}) {
    logger.info("Iniciando ingestión completa de fuentes CTI");

    const results = {
      misp: { items: [], errors: [] },
      nvd: { items: [], errors: [] },
      rss: { items: [], errors: [] },
      total: { items: 0, errors: 0 },
      startTime: new Date(),
    };

    // Ingestar MISP
    if (this.mispClient && options.enableMisp !== false) {
      try {
        results.misp.items = await this.ingestMispFeeds(options.misp || {});
      } catch (error) {
        results.misp.errors.push(error.message);
        results.total.errors++;
        logger.error("Error en ingestión MISP", { error: error.message });
      }
    }

    // Ingestar NVD
    if (this.nvdClient && options.enableNvd !== false) {
      try {
        results.nvd.items = await this.ingestNvdFeeds(options.nvd || {});
      } catch (error) {
        results.nvd.errors.push(error.message);
        results.total.errors++;
        logger.error("Error en ingestión NVD", { error: error.message });
      }
    }

    // Ingestar RSS
    if (this.rssClient && options.enableRss !== false) {
      try {
        results.rss.items = await this.ingestRssFeeds(options.rssFeeds, options.rss || {});
      } catch (error) {
        results.rss.errors.push(error.message);
        results.total.errors++;
        logger.error("Error en ingestión RSS", { error: error.message });
      }
    }

    results.total.items = 
      results.misp.items.length + 
      results.nvd.items.length + 
      results.rss.items.length;
    
    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;

    logger.info("Ingestión completa finalizada", {
      total: results.total.items,
      errors: results.total.errors,
      duration: `${results.duration}ms`,
      breakdown: {
        misp: results.misp.items.length,
        nvd: results.nvd.items.length,
        rss: results.rss.items.length,
      },
    });

    return results;
  }

  /**
   * Verifica el estado de todas las fuentes
   * @returns {Promise<Object>} Estado de conexión de cada fuente
   */
  async checkSourcesStatus() {
    const status = {
      misp: false,
      nvd: false,
      rss: false,
    };

    if (this.mispClient) {
      try {
        status.misp = await this.mispClient.testConnection();
      } catch (error) {
        logger.error("Error verificando MISP", { error: error.message });
      }
    }

    if (this.nvdClient) {
      try {
        status.nvd = await this.nvdClient.testConnection();
      } catch (error) {
        logger.error("Error verificando NVD", { error: error.message });
      }
    }

    if (this.rssClient && this.rssFeeds.length > 0) {
      try {
        status.rss = await this.rssClient.testConnection(this.rssFeeds[0]);
      } catch (error) {
        logger.error("Error verificando RSS", { error: error.message });
      }
    }

    return status;
  }
}

export default CtiIngestor;
export { CtiIngestor };

