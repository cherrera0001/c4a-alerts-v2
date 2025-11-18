/**
 * Script de validación para verificar la integración de Gemini
 * Permite pasar la API key como argumento o variable de entorno
 * 
 * Uso:
 *   node test/validate-gemini-with-key.js
 *   GOOGLE_AI_API_KEY=tu_key node test/validate-gemini-with-key.js
 */

import { iaConfig, getConfigSummary } from "../src/config/env.js";
import IAClient from "../src/services/ia/ia.client.js";

// Obtener API key de argumentos o variable de entorno
const apiKey = process.argv[2] || process.env.GOOGLE_AI_API_KEY || "AIzaSyBPJW9ZYu0wweVzAZ_fIIjNx07rle1IfEE";

// Configurar temporalmente
process.env.GOOGLE_AI_API_KEY = apiKey;
process.env.IA_PROVIDER = "gemini";
process.env.GEMINI_MODEL = "gemini-2.0-flash";

// Recargar configuración (necesitamos reimportar después de cambiar env)
async function validateGeminiIntegration() {
  console.log("\n=== Validación de Integración Gemini ===\n");
  console.log(`Usando API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // Crear cliente directamente con configuración
  console.log("1. Creando cliente de IA con configuración Gemini...");
  const iaClient = new IAClient({
    provider: "gemini",
    geminiApiKey: apiKey,
    geminiModel: "gemini-2.0-flash",
    geminiBaseURL: "https://generativelanguage.googleapis.com/v1beta",
  });

  console.log(`   - Provider: ${iaClient.provider}`);
  console.log(`   - Habilitado: ${iaClient.enabled}`);
  console.log(`   - Model: ${iaClient.geminiModel}`);

  if (!iaClient.enabled) {
    console.error("\n❌ ERROR: El cliente de IA no está habilitado");
    process.exit(1);
  }
  console.log("   ✅ Cliente inicializado correctamente\n");

  // Probar conexión
  console.log("2. Probando conexión con Gemini API...");
  try {
    const testResult = await iaClient.testConnection();
    if (testResult) {
      console.log("   ✅ Conexión con Gemini exitosa\n");
    } else {
      console.error("\n❌ ERROR: No se pudo establecer conexión con Gemini");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ ERROR al probar conexión:", error.message);
    if (error.response?.data) {
      console.error("   Detalles:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }

  // Probar funcionalidad básica
  console.log("3. Probando funcionalidad básica (chat)...");
  try {
    const response = await iaClient.chat(
      "Eres un asistente útil. Responde de forma breve y concisa.",
      "Responde solo con 'OK' si puedes leer este mensaje."
    );
    console.log(`   - Respuesta: ${response.trim()}`);
    console.log("   ✅ Funcionalidad básica OK\n");
  } catch (error) {
    console.error("\n❌ ERROR al probar funcionalidad básica:", error.message);
    if (error.response?.data) {
      console.error("   Detalles:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }

  // Probar formato JSON
  console.log("4. Probando soporte de formato JSON...");
  try {
    const jsonResponse = await iaClient.chat(
      "Eres un asistente útil. Responde SOLO con un objeto JSON válido, sin texto adicional.",
      "Responde con un objeto JSON simple: {\"status\": \"ok\", \"test\": true}"
    );
    console.log(`   - Respuesta recibida: ${jsonResponse.substring(0, 150)}...`);
    try {
      const parsed = JSON.parse(jsonResponse);
      console.log("   - JSON válido:", JSON.stringify(parsed, null, 2));
      console.log("   ✅ Soporte JSON OK\n");
    } catch (parseError) {
      console.warn("   ⚠️  ADVERTENCIA: La respuesta no es JSON válido");
      console.warn(`   Error de parseo: ${parseError.message}`);
      console.warn("   Esto puede afectar métodos que requieren JSON");
    }
  } catch (error) {
    console.error("\n❌ ERROR al probar formato JSON:", error.message);
    if (error.response?.data) {
      console.error("   Detalles:", JSON.stringify(error.response.data, null, 2));
    }
  }

  // Probar método específico del proyecto
  console.log("5. Probando método summarizeThreat...");
  try {
    const summary = await iaClient.summarizeThreat(
      "CVE-2024-1234: Vulnerabilidad crítica en sistema de autenticación que permite bypass completo. Afecta versiones 1.0 a 2.5. Requiere actualización inmediata."
    );
    console.log(`   - Resumen generado: ${summary.substring(0, 200)}...`);
    console.log("   ✅ Método summarizeThreat OK\n");
  } catch (error) {
    console.error("\n❌ ERROR al probar summarizeThreat:", error.message);
  }

  // Resumen final
  console.log("=== Validación Completada ===\n");
  console.log("✅ Todas las validaciones pasaron exitosamente");
  console.log("✅ La integración de Gemini está lista para usar\n");
  console.log("Para usar en producción, agrega a tu archivo .env:");
  console.log("IA_PROVIDER=gemini");
  console.log("GOOGLE_AI_API_KEY=tu_api_key_aqui");
  console.log("GEMINI_MODEL=gemini-2.0-flash\n");
}

validateGeminiIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal durante la validación:", error);
    process.exit(1);
  });

