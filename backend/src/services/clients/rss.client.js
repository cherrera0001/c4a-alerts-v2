import axios from "axios";
import { parseString } from "xml2js";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";

const parseXML = promisify(parseString);

/**
 * Cliente RSS/Atom para ingestión de feeds de seguridad
 * Soporta feeds RSS 2.0, RSS 1.0 y Atom
 */

class RssClient {
  constructor(config = {}) {
    this.timeout = config.timeout || 30000; // 30 segundos
    this.maxItems = config.maxItems || 50; // Máximo de items por feed
    
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        "User-Agent": "C4A-Alerts/1.0 (CTI RSS Client)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * Obtiene y parsea un feed RSS/Atom
   * @param {string} feedUrl - URL del feed
   * @returns {Promise<Array>} Lista de items normalizados
   */
  async fetchFeed(feedUrl) {
    if (!feedUrl || typeof feedUrl !== "string") {
      throw new Error("URL del feed es requerida");
    }

    try {
      logger.info("Obteniendo feed RSS/Atom", { feedUrl });

      const response = await this.client.get(feedUrl, {
        responseType: "text",
        transformResponse: [(data) => data],
      });

      if (response.status !== 200) {
        logger.warn("Respuesta no exitosa del feed", { 
          status: response.status,
          feedUrl 
        });
        return [];
      }

      const xml = response.data;
      const parsed = await parseXML(xml, {
        trim: true,
        explicitArray: false,
        mergeAttrs: true,
        explicitRoot: false,
      });

      // Detectar tipo de feed y normalizar
      if (parsed.feed) {
        // Atom feed
        return this.normalizeAtomFeed(parsed, feedUrl);
      } else if (parsed.rss || parsed.rdf) {
        // RSS 2.0 o RSS 1.0
        return this.normalizeRssFeed(parsed, feedUrl);
      } else {
        logger.warn("Formato de feed desconocido", { feedUrl });
        return [];
      }
    } catch (error) {
      logger.error("Error obteniendo feed RSS/Atom", { 
        feedUrl,
        error: error.message 
      });
      throw new Error(`Error en feed RSS: ${error.message}`);
    }
  }

  /**
   * Normaliza un feed RSS 2.0/1.0
   * @param {Object} parsed - Feed parseado
   * @param {string} feedUrl - URL del feed
   * @returns {Array} Items normalizados
   */
  normalizeRssFeed(parsed, feedUrl) {
    const items = [];
    
    // RSS 2.0: parsed.rss.channel.item
    // RSS 1.0: parsed.rdf.item
    const feed = parsed.rss || parsed.rdf || {};
    const channel = feed.channel || feed;
    const rawItems = channel.item || [];
    
    const itemArray = Array.isArray(rawItems) ? rawItems : [rawItems];
    
    for (const item of itemArray.slice(0, this.maxItems)) {
      if (!item) continue;

      const normalized = this.normalizeRssItem(item, feedUrl, channel);
      if (normalized) {
        items.push(normalized);
      }
    }

    return items;
  }

  /**
   * Normaliza un feed Atom
   * @param {Object} parsed - Feed parseado
   * @param {string} feedUrl - URL del feed
   * @returns {Array} Items normalizados
   */
  normalizeAtomFeed(parsed, feedUrl) {
    const items = [];
    
    const rawEntries = parsed.entry || [];
    const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
    
    for (const entry of entries.slice(0, this.maxItems)) {
      if (!entry) continue;

      const normalized = this.normalizeAtomEntry(entry, feedUrl, parsed);
      if (normalized) {
        items.push(normalized);
      }
    }

    return items;
  }

  /**
   * Normaliza un item RSS al formato interno
   * @param {Object} item - Item RSS
   * @param {string} feedUrl - URL del feed
   * @param {Object} channel - Información del canal
   * @returns {Object} Item normalizado
   */
  normalizeRssItem(item, feedUrl, channel) {
    const title = item.title || item["dc:title"] || "Sin título";
    const description = item.description || item["content:encoded"] || item["dc:description"] || "";
    const link = item.link || item.guid || item["dc:identifier"] || feedUrl;
    const pubDate = item.pubDate || item["dc:date"] || item["dcterms:modified"] || new Date().toISOString();

    // Extraer CVEs del título y descripción
    const cveIds = this.extractCves(title + " " + description);
    
    // Extraer categorías como tags
    const categories = [];
    if (item.category) {
      const cats = Array.isArray(item.category) ? item.category : [item.category];
      categories.push(...cats.map(cat => typeof cat === "string" ? cat : cat._ || cat.$.term || cat));
    }

    // Determinar severidad basada en categorías y contenido
    const severity = this.determineSeverity(title, description, categories);

    return {
      source: this.getSourceFromUrl(feedUrl),
      title: this.sanitizeTitle(title),
      summary: this.sanitizeDescription(description),
      cveIds: cveIds,
      cwes: [],
      actors: [],
      sector: [],
      regions: [],
      references: [link],
      severity: severity,
      publishedAt: this.parseDate(pubDate),
      metadata: {
        feed_url: feedUrl,
        feed_title: channel.title || "",
        categories: categories,
        author: item.author || item["dc:creator"] || "",
        guid: item.guid?._ || item.guid || null,
      },
    };
  }

  /**
   * Normaliza una entrada Atom al formato interno
   * @param {Object} entry - Entrada Atom
   * @param {string} feedUrl - URL del feed
   * @param {Object} feed - Información del feed
   * @returns {Object} Item normalizado
   */
  normalizeAtomEntry(entry, feedUrl, feed) {
    const title = entry.title?._ || entry.title || entry.title?.$?.text || "Sin título";
    const summary = entry.summary?._ || entry.summary || entry.content?._ || entry.content || "";
    const link = entry.link?.[0]?.$.href || entry.link?.$.href || entry.id || feedUrl;
    const published = entry.published || entry.updated || new Date().toISOString();

    // Extraer CVEs
    const cveIds = this.extractCves(title + " " + summary);
    
    // Extraer categorías
    const categories = [];
    if (entry.category) {
      const cats = Array.isArray(entry.category) ? entry.category : [entry.category];
      categories.push(...cats.map(cat => cat.$.term || cat));
    }

    const severity = this.determineSeverity(title, summary, categories);

    return {
      source: this.getSourceFromUrl(feedUrl),
      title: this.sanitizeTitle(title),
      summary: this.sanitizeDescription(summary),
      cveIds: cveIds,
      cwes: [],
      actors: [],
      sector: [],
      regions: [],
      references: [link],
      severity: severity,
      publishedAt: this.parseDate(published),
      metadata: {
        feed_url: feedUrl,
        feed_title: feed.title?._ || feed.title || "",
        categories: categories,
        author: entry.author?.name || entry.author || "",
        id: entry.id || null,
      },
    };
  }

  /**
   * Extrae CVEs de un texto
   * @param {string} text - Texto donde buscar CVEs
   * @returns {string[]} Lista de CVE IDs encontrados
   */
  extractCves(text) {
    if (!text) return [];
    
    const cveRegex = /CVE-\d{4}-\d{4,}/gi;
    const matches = text.match(cveRegex) || [];
    return [...new Set(matches.map(cve => cve.toUpperCase()))];
  }

  /**
   * Determina severidad basada en contenido
   * @param {string} title - Título
   * @param {string} description - Descripción
   * @param {string[]} categories - Categorías
   * @returns {string} Severidad (CRITICAL, HIGH, MEDIUM, LOW)
   */
  determineSeverity(title, description, categories) {
    const text = (title + " " + description + " " + categories.join(" ")).toLowerCase();
    
    // Palabras clave para severidad crítica
    if (text.match(/\b(critical|zero[-\s]?day|exploit|active|rce|remote[-\s]?code[-\s]?execution)\b/)) {
      return "CRITICAL";
    }
    
    // Palabras clave para severidad alta
    if (text.match(/\b(high|vulnerability|patch|update|security[-\s]?update|privilege[-\s]?escalation)\b/)) {
      return "HIGH";
    }
    
    // Palabras clave para severidad baja
    if (text.match(/\b(low|informational|info|advisory)\b/)) {
      return "LOW";
    }
    
    return "MEDIUM";
  }

  /**
   * Obtiene el nombre de la fuente desde la URL
   * @param {string} feedUrl - URL del feed
   * @returns {string} Nombre de la fuente
   */
  getSourceFromUrl(feedUrl) {
    try {
      const url = new URL(feedUrl);
      const hostname = url.hostname.toLowerCase();
      
      if (hostname.includes("cisa.gov")) return "CISA";
      if (hostname.includes("microsoft.com")) return "Microsoft Security";
      if (hostname.includes("google.com")) return "Google TAG";
      if (hostname.includes("redcanary.com")) return "Red Canary";
      if (hostname.includes("mandiant.com")) return "Mandiant";
      if (hostname.includes("github.com")) return "GitHub Security";
      
      // Extraer dominio principal
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
      }
      
      return "RSS Feed";
    } catch {
      return "RSS Feed";
    }
  }

  /**
   * Sanitiza un título
   * @param {string} title - Título a sanitizar
   * @returns {string} Título sanitizado
   */
  sanitizeTitle(title) {
    if (!title) return "";
    
    // Remover HTML tags básicos
    let cleaned = title.replace(/<[^>]+>/g, "");
    
    // Limitar longitud
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 497) + "...";
    }
    
    return cleaned.trim();
  }

  /**
   * Sanitiza una descripción
   * @param {string} description - Descripción a sanitizar
   * @returns {string} Descripción sanitizada
   */
  sanitizeDescription(description) {
    if (!description) return "";
    
    // Remover HTML tags básicos
    let cleaned = description.replace(/<[^>]+>/g, "");
    
    // Limitar longitud
    if (cleaned.length > 10000) {
      cleaned = cleaned.substring(0, 9997) + "...";
    }
    
    return cleaned.trim();
  }

  /**
   * Parsea una fecha
   * @param {string|Date} date - Fecha a parsear
   * @returns {Date} Fecha parseada
   */
  parseDate(date) {
    if (date instanceof Date) {
      return date;
    }
    
    if (!date) {
      return new Date();
    }
    
    try {
      return new Date(date);
    } catch {
      return new Date();
    }
  }

  /**
   * Verifica la conectividad con un feed
   * @param {string} feedUrl - URL del feed
   * @returns {Promise<boolean>} true si está accesible
   */
  async testConnection(feedUrl) {
    try {
      const items = await this.fetchFeed(feedUrl);
      return Array.isArray(items);
    } catch (error) {
      logger.error("Error verificando conexión con feed RSS", { 
        feedUrl,
        error: error.message 
      });
      return false;
    }
  }
}

export default RssClient;
export { RssClient };

