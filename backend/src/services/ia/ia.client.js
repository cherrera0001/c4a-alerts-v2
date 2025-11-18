import axios from "axios";
import { logger } from "../../utils/logger.js";
import { iaConfig } from "../../config/env.js";

/**
 * Cliente de IA unificado
 * Soporta OpenAI, Azure OpenAI y Google AI Studio (Gemini)
 * Proporciona una interfaz común para todos los proveedores
 */

class IAClient {
  constructor(config = {}) {
    // Detectar proveedor desde configuración o parámetro
    this.provider = config.provider || iaConfig.provider || 
                    (iaConfig.getEnabledProvider() || "openai");
    
    // Configuración OpenAI
    this.openaiApiKey = config.openaiApiKey || iaConfig.openai.apiKey;
    this.openaiBaseURL = config.openaiBaseURL || iaConfig.openai.baseURL;
    this.openaiModel = config.openaiModel || iaConfig.openai.model;
    
    // Configuración Azure OpenAI
    this.azureApiKey = config.azureApiKey || iaConfig.azure.apiKey;
    this.azureEndpoint = config.azureEndpoint || iaConfig.azure.endpoint;
    this.azureDeployment = config.azureDeployment || iaConfig.azure.deployment;
    this.azureApiVersion = config.azureApiVersion || iaConfig.azure.apiVersion;

    // Configuración Gemini (Google AI Studio)
    this.geminiApiKey = config.geminiApiKey || iaConfig.gemini.apiKey;
    this.geminiBaseURL = config.geminiBaseURL || iaConfig.gemini.baseURL;
    this.geminiModel = config.geminiModel || iaConfig.gemini.model;

    // Configuración común
    this.timeout = config.timeout || 60000; // 60 segundos
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.3; // Baja temperatura para respuestas más deterministas

    // Verificar disponibilidad
    this.enabled = false;
    if (this.provider === "openai" && this.openaiApiKey) {
      this.enabled = true;
    } else if (this.provider === "azure" && this.azureApiKey && this.azureEndpoint) {
      this.enabled = true;
    } else if (this.provider === "gemini" && this.geminiApiKey) {
      this.enabled = true;
    } else {
      logger.warn("IA no configurada - Cliente IA no funcional", { 
        provider: this.provider,
        openaiConfigured: !!this.openaiApiKey,
        azureConfigured: !!(this.azureApiKey && this.azureEndpoint),
        geminiConfigured: !!this.geminiApiKey,
      });
    }

    // Crear cliente HTTP según proveedor
    if (this.provider === "openai") {
      this.client = axios.create({
        baseURL: this.openaiBaseURL,
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: this.timeout,
      });
    } else if (this.provider === "azure") {
      this.client = axios.create({
        baseURL: `${this.azureEndpoint}/openai/deployments/${this.azureDeployment}`,
        headers: {
          "api-key": this.azureApiKey,
          "Content-Type": "application/json",
        },
        timeout: this.timeout,
        params: {
          "api-version": this.azureApiVersion,
        },
      });
    } else if (this.provider === "gemini") {
      this.client = axios.create({
        baseURL: this.geminiBaseURL,
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": this.geminiApiKey,
        },
        timeout: this.timeout,
      });
    }
  }

  /**
   * Llama a la API de chat/completions
   * @param {string} systemPrompt - Prompt del sistema
   * @param {string} userPrompt - Prompt del usuario
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<string>} Respuesta del modelo
   */
  async chat(systemPrompt, userPrompt, options = {}) {
    if (this.provider === "openai" && !this.openaiApiKey) {
      throw new Error("OpenAI API key no configurada");
    }
    if (this.provider === "azure" && (!this.azureApiKey || !this.azureEndpoint)) {
      throw new Error("Azure OpenAI no configurado");
    }
    if (this.provider === "gemini" && !this.geminiApiKey) {
      throw new Error("Google AI API key no configurada");
    }

    try {
      // Gemini usa un formato diferente
      if (this.provider === "gemini") {
        // Combinar system prompt y user prompt para Gemini
        const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
        // Asegurar que el modelo tenga el prefijo "models/" si no lo tiene
        const modelName = this.geminiModel.startsWith("models/") 
          ? this.geminiModel 
          : `models/${this.geminiModel}`;
        
        // Determinar versión de API: v1beta para modelos 2.0+ y 1.5+, v1 para modelos anteriores
        const apiVersion = (this.geminiModel.includes("2.0") || 
                           this.geminiModel.includes("2.5") || 
                           this.geminiModel.includes("1.5")) 
          ? "v1beta" 
          : "v1";
        
        // Actualizar baseURL si es necesario
        const baseURL = this.geminiBaseURL.replace(/\/v1(beta)?$/, `/${apiVersion}`);
        
        // Actualizar cliente con la URL correcta y header (el header ya está configurado en constructor)
        this.client = axios.create({
          baseURL: baseURL,
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": this.geminiApiKey,
          },
          timeout: this.timeout,
        });
        
        // Endpoint sin query parameter (la API key va en el header)
        const endpoint = `/${modelName}:generateContent`;
        
        const requestBody = {
          contents: [{
            parts: [{
              text: combinedPrompt
            }]
          }],
          generationConfig: {
            temperature: options.temperature || this.temperature,
            maxOutputTokens: options.maxTokens || this.maxTokens,
            topP: 0.95,
            topK: 40,
          },
        };

        // Si se requiere formato JSON, agregarlo al prompt
        if (options.responseFormat?.type === "json_object") {
          requestBody.generationConfig.responseMimeType = "application/json";
        }

        logger.debug("Enviando request a Gemini", { 
          provider: this.provider,
          model: this.geminiModel,
          apiVersion: apiVersion,
        });

        const response = await this.client.post(endpoint, requestBody);

        if (response.status !== 200 || !response.data || !response.data.candidates) {
          logger.error("Respuesta inesperada de Gemini", { 
            status: response.status,
            data: response.data 
          });
          throw new Error("Respuesta inesperada del modelo de IA");
        }

        let content = response.data.candidates[0]?.content?.parts[0]?.text;
        if (!content) {
          throw new Error("Respuesta vacía del modelo de IA");
        }

        // Limpiar contenido: remover markdown code blocks si están presentes
        // Gemini a veces devuelve JSON envuelto en ```json ... ```
        if (options.responseFormat?.type === "json_object") {
          content = content.trim();
          // Remover markdown code blocks
          if (content.startsWith("```")) {
            const lines = content.split("\n");
            // Remover primera línea (```json o ```)
            lines.shift();
            // Remover última línea (```)
            if (lines[lines.length - 1].trim() === "```") {
              lines.pop();
            }
            content = lines.join("\n").trim();
          }
        }

        return content;
      } else {
        // OpenAI y Azure OpenAI usan el formato estándar
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        const requestBody = {
          messages,
          model: this.provider === "openai" ? this.openaiModel : undefined,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature,
          ...(options.responseFormat && { response_format: options.responseFormat }),
        };

        const endpoint = "/chat/completions";

        logger.debug("Enviando request a IA", { 
          provider: this.provider,
          model: this.provider === "openai" ? this.openaiModel : this.azureDeployment,
        });

        const response = await this.client.post(endpoint, requestBody);

        if (response.status !== 200 || !response.data || !response.data.choices) {
          logger.error("Respuesta inesperada de IA", { 
            status: response.status,
            data: response.data 
          });
          throw new Error("Respuesta inesperada del modelo de IA");
        }

        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Respuesta vacía del modelo de IA");
        }

        return content;
      }
    } catch (error) {
      logger.error("Error llamando a IA", { 
        provider: this.provider,
        error: error.message,
        response: error.response?.data 
      });
      throw new Error(`Error en IA (${this.provider}): ${error.message}`);
    }
  }

  /**
   * Resumir una amenaza o texto de CTI
   * @param {string} text - Texto a resumir
   * @param {Object} options - Opciones
   * @returns {Promise<string>} Resumen generado
   */
  async summarizeThreat(text, options = {}) {
    const systemPrompt = `Eres un experto en ciberseguridad especializado en análisis de amenazas.
Tu tarea es resumir información de amenazas cibernéticas de forma clara y concisa.
Siempre enfócate en:
1. La naturaleza de la amenaza
2. Los sistemas o tecnologías afectados
3. El nivel de severidad
4. Acciones recomendadas

Responde SOLO con el resumen, sin introducciones ni explicaciones adicionales.`;

    const userPrompt = `Resume la siguiente información de amenaza:

${text}

${options.focus ? `Enfócate especialmente en: ${options.focus}` : ""}`;

    return await this.chat(systemPrompt, userPrompt, {
      maxTokens: options.maxTokens || 500,
    });
  }

  /**
   * Mapea una amenaza a tácticas MITRE ATT&CK
   * @param {Object} ctiItem - Item CTI con información de la amenaza
   * @returns {Promise<Object>} Mapeo a tácticas MITRE
   */
  async mapThreatToMitre(ctiItem) {
    const systemPrompt = `Eres un experto en MITRE ATT&CK Framework.
Tu tarea es mapear amenazas cibernéticas a tácticas y técnicas MITRE ATT&CK.

Responde SOLO con un objeto JSON en este formato:
{
  "tactics": ["T1190", "T1055"],
  "techniques": ["T1190.001", "T1055.012"],
  "confidence": 0.85,
  "reasoning": "Breve explicación del mapeo"
}

Usa solo IDs de técnicas válidos del framework MITRE ATT&CK.
La confianza debe ser un número entre 0 y 1.`;

    const userPrompt = `Mapea la siguiente amenaza a MITRE ATT&CK:

Título: ${ctiItem.title || "N/A"}
Resumen: ${ctiItem.summary || "N/A"}
CVEs: ${ctiItem.cveIds?.join(", ") || "N/A"}
CWEs: ${ctiItem.cwes?.join(", ") || "N/A"}
Severidad: ${ctiItem.severity || "N/A"}`;

    const response = await this.chat(systemPrompt, userPrompt, {
      maxTokens: 1000,
      responseFormat: { type: "json_object" },
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error("Error parseando respuesta de mapeo MITRE", { 
        error: error.message,
        response 
      });
      return {
        tactics: [],
        techniques: [],
        confidence: 0,
        reasoning: "Error parseando respuesta de IA",
      };
    }
  }

  /**
   * Genera un plan de mitigación para una amenaza
   * @param {Object} ctiItem - Item CTI
   * @param {Object} asset - Activo afectado (opcional)
   * @returns {Promise<Object>} Plan de mitigación
   */
  async generateMitigationPlan(ctiItem, asset = null) {
    const systemPrompt = `Eres un experto en ciberseguridad defensiva.
Tu tarea es generar planes de mitigación para amenazas cibernéticas.

Responde SOLO con un objeto JSON en este formato:
{
  "priority": "high|medium|low",
  "mitigations": [
    {
      "action": "Descripción de la acción",
      "priority": "immediate|short_term|long_term",
      "effort": "low|medium|high",
      "impact": "Descripción del impacto esperado"
    }
  ],
  "recommendedControls": ["Lista de controles recomendados"],
  "estimatedRiskReduction": 0.75
}`;

    let userPrompt = `Genera un plan de mitigación para la siguiente amenaza:

Título: ${ctiItem.title || "N/A"}
Resumen: ${ctiItem.summary || "N/A"}
CVEs: ${ctiItem.cveIds?.join(", ") || "N/A"}
Severidad: ${ctiItem.severity || "N/A"}`;

    if (asset) {
      userPrompt += `\n\nActivo afectado:
Nombre: ${asset.name || "N/A"}
Tipo: ${asset.type || "N/A"}
Criticidad: ${asset.criticality || "N/A"}
Tags: ${asset.tags?.join(", ") || "N/A"}`;
    }

    const response = await this.chat(systemPrompt, userPrompt, {
      maxTokens: 2000,
      responseFormat: { type: "json_object" },
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error("Error parseando plan de mitigación", { 
        error: error.message,
        response 
      });
      return {
        priority: "medium",
        mitigations: [],
        recommendedControls: [],
        estimatedRiskReduction: 0,
      };
    }
  }

  /**
   * Evalúa la relevancia de una amenaza para un activo
   * @param {Object} ctiItem - Item CTI
   * @param {Object} asset - Activo
   * @returns {Promise<Object>} Evaluación de relevancia
   */
  async assessRelevanceToAsset(ctiItem, asset) {
    const systemPrompt = `Eres un experto en análisis de riesgos de ciberseguridad.
Tu tarea es evaluar si una amenaza es relevante para un activo específico.

Responde SOLO con un objeto JSON en este formato:
{
  "relevant": true|false,
  "confidence": 0.85,
  "relevanceScore": 0.75,
  "reasons": ["Razón 1", "Razón 2"],
  "riskLevel": "critical|high|medium|low|none"
}`;

    const userPrompt = `Evalúa si la siguiente amenaza es relevante para el activo:

AMENAZA:
Título: ${ctiItem.title || "N/A"}
Resumen: ${ctiItem.summary || "N/A"}
CVEs: ${ctiItem.cveIds?.join(", ") || "N/A"}
Severidad: ${ctiItem.severity || "N/A"}

ACTIVO:
Nombre: ${asset.name || "N/A"}
Tipo: ${asset.type || "N/A"}
Criticidad: ${asset.criticality || "N/A"}
Tags: ${asset.tags?.join(", ") || "N/A"}
Metadata: ${JSON.stringify(asset.metadata || {})}`;

    const response = await this.chat(systemPrompt, userPrompt, {
      maxTokens: 1000,
      responseFormat: { type: "json_object" },
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error("Error parseando evaluación de relevancia", { 
        error: error.message,
        response 
      });
      return {
        relevant: false,
        confidence: 0,
        relevanceScore: 0,
        reasons: ["Error parseando respuesta de IA"],
        riskLevel: "none",
      };
    }
  }

  /**
   * Clasifica un item CTI en categorías (sector, región, actor)
   * @param {Object} ctiItem - Item CTI
   * @returns {Promise<Object>} Clasificación
   */
  async classifyCtiItem(ctiItem) {
    const systemPrompt = `Eres un experto en inteligencia de amenazas.
Tu tarea es clasificar amenazas cibernéticas en categorías.

Responde SOLO con un objeto JSON en este formato:
{
  "sectors": ["financiero", "energía", "salud"],
  "regions": ["América del Norte", "Europa"],
  "actors": ["APT28", "Lazarus"],
  "confidence": 0.80,
  "reasoning": "Breve explicación"
}`;

    const userPrompt = `Clasifica la siguiente amenaza:

Título: ${ctiItem.title || "N/A"}
Resumen: ${ctiItem.summary || "N/A"}`;

    const response = await this.chat(systemPrompt, userPrompt, {
      maxTokens: 1000,
      responseFormat: { type: "json_object" },
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error("Error parseando clasificación CTI", { 
        error: error.message,
        response 
      });
      return {
        sectors: [],
        regions: [],
        actors: [],
        confidence: 0,
        reasoning: "Error parseando respuesta de IA",
      };
    }
  }

  /**
   * Verifica la conectividad con el proveedor de IA
   * @returns {Promise<boolean>} true si está disponible
   */
  async testConnection() {
    try {
      await this.chat(
        "Eres un asistente útil.",
        "Responde solo con 'OK' si puedes leer este mensaje."
      );
      return true;
    } catch (error) {
      logger.error("Error verificando conexión con IA", { 
        provider: this.provider,
        error: error.message 
      });
      return false;
    }
  }
}

export default IAClient;
export { IAClient };

