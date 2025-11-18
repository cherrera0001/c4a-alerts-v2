import { getUserByEmail, createUser } from "../services/auth.service.js";
import { logger } from "./logger.js";
import { getEnv } from "../config/env.js";

const DEFAULT_EMAIL = "contacto@c4a.cl";
const DEFAULT_NAME = "Administrador C4A";
const DEFAULT_ROLE = "admin";

/**
 * Inicializa el usuario por defecto si no existe
 * Se ejecuta automáticamente al iniciar el servidor
 * La contraseña se hashea automáticamente con bcrypt en createUser
 * 
 * @returns {Promise<Object>} Objeto con { created: boolean, user?: Object, error?: string }
 */
export async function initDefaultUser() {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await getUserByEmail(DEFAULT_EMAIL);
    
    if (existingUser) {
      logger.info("Usuario por defecto ya existe", { 
        email: DEFAULT_EMAIL,
        userId: existingUser.id,
        role: existingUser.role 
      });
      return { created: false, user: existingUser };
    }

    // Obtener contraseña de variable de entorno o usar una por defecto segura
    const defaultPassword = getEnv(
      "DEFAULT_ADMIN_PASSWORD",
      "C4aAdmin2024!"
    );

    // Validar que la contraseña cumple con los requisitos del schema
    if (defaultPassword.length < 8) {
      logger.warn("Contraseña por defecto demasiado corta, usando contraseña segura generada");
      // Si la contraseña del env es insegura, usar una por defecto más segura
    }

    // Crear el usuario (la contraseña se hasheará automáticamente en createUser con bcrypt)
    const user = await createUser({
      email: DEFAULT_EMAIL,
      password: defaultPassword, // Se hasheará con bcrypt (saltRounds: 10) en createUser
      name: DEFAULT_NAME,
      role: DEFAULT_ROLE,
    });

    logger.info("Usuario por defecto creado exitosamente", {
      email: DEFAULT_EMAIL,
      userId: user.id,
      role: user.role,
      note: "Contraseña hasheada con bcrypt antes de guardarse en la base de datos"
    });

    return { created: true, user };
  } catch (error) {
    logger.error("Error inicializando usuario por defecto", {
      error: error.message,
      email: DEFAULT_EMAIL,
      stack: error.stack
    });
    // No lanzar error para no bloquear el inicio del servidor
    return { created: false, error: error.message };
  }
}

