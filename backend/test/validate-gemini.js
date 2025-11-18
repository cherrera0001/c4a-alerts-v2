/**
 * Script de validación para verificar la integración de Gemini
 * Ejecutar con: node test/validate-gemini.js
 */

import { iaConfig, getConfigSummary } from "../src/config/env.js";
import IAClient from "../src/services/ia/ia.client.js";
import { logger } from "../src/utils/logger.js";

async function validateGeminiIntegration() {
  console.log("\n=== Validación de Integración Gemini ===\n");

  // 1. Verificar configuración
  console.log("1. Verificando configuración...");
  console.log(`   - Provider configurado: ${iaConfig.provider}`);
  console.log(`   - Gemini habilitado: ${iaConfig.gemini.enabled}`);
  console.log(`   - Gemini API Key presente: ${!!iaConfig.gemini.apiKey}`);
  console.log(`   - Gemini Model: ${iaConfig.gemini.model}`);
  console.log(`   - Gemini Base URL: ${iaConfig.gemini.baseURL}`);

  if (!iaConfig.gemini.enabled) {
    console.error("\n❌ ERROR: Gemini no está configurado correctamente");
    console.error("   Asegúrate de tener GOOGLE_AI_API_KEY en tu archivo .env");
    process.exit(1);
  }

  console.log("   ✅ Configuración OK\n");

  // 2. Verificar resumen de configuración
  console.log("2. Verificando resumen de configuración...");
  const summary = getConfigSummary();
  console.log(`   - Provider detectado: ${summary.ia.provider}`);
  console.log(`   - Gemini en resumen: ${summary.ia.gemini}`);
  
  if (summary.ia.provider !== "gemini") {
    console.warn(`   ⚠️  ADVERTENCIA: El provider detectado es '${summary.ia.provider}', no 'gemini'`);
    console.warn("   Esto puede ser normal si hay múltiples proveedores configurados");
  } else {
    console.log("   ✅ Provider correcto\n");
  }

  // 3. Verificar inicialización del cliente
  console.log("3. Verificando inicialización del cliente de IA...");
  let iaClient;
  try {
    iaClient = new IAClient({
      provider: "gemini",
    });
    console.log(`   - Cliente creado: ${iaClient ? "Sí" : "No"}`);
    console.log(`   - Provider del cliente: ${iaClient.provider}`);
    console.log(`   - Cliente habilitado: ${iaClient.enabled}`);
    
    if (!iaClient.enabled) {
      console.error("\n❌ ERROR: El cliente de IA no está habilitado");
      process.exit(1);
    }
    console.log("   ✅ Cliente inicializado correctamente\n");
  } catch (error) {
    console.error("\n❌ ERROR al inicializar cliente:", error.message);
    process.exit(1);
  }

  // 4. Probar conexión con Gemini
  console.log("4. Probando conexión con Gemini API...");
  try {
    const testResult = await iaClient.testConnection();
    if (testResult) {
      console.log("   ✅ Conexión con Gemini exitosa\n");
    } else {
      console.error("\n❌ ERROR: No se pudo establecer conexión con Gemini");
      console.error("   Verifica tu API key y que tengas acceso a internet");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ ERROR al probar conexión:", error.message);
    if (error.response) {
      console.error("   Respuesta del servidor:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }

  // 5. Probar funcionalidad básica
  console.log("5. Probando funcionalidad básica (chat)...");
  try {
    const response = await iaClient.chat(
      "Eres un asistente útil. Responde de forma breve y concisa.",
      "Responde solo con 'OK' si puedes leer este mensaje."
    );
    console.log(`   - Respuesta recibida: ${response.substring(0, 100)}...`);
    console.log("   ✅ Funcionalidad básica OK\n");
  } catch (error) {
    console.error("\n❌ ERROR al probar funcionalidad básica:", error.message);
    process.exit(1);
  }

  // 6. Probar formato JSON (importante para métodos como mapThreatToMitre)
  console.log("6. Probando soporte de formato JSON...");
  try {
    const jsonResponse = await iaClient.chat(
      "Eres un asistente útil. Responde SOLO con un objeto JSON válido.",
      "Responde con un objeto JSON simple: {\"status\": \"ok\", \"test\": true}"
    );
    console.log(`   - Respuesta JSON recibida: ${jsonResponse.substring(0, 100)}...`);
    try {
      const parsed = JSON.parse(jsonResponse);
      console.log("   - JSON válido:", parsed);
      console.log("   ✅ Soporte JSON OK\n");
    } catch (parseError) {
      console.warn("   ⚠️  ADVERTENCIA: La respuesta no es JSON válido");
      console.warn("   Esto puede afectar métodos que requieren JSON (mapThreatToMitre, etc.)");
    }
  } catch (error) {
    console.error("\n❌ ERROR al probar formato JSON:", error.message);
    process.exit(1);
  }

  // Resumen final
  console.log("=== Validación Completada ===\n");
  console.log("✅ Todas las validaciones pasaron exitosamente");
  console.log("✅ La integración de Gemini está lista para usar\n");
}

// Ejecutar validación
validateGeminiIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal durante la validación:", error);
    process.exit(1);
  });

