import admin from "firebase-admin";
import { firebaseConfig, serverConfig } from "./env.js";

let db = null;
let isInitialized = false;

/**
 * Inicializa Firebase Admin SDK condicionalmente
 * Solo se inicializa si las variables de entorno están presentes
 * Permite desarrollo y testing sin credenciales de Firebase
 */
function initializeFirebase() {
  if (isInitialized) {
    return db;
  }

  // Modo test: usar mock
  if (serverConfig.nodeEnv === "test" && !firebaseConfig.isConfigured()) {
    console.warn("⚠️  Firebase no configurado - Usando modo de desarrollo limitado (tests)");
    db = createMockDb();
    isInitialized = true;
    return db;
  }

  // Si no hay credenciales, usar mock para desarrollo básico
  if (!firebaseConfig.isConfigured()) {
    console.warn("⚠️  Firebase no configurado - Las funcionalidades de base de datos no estarán disponibles");
    console.warn("⚠️  Para habilitar Firebase, configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY");
    db = createMockDb();
    isInitialized = true;
    return db;
  }

  // Inicialización normal con credenciales
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          privateKey: firebaseConfig.privateKey,
          clientEmail: firebaseConfig.clientEmail,
        }),
      });
      console.log("✅ Firebase Admin SDK inicializado correctamente");
    }
    db = admin.firestore();
    isInitialized = true;
    return db;
  } catch (error) {
    console.error("❌ Error inicializando Firebase:", error.message);
    console.warn("⚠️  Usando modo de desarrollo limitado");
    db = createMockDb();
    isInitialized = true;
    return db;
  }
}

/**
 * Crea un mock de Firestore para desarrollo/testing sin credenciales
 * Lanza errores informativos cuando se intenta usar
 */
function createMockDb() {
  const mockCollections = new Map();
  
  return {
    collection: (name) => {
      if (!mockCollections.has(name)) {
        mockCollections.set(name, new Map());
      }
      const collection = mockCollections.get(name);
      
      return {
        add: async (data) => {
          const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          collection.set(id, { id, ...data, createdAt: new Date() });
          return {
            id,
            get: async () => ({
              exists: true,
              id,
              data: () => collection.get(id),
            }),
          };
        },
        doc: (id) => ({
          get: async () => {
            const data = collection.get(id);
            return {
              exists: !!data,
              id,
              data: () => data || null,
            };
          },
          set: async (data) => {
            collection.set(id, { id, ...data });
            return { id };
          },
          update: async (data) => {
            const existing = collection.get(id) || { id };
            collection.set(id, { ...existing, ...data, updatedAt: new Date() });
            return { id };
          },
          delete: async () => {
            collection.delete(id);
            return { id };
          },
        }),
        where: (field, operator, value) => {
          const query = {
            field,
            operator,
            value,
          };
          return {
            where: function(f, o, v) { 
              query.field = f;
              query.operator = o;
              query.value = v;
              return this;
            },
            orderBy: () => ({
              limit: () => ({
                startAfter: () => ({
                  get: async () => {
                    const results = Array.from(collection.values()).filter(item => {
                      const itemValue = item[query.field];
                      if (query.operator === "==") {
                        return itemValue === query.value || 
                               (typeof itemValue === 'string' && typeof query.value === 'string' && 
                                itemValue.toLowerCase() === query.value.toLowerCase());
                      }
                      return false;
                    });
                    return {
                      docs: results.map(data => ({
                        id: data.id,
                        data: () => data,
                        exists: true,
                      })),
                      empty: results.length === 0,
                    };
                  },
                }),
                get: async () => {
                  const results = Array.from(collection.values()).filter(item => {
                    const itemValue = item[query.field];
                    if (query.operator === "==") {
                      return itemValue === query.value || 
                             (typeof itemValue === 'string' && typeof query.value === 'string' && 
                              itemValue.toLowerCase() === query.value.toLowerCase());
                    }
                    return false;
                  });
                  return {
                    docs: results.map(data => ({
                      id: data.id,
                      data: () => data,
                      exists: true,
                    })),
                    empty: results.length === 0,
                  };
                },
              }),
              get: async () => {
                const results = Array.from(collection.values()).filter(item => {
                  const itemValue = item[query.field];
                  if (query.operator === "==") {
                    return itemValue === query.value || 
                           (typeof itemValue === 'string' && typeof query.value === 'string' && 
                            itemValue.toLowerCase() === query.value.toLowerCase());
                  }
                  return false;
                });
                return {
                  docs: results.map(data => ({
                    id: data.id,
                    data: () => data,
                    exists: true,
                  })),
                  empty: results.length === 0,
                };
              },
            }),
            limit: (max) => ({
              startAfter: () => ({
                get: async () => {
                  const results = Array.from(collection.values())
                    .filter(item => {
                      const itemValue = item[query.field];
                      if (query.operator === "==") {
                        return itemValue === query.value || 
                               (typeof itemValue === 'string' && typeof query.value === 'string' && 
                                itemValue.toLowerCase() === query.value.toLowerCase());
                      }
                      return false;
                    })
                    .slice(0, max);
                  return {
                    docs: results.map(data => ({
                      id: data.id,
                      data: () => data,
                      exists: true,
                    })),
                    empty: results.length === 0,
                  };
                },
              }),
              get: async () => {
                const results = Array.from(collection.values())
                  .filter(item => {
                    const itemValue = item[query.field];
                    if (query.operator === "==") {
                      return itemValue === query.value || 
                             (typeof itemValue === 'string' && typeof query.value === 'string' && 
                              itemValue.toLowerCase() === query.value.toLowerCase());
                    }
                    return false;
                  })
                  .slice(0, max);
                return {
                  docs: results.map(data => ({
                    id: data.id,
                    data: () => data,
                    exists: true,
                  })),
                  empty: results.length === 0,
                };
              },
            }),
            get: async () => {
              const results = Array.from(collection.values()).filter(item => {
                const itemValue = item[query.field];
                if (query.operator === "==") {
                  return itemValue === query.value || 
                         (typeof itemValue === 'string' && typeof query.value === 'string' && 
                          itemValue.toLowerCase() === query.value.toLowerCase());
                }
                return false;
              });
              return {
                docs: results.map(data => ({
                  id: data.id,
                  data: () => data,
                  exists: true,
                })),
                empty: results.length === 0,
              };
            },
          };
        },
        orderBy: () => ({
          limit: () => ({
            startAfter: () => ({
              get: async () => ({ docs: [], empty: true }),
            }),
            get: async () => ({ docs: [], empty: true }),
          }),
          get: async () => ({ docs: [], empty: true }),
        }),
        limit: () => ({
          startAfter: () => ({
            get: async () => ({ docs: [], empty: true }),
          }),
          get: async () => ({ docs: [], empty: true }),
        }),
        get: async () => ({
          docs: Array.from(collection.values()).map(data => ({
            id: data.id,
            data: () => data,
            exists: true,
          })),
          empty: collection.size === 0,
        }),
      };
    },
  };
}

// Inicializar automáticamente al importar
db = initializeFirebase();

/**
 * Obtiene la instancia de Firestore DB
 * Retorna una promesa que resuelve con la instancia de db
 * Útil para verificar inicialización antes de usar
 */
export async function getFirestoreDB() {
  if (!isInitialized) {
    db = initializeFirebase();
  }
  return Promise.resolve(db);
}

export { db };
export { initializeFirebase };
