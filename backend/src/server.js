import app from "./config/app.js";
import { getFirestoreDB } from "./config/firebase.js";
import { logger } from "./utils/logger.js";
import { serverConfig, getConfigSummary } from "./config/env.js";
import { initDefaultUser } from "./utils/init-default-user.js";

const PORT = serverConfig.port;

// Inicializar Firebase (solo si está configurado) y luego usuario por defecto
getFirestoreDB()
  .then(async () => {
    // Inicializar usuario por defecto después de que Firebase esté listo
    await initDefaultUser();
  })
  .catch(async (error) => {
    logger.warn("Firebase no disponible", { error: error.message });
    // Intentar crear usuario en modo mock también
    try {
      await initDefaultUser();
    } catch (err) {
      logger.warn("No se pudo crear usuario por defecto", { error: err.message });
    }
  });

// Función para iniciar el servidor
function startServer() {
  const server = app.listen(PORT, () => {
    const configSummary = getConfigSummary();
    logger.info(`Servidor iniciado en puerto ${PORT}`, {
      port: PORT,
      env: serverConfig.nodeEnv,
      timestamp: new Date().toISOString(),
      config: configSummary,
    });
  });

  // Manejo de errores del servidor
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      logger.error(`Puerto ${PORT} ya está en uso`, {
        port: PORT,
        error: error.message,
        hint: "Detén el proceso que está usando este puerto o cambia el puerto en .env",
      });
      process.exit(1);
    } else {
      logger.error("Error iniciando servidor", { error: error.message });
      process.exit(1);
    }
  });

  // Manejo de cierre graceful
  process.on("SIGTERM", () => {
    logger.info("Recibida señal SIGTERM, cerrando servidor...");
    server.close(() => {
      logger.info("Servidor cerrado correctamente");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    logger.info("Recibida señal SIGINT, cerrando servidor...");
    server.close(() => {
      logger.info("Servidor cerrado correctamente");
      process.exit(0);
    });
  });

  return server;
}

// Iniciar servidor
startServer();
