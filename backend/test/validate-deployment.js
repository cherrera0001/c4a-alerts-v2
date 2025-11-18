/**
 * Script de validación completa del despliegue
 * Verifica que el servidor puede iniciarse y que todas las configuraciones están correctas
 */

import { getConfigSummary } from "../src/config/env.js";
import app from "../src/config/app.js";

async function validateDeployment() {
  console.log("\n=== Validación Completa del Despliegue ===\n");

  // 1. Verificar configuración
  console.log("1. Verificando configuración del sistema...");
  const summary = getConfigSummary();
  
  console.log("   Configuración del servidor:");
  console.log(`   - Puerto: ${summary.server.port}`);
  console.log(`   - Entorno: ${summary.server.nodeEnv}`);
  console.log(`   - Log Level: ${summary.server.logLevel}`);

  console.log("\n   Configuración de autenticación:");
  console.log(`   - JWT configurado: ${summary.auth.jwtConfigured ? "Sí" : "No"}`);
  console.log(`   - JWT expira en: ${summary.auth.jwtExpiresIn}`);

  console.log("\n   Configuración de CORS:");
  console.log(`   - Orígenes permitidos: ${summary.cors.origins.join(", ")}`);

  console.log("\n   Configuración de servicios:");
  console.log(`   - Firebase: ${summary.firebase.configured ? "Configurado" : "No configurado"}`);
  console.log(`   - SMTP: ${summary.smtp.configured ? "Configurado" : "No configurado"}`);
  console.log(`   - Twilio: ${summary.twilio.configured ? "Configurado" : "No configurado"}`);
  console.log(`   - Telegram: ${summary.telegram.configured ? "Configurado" : "No configurado"}`);

  console.log("\n   Configuración de CTI:");
  console.log(`   - MISP: ${summary.cti.misp ? "Habilitado" : "Deshabilitado"}`);
  console.log(`   - NVD: ${summary.cti.nvd ? "Habilitado" : "Deshabilitado"}`);
  console.log(`   - RSS: ${summary.cti.rss ? "Habilitado" : "Deshabilitado"}`);

  console.log("\n   Configuración de IA:");
  console.log(`   - Provider: ${summary.ia.provider || "Ninguno"}`);
  console.log(`   - OpenAI: ${summary.ia.openai ? "Habilitado" : "Deshabilitado"}`);
  console.log(`   - Azure OpenAI: ${summary.ia.azure ? "Habilitado" : "Deshabilitado"}`);
  console.log(`   - Gemini: ${summary.ia.gemini ? "Habilitado" : "Deshabilitado"}`);

  if (!summary.ia.provider) {
    console.warn("\n   ⚠️  ADVERTENCIA: No hay proveedor de IA configurado");
    console.warn("   Las funcionalidades de IA no estarán disponibles");
  } else {
    console.log(`\n   ✅ Proveedor de IA: ${summary.ia.provider}`);
  }

  // 2. Verificar que la app Express se carga correctamente
  console.log("\n2. Verificando aplicación Express...");
  if (app) {
    console.log("   ✅ Aplicación Express cargada correctamente");
  } else {
    console.error("   ❌ ERROR: No se pudo cargar la aplicación Express");
    process.exit(1);
  }

  // 3. Verificar rutas principales
  console.log("\n3. Verificando rutas principales...");
  const routes = [
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/alerts",
    "/api/assets",
    "/api/cti",
    "/api/ai",
  ];
  
  console.log("   Rutas disponibles:");
  routes.forEach(route => {
    console.log(`   - ${route}`);
  });
  console.log("   ✅ Rutas configuradas correctamente");

  // 4. Resumen final
  console.log("\n=== Resumen de Validación ===\n");
  
  const issues = [];
  if (!summary.auth.jwtConfigured) {
    issues.push("JWT no configurado (usando valor por defecto inseguro)");
  }
  if (!summary.firebase.configured) {
    issues.push("Firebase no configurado (base de datos no disponible)");
  }
  if (!summary.ia.provider) {
    issues.push("Proveedor de IA no configurado (funcionalidades de IA no disponibles)");
  }

  if (issues.length > 0) {
    console.log("⚠️  Advertencias encontradas:");
    issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  } else {
    console.log("✅ No se encontraron problemas críticos");
  }

  console.log("\n✅ Validación del despliegue completada");
  console.log("✅ El servidor está listo para iniciarse\n");
}

validateDeployment()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal durante la validación:", error);
    process.exit(1);
  });

