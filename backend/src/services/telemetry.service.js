import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "../utils/logger.js";

/**
 * Registra un evento de telemetría de seguridad
 */
export async function logSecurityEvent(eventType, details = {}) {
  try {
    const event = {
      type: eventType,
      timestamp: FieldValue.serverTimestamp(),
      details,
      createdAt: new Date().toISOString(),
    };

    await db.collection("security_events").add(event);
    
    logger.info("Evento de seguridad registrado", {
      eventType,
      ...details,
    });
  } catch (error) {
    logger.error("Error registrando evento de seguridad", {
      eventType,
      error: error.message,
    });
  }
}

/**
 * Registra un intento de login
 */
export async function logLoginAttempt(email, ip, userAgent, success, reason = null) {
  const normalizedEmail = email?.toLowerCase().trim();
  
  try {
    const attempt = {
      email: normalizedEmail,
      ip,
      userAgent: userAgent || "Unknown",
      success,
      reason: reason || (success ? "Login exitoso" : "Credenciales inválidas"),
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("login_attempts").add(attempt);
    
    if (success) {
      logger.info("Intento de login exitoso", {
        email: normalizedEmail,
        ip,
      });
    } else {
      logger.warn("Intento de login fallido", {
        email: normalizedEmail,
        ip,
        reason,
      });
    }

    // También registrar como evento de seguridad
    await logSecurityEvent(success ? "LOGIN_SUCCESS" : "LOGIN_FAILED", {
      email: normalizedEmail,
      ip,
      reason,
    });
  } catch (error) {
    logger.error("Error registrando intento de login", {
      email: normalizedEmail,
      error: error.message,
    });
  }
}

/**
 * Obtiene las métricas de intentos de login para un usuario
 */
export async function getLoginMetrics(email, hours = 24) {
  try {
    const normalizedEmail = email?.toLowerCase().trim();
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const snapshot = await db
      .collection("login_attempts")
      .where("email", "==", normalizedEmail)
      .where("createdAt", ">=", since.toISOString())
      .get();

    const attempts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const successful = attempts.filter(a => a.success).length;
    const failed = attempts.filter(a => !a.success).length;
    const uniqueIPs = new Set(attempts.map(a => a.ip)).size;

    return {
      total: attempts.length,
      successful,
      failed,
      uniqueIPs,
      attempts: attempts.slice(0, 50), // Últimos 50 intentos
    };
  } catch (error) {
    logger.error("Error obteniendo métricas de login", {
      email,
      error: error.message,
    });
    return {
      total: 0,
      successful: 0,
      failed: 0,
      uniqueIPs: 0,
      attempts: [],
    };
  }
}

/**
 * Verifica si una IP tiene demasiados intentos fallidos
 */
export async function isIPBlocked(ip, maxAttempts = 5, windowMinutes = 15) {
  try {
    const since = new Date();
    since.setMinutes(since.getMinutes() - windowMinutes);

    const snapshot = await db
      .collection("login_attempts")
      .where("ip", "==", ip)
      .where("success", "==", false)
      .where("createdAt", ">=", since.toISOString())
      .get();

    const failedAttempts = snapshot.docs.length;
    
    return failedAttempts >= maxAttempts;
  } catch (error) {
    logger.error("Error verificando bloqueo de IP", {
      ip,
      error: error.message,
    });
    return false;
  }
}

/**
 * Obtiene estadísticas generales de seguridad
 */
export async function getSecurityStats(hours = 24) {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const snapshot = await db
      .collection("security_events")
      .where("createdAt", ">=", since.toISOString())
      .get();

    const events = snapshot.docs.map(doc => doc.data());
    
    const loginSuccess = events.filter(e => e.type === "LOGIN_SUCCESS").length;
    const loginFailed = events.filter(e => e.type === "LOGIN_FAILED").length;
    const login2FA = events.filter(e => e.type === "LOGIN_2FA_REQUIRED").length;
    const login2FAVerified = events.filter(e => e.type === "LOGIN_2FA_VERIFIED").length;

    return {
      totalEvents: events.length,
      loginSuccess,
      loginFailed,
      login2FA,
      login2FAVerified,
      successRate: loginSuccess + loginFailed > 0 
        ? ((loginSuccess / (loginSuccess + loginFailed)) * 100).toFixed(2) 
        : 0,
    };
  } catch (error) {
    logger.error("Error obteniendo estadísticas de seguridad", {
      error: error.message,
    });
    return {
      totalEvents: 0,
      loginSuccess: 0,
      loginFailed: 0,
      login2FA: 0,
      login2FAVerified: 0,
      successRate: 0,
    };
  }
}


