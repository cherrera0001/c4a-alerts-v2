import { test } from "node:test";
import assert from "node:assert";

// Configurar entorno de test antes de importar módulos
process.env.NODE_ENV = "test";

// Test de smoke: verificar que Firebase puede inicializarse (con o sin credenciales)
test("Smoke test: Firebase module loads", async () => {
  // Verificar que el módulo de Firebase puede importarse sin errores
  // Incluso sin credenciales, debería crear un mock
  await assert.doesNotReject(
    async () => {
      const firebaseModule = await import("../src/config/firebase.js");
      assert.ok(firebaseModule.db, "Firebase db debe estar disponible (mock o real)");
    },
    "El módulo de Firebase debe cargarse sin errores, incluso sin credenciales"
  );
});

// Test de smoke: verificar que la aplicación puede importarse
test("Smoke test: app module loads", async () => {
  const appModule = await import("../src/config/app.js");
  assert.ok(appModule.default, "La aplicación debe exportarse correctamente");
});

// Test de smoke: verificar que el servidor puede iniciarse
test("Smoke test: server module loads", async () => {
  // Verificar que el módulo del servidor puede importarse sin errores
  // Nota: El servidor puede importarse, pero iniciarlo requiere configuración completa
  await assert.doesNotReject(
    import("../src/server.js"),
    "El módulo del servidor debe cargarse sin errores"
  );
});

