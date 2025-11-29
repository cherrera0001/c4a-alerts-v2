import bcrypt from "bcrypt";
import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { signToken } from "../utils/jwt.js";
import { logger } from "../utils/logger.js";

export async function getUserByEmail(email) {
  if (!email || typeof email !== "string") {
    logger.warn("getUserByEmail: email inválido", { email });
    return null;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const snapshot = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.debug("getUserByEmail: usuario no encontrado", { email: normalizedEmail });
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error("Error obteniendo usuario por email", { email, error: error.message });
    return null;
  }
}

export async function getUserById(userId) {
  if (!userId || typeof userId !== "string") {
    logger.warn("getUserById: userId inválido", { userId });
    return null;
  }

  try {
    const doc = await db.collection("users").doc(userId).get();
    
    if (!doc.exists) {
      logger.debug("getUserById: usuario no encontrado", { userId });
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error("Error obteniendo usuario", { userId, error: error.message });
    return null;
  }
}

export async function createUser(userData) {
  const { email, password, name, role = "viewer", organizationId, whatsapp } = userData;

  if (!email || !password || !name) {
    const error = new Error("Email, contraseña y nombre son requeridos");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    const error = new Error("El usuario con este email ya existe");
    error.statusCode = 409;
    throw error;
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const normalizedEmail = email.toLowerCase().trim();
    const newUser = {
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      role: role || "viewer",
      organizationId: organizationId || null,
      whatsapp: whatsapp || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("users").add(newUser);
    logger.info("Usuario creado", { userId: docRef.id, email: normalizedEmail });

    const { password: _, ...userWithoutPassword } = newUser;
    return {
      id: docRef.id,
      ...userWithoutPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error creando usuario", { email, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al crear el usuario en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function loginUser(email, password, ip = null, userAgent = null, twoFactorCode = null) {
  if (!email || !password) {
    const error = new Error("Email y contraseña son requeridos");
    error.statusCode = 400;
    throw error;
  }

  // Importar servicios de telemetría y 2FA
  const { logLoginAttempt, isIPBlocked, logSecurityEvent } = await import("./telemetry.service.js");
  const { verify2FALogin } = await import("./twoFactor.service.js");

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Verificar bloqueo de IP
    if (ip) {
      const blocked = await isIPBlocked(ip);
      if (blocked) {
        await logLoginAttempt(normalizedEmail, ip, userAgent, false, "IP bloqueada por demasiados intentos fallidos");
        const error = new Error("Tu IP ha sido temporalmente bloqueada por demasiados intentos fallidos. Intenta más tarde.");
        error.statusCode = 429;
        throw error;
      }
    }

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      await logLoginAttempt(normalizedEmail, ip, userAgent, false, "Usuario no encontrado");
      const error = new Error("Credenciales inválidas");
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await logLoginAttempt(normalizedEmail, ip, userAgent, false, "Contraseña incorrecta");
      const error = new Error("Credenciales inválidas");
      error.statusCode = 401;
      throw error;
    }

    // Verificar si 2FA está habilitado
    const needs2FA = user.twoFactorEnabled === true && !!user.twoFactorSecret;
    
    if (needs2FA) {
      // Si no se proporcionó código 2FA, indicar que se requiere
      if (!twoFactorCode) {
        await logSecurityEvent("LOGIN_2FA_REQUIRED", {
          userId: user.id,
          email: normalizedEmail,
          ip,
        });
        const error = new Error("Se requiere código de autenticación de dos factores");
        error.statusCode = 403;
        error.code = "2FA_REQUIRED";
        error.userId = user.id;
        throw error;
      }

      // Verificar código 2FA
      try {
        await verify2FALogin(user.id, twoFactorCode);
        await logSecurityEvent("LOGIN_2FA_VERIFIED", {
          userId: user.id,
          email: normalizedEmail,
          ip,
        });
      } catch (verifyError) {
        await logLoginAttempt(normalizedEmail, ip, userAgent, false, "Código 2FA inválido");
        throw verifyError;
      }
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    const { password: _, twoFactorSecret: __, twoFactorBackupCodes: ___, ...userWithoutPassword } = user;
    
    await logLoginAttempt(normalizedEmail, ip, userAgent, true, "Login exitoso");

    logger.info("Usuario autenticado", { 
      userId: user.id, 
      email: normalizedEmail,
      twoFactorEnabled: needs2FA,
    });

    return {
      user: userWithoutPassword,
      token,
      twoFactorEnabled: needs2FA,
    };
  } catch (error) {
    logger.error("Error en login", { email, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const authError = new Error("Error al autenticar usuario");
    authError.statusCode = 500;
    authError.originalError = error.message;
    throw authError;
  }
}

export async function updateUserProfile(userId, updateData) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("userId es requerido");
    error.statusCode = 400;
    throw error;
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    const error = new Error("Debe proporcionar al menos un campo para actualizar");
    error.statusCode = 400;
    throw error;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const updateFields = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (updateData.email) {
      const normalizedEmail = updateData.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existingUser = await getUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== userId) {
          const error = new Error("El email ya está en uso por otro usuario");
          error.statusCode = 409;
          throw error;
        }
        updateFields.email = normalizedEmail;
      }
    }

    if (updateData.name) {
      updateFields.name = updateData.name.trim();
    }

    if (updateData.whatsapp !== undefined) {
      updateFields.whatsapp = updateData.whatsapp || null;
    }

    await db.collection("users").doc(userId).update(updateFields);

    const updatedUser = await getUserById(userId);
    const { password: _, ...userWithoutPassword } = updatedUser;

    logger.info("Perfil actualizado", { userId });

    return userWithoutPassword;
  } catch (error) {
    logger.error("Error actualizando perfil", { userId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al actualizar el perfil en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("userId es requerido");
    error.statusCode = 400;
    throw error;
  }

  if (!currentPassword || !newPassword) {
    const error = new Error("Contraseña actual y nueva contraseña son requeridas");
    error.statusCode = 400;
    throw error;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      const error = new Error("Contraseña actual incorrecta");
      error.statusCode = 401;
      throw error;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.collection("users").doc(userId).update({
      password: hashedPassword,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("Contraseña actualizada", { userId });
  } catch (error) {
    logger.error("Error cambiando contraseña", { userId, error: error.message });
    
    if (error.statusCode) {
      throw error;
    }
    
    const dbError = new Error("Error al cambiar la contraseña en la base de datos");
    dbError.statusCode = 500;
    dbError.originalError = error.message;
    throw dbError;
  }
}
