import { db } from "../../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "../../utils/logger.js";
import IAClient from "../ia/ia.client.js";

/**
 * Servicio RAG (Retrieval-Augmented Generation) básico
 * Almacena y recupera conocimiento CTI para enriquecer respuestas de IA
 * Nota: En producción, usar un vector store dedicado (Pinecone, Weaviate, Chroma)
 */

class RAGService {
  constructor(config = {}) {
    this.iaClient = config.iaClient || new IAClient({
      enabled: !!process.env.OPENAI_API_KEY || 
               !!process.env.AZURE_OPENAI_API_KEY || 
               !!process.env.GOOGLE_AI_API_KEY,
    });

    this.enableEmbeddings = config.enableEmbeddings !== false && this.iaClient.enabled;
    this.collectionName = "cti_knowledge_base";
  }

  /**
   * Genera embeddings de texto (usando OpenAI embeddings API)
   * Nota: En producción, usar un servicio de embeddings dedicado
   * @param {string} text - Texto a convertir en embedding
   * @returns {Promise<number[]>} Vector embedding
   */
  async generateEmbedding(text) {
    if (!this.enableEmbeddings || !this.iaClient.enabled) {
      // Fallback: hash simple (no es un embedding real)
      logger.warn("Embeddings no disponibles, usando hash simple");
      return this.simpleHash(text);
    }

    try {
      // OpenAI embeddings API
      if (this.iaClient.provider === "openai") {
        const response = await this.iaClient.client.post("/embeddings", {
          model: "text-embedding-3-small",
          input: text.substring(0, 8000), // Límite de tokens
        });

        if (response.data && response.data.data && response.data.data[0]) {
          return response.data.data[0].embedding;
        }
      }

      // Azure OpenAI embeddings
      if (this.iaClient.provider === "azure") {
        const response = await this.iaClient.client.post("/embeddings", {
          model: "text-embedding-ada-002",
          input: text.substring(0, 8000),
        });

        if (response.data && response.data.data && response.data.data[0]) {
          return response.data.data[0].embedding;
        }
      }

      throw new Error("No se pudo generar embedding");
    } catch (error) {
      logger.error("Error generando embedding", { error: error.message });
      return this.simpleHash(text);
    }
  }

  /**
   * Hash simple como fallback (no es un embedding real)
   * @param {string} text - Texto
   * @returns {number[]} Vector de hash
   */
  simpleHash(text) {
    // Hash simple de 128 dimensiones (no es un embedding real)
    const hash = Buffer.from(text).toString("base64");
    const vector = new Array(128).fill(0);
    for (let i = 0; i < Math.min(hash.length, 128); i++) {
      vector[i] = hash.charCodeAt(i) / 255.0;
    }
    return vector;
  }

  /**
   * Calcula similitud coseno entre dos vectores
   * @param {number[]} vec1 - Vector 1
   * @param {number[]} vec2 - Vector 2
   * @returns {number} Similitud (0-1)
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Indexa un documento CTI en la base de conocimiento
   * @param {Object} doc - Documento a indexar
   * @returns {Promise<Object>} Documento indexado con embedding
   */
  async indexDocument(doc) {
    if (!doc || !doc.id) {
      throw new Error("Documento con id es requerido");
    }

    try {
      logger.info("Indexando documento en RAG", { docId: doc.id });

      // Generar texto para embedding
      const text = `${doc.title || ""} ${doc.summary || ""} ${doc.cveIds?.join(" ") || ""} ${doc.cwes?.join(" ") || ""}`;

      // Generar embedding
      const embedding = await this.generateEmbedding(text);

      // Guardar en Firestore
      const indexedDoc = {
        ...doc,
        embedding,
        indexedAt: FieldValue.serverTimestamp(),
        text,
      };

      await db.collection(this.collectionName).doc(doc.id).set(indexedDoc, {
        merge: true,
      });

      logger.info("Documento indexado exitosamente", { docId: doc.id });

      return indexedDoc;
    } catch (error) {
      logger.error("Error indexando documento", {
        docId: doc?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Busca documentos similares usando embeddings
   * @param {string} query - Consulta de búsqueda
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Array>} Documentos similares ordenados por relevancia
   */
  async retrieveSimilar(query, options = {}) {
    try {
      logger.info("Buscando documentos similares en RAG", { query });

      // Generar embedding de la consulta
      const queryEmbedding = await this.generateEmbedding(query);

      // Obtener todos los documentos indexados (en producción usar vector store)
      const snapshot = await db.collection(this.collectionName)
        .where("embedding", "!=", null)
        .limit(options.limit || 100)
        .get();

      const results = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.embedding || !Array.isArray(data.embedding)) {
          continue;
        }

        // Calcular similitud coseno
        const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);

        if (similarity >= (options.threshold || 0.5)) {
          results.push({
            id: doc.id,
            ...data,
            similarity: Math.round(similarity * 100) / 100,
          });
        }
      }

      // Ordenar por similitud descendente
      results.sort((a, b) => b.similarity - a.similarity);

      // Limitar resultados
      const limit = options.maxResults || 10;
      const topResults = results.slice(0, limit);

      logger.info("Búsqueda RAG completada", {
        query,
        totalResults: results.length,
        topResults: topResults.length,
      });

      return topResults;
    } catch (error) {
      logger.error("Error buscando documentos similares", {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Correlaciona una amenaza con amenazas históricas similares
   * @param {Object} threat - Amenaza actual
   * @returns {Promise<Object>} Amenazas históricas similares y contexto
   */
  async correlateThreatsWithHistory(threat) {
    try {
      // Generar consulta de búsqueda
      const query = `${threat.title || ""} ${threat.summary || ""} ${threat.cveIds?.join(" ") || ""}`;

      // Buscar amenazas similares
      const similarThreats = await this.retrieveSimilar(query, {
        threshold: 0.6,
        maxResults: 5,
      });

      // Generar contexto con IA si está disponible
      let context = null;
      if (this.iaClient.enabled && similarThreats.length > 0) {
        try {
          const systemPrompt = `Eres un experto en threat intelligence.
Analiza amenazas históricas similares y proporciona contexto sobre patrones y tendencias.`;

          const userPrompt = `Analiza estas amenazas históricas similares y proporciona contexto:

Amenaza actual:
${threat.title}

Amenazas históricas similares:
${similarThreats.map((t, i) => `${i + 1}. ${t.title} (similitud: ${(t.similarity * 100).toFixed(0)}%)`).join("\n")}

Proporciona un análisis de máximo 300 palabras.`;

          context = await this.iaClient.chat(systemPrompt, userPrompt, {
            maxTokens: 800,
          });
        } catch (error) {
          logger.warn("Error generando contexto histórico con IA", {
            error: error.message,
          });
        }
      }

      return {
        threat,
        similarThreats,
        context,
        correlationCount: similarThreats.length,
      };
    } catch (error) {
      logger.error("Error correlacionando amenazas con historia", {
        error: error.message,
        threatId: threat?.id,
      });
      throw error;
    }
  }

  /**
   * Indexa un PoC (Proof of Concept) o documento técnico
   * @param {Object} poc - PoC a indexar
   * @returns {Promise<Object>} PoC indexado
   */
  async indexPoC(poc) {
    if (!poc || !poc.content) {
      throw new Error("PoC con contenido es requerido");
    }

    try {
      const docId = poc.id || `poc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const doc = {
        id: docId,
        type: "poc",
        title: poc.title || "PoC sin título",
        content: poc.content,
        source: poc.source || "manual",
        url: poc.url || null,
        cveIds: poc.cveIds || [],
        metadata: poc.metadata || {},
        createdAt: FieldValue.serverTimestamp(),
      };

      return await this.indexDocument(doc);
    } catch (error) {
      logger.error("Error indexando PoC", {
        pocId: poc?.id,
        error: error.message,
      });
      throw error;
    }
  }
}

export default RAGService;
export { RAGService };

