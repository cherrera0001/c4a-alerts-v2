/**
 * Clase base para todos los agentes de IA
 * Define la interfaz común y funcionalidades compartidas
 */

export class BaseAgent {
  constructor(config = {}) {
    this.name = config.name || "BaseAgent";
    this.enabled = config.enabled !== false;
    this.config = config;
    this.stats = {
      tasksProcessed: 0,
      tasksFailed: 0,
      tasksSucceeded: 0,
      lastRun: null,
      averageDuration: 0,
    };
  }

  /**
   * Procesa una tarea (debe ser implementado por subclases)
   * @param {Object} input - Entrada para el agente
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async process(input) {
    throw new Error("process() debe ser implementado por la subclase");
  }

  /**
   * Valida la entrada antes de procesar
   * @param {Object} input - Entrada a validar
   * @returns {boolean} true si es válida
   */
  validateInput(input) {
    return input !== null && input !== undefined;
  }

  /**
   * Ejecuta el agente con manejo de errores y estadísticas
   * @param {Object} input - Entrada para el agente
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async run(input) {
    if (!this.enabled) {
      throw new Error(`Agente ${this.name} está deshabilitado`);
    }

    if (!this.validateInput(input)) {
      throw new Error(`Entrada inválida para agente ${this.name}`);
    }

    const startTime = Date.now();

    try {
      const result = await this.process(input);
      
      this.stats.tasksProcessed++;
      this.stats.tasksSucceeded++;
      this.stats.lastRun = new Date();
      
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);

      return {
        success: true,
        result,
        duration,
        agent: this.name,
      };
    } catch (error) {
      this.stats.tasksProcessed++;
      this.stats.tasksFailed++;
      this.stats.lastRun = new Date();

      throw {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        agent: this.name,
      };
    }
  }

  /**
   * Actualiza la duración promedio
   * @param {number} duration - Duración de la última ejecución
   */
  updateAverageDuration(duration) {
    if (this.stats.tasksProcessed === 1) {
      this.stats.averageDuration = duration;
    } else {
      this.stats.averageDuration = 
        (this.stats.averageDuration * (this.stats.tasksProcessed - 1) + duration) / 
        this.stats.tasksProcessed;
    }
  }

  /**
   * Obtiene estadísticas del agente
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.enabled,
      name: this.name,
      successRate: this.stats.tasksProcessed > 0
        ? (this.stats.tasksSucceeded / this.stats.tasksProcessed) * 100
        : 0,
    };
  }

  /**
   * Habilita el agente
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Deshabilita el agente
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Resetea las estadísticas
   */
  resetStats() {
    this.stats = {
      tasksProcessed: 0,
      tasksFailed: 0,
      tasksSucceeded: 0,
      lastRun: null,
      averageDuration: 0,
    };
  }
}

