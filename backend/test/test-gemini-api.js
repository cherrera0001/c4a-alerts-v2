/**
 * Script para probar directamente la API de Gemini y ver qué modelos están disponibles
 */

import axios from "axios";

const apiKey = "AIzaSyBPJW9ZYu0wweVzAZ_fIIjNx07rle1IfEE";

async function testGeminiAPI() {
  console.log("Probando diferentes endpoints de Gemini API...\n");

  // Probar listar modelos
  try {
    console.log("1. Listando modelos disponibles...");
    const listResponse = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    console.log("Modelos disponibles:");
    listResponse.data.models?.forEach(model => {
      console.log(`   - ${model.name} (${model.supportedGenerationMethods?.join(", ") || "N/A"})`);
    });
  } catch (error) {
    console.error("Error listando modelos:", error.response?.data || error.message);
  }

  // Probar con diferentes modelos
  const modelsToTest = [
    "gemini-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "models/gemini-pro",
    "models/gemini-1.5-pro",
  ];

  console.log("\n2. Probando generateContent con diferentes modelos...");
  for (const model of modelsToTest) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(endpoint, {
        contents: [{
          parts: [{
            text: "Responde solo con 'OK'"
          }]
        }]
      });
      console.log(`   ✅ ${model}: Funciona`);
      break; // Si funciona, usar este modelo
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ❌ ${model}: No encontrado`);
      } else {
        console.log(`   ⚠️  ${model}: Error ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
      }
    }
  }
}

testGeminiAPI().catch(console.error);

