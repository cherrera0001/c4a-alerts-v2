import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "../utils/logger.js";
import { logSecurityEvent } from "./telemetry.service.js";

/**
 * Genera un secreto 2FA para un usuario
 */
export async function generate2FASecret(userId, email) {
  try {
    const secret = speakeasy.generateSecret({
      name: `C4A Alerts (${email})`,
      issuer: "C4A Alerts",
      length: 32,
    });

    // Guardar el secreto temporalmente (se confirmará cuando se verifique)
    await db.collection("users").doc(userId).update({
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
      twoFactorSetupAt: FieldValue.serverTimestamp(),
    });

    // Generar QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    logger.info("Secreto 2FA generado", { userId });

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url,
    };
  } catch (error) {
    logger.error("Error generando secreto 2FA", {
      userId,
      error: error.message,
    });
    throw new Error("Error al generar código 2FA");
  }
}

/**
 * Verifica un código TOTP
 */
export function verifyTOTP(secret, token) {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2, // Permite un margen de ±2 intervalos de tiempo (60 segundos cada uno)
    });

    return verified;
  } catch (error) {
    logger.error("Error verificando código TOTP", {
      error: error.message,
    });
    return false;
  }
}

/**
 * Habilita 2FA para un usuario después de verificar el código
 */
export async function enable2FA(userId, token) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error("Usuario no encontrado");
    }

    const user = userDoc.data();
    
    if (!user.twoFactorSecret) {
      throw new Error("No hay secreto 2FA configurado. Debe generar uno primero.");
    }

    // Verificar el código antes de habilitar
    const isValid = verifyTOTP(user.twoFactorSecret, token);
    
    if (!isValid) {
      throw new Error("Código 2FA inválido");
    }

    // Generar códigos de respaldo
    const backupCodes = await generateBackupCodes();

    // Habilitar 2FA y guardar códigos de respaldo
    await db.collection("users").doc(userId).update({
      twoFactorEnabled: true,
      twoFactorVerifiedAt: FieldValue.serverTimestamp(),
      twoFactorBackupCodes: backupCodes.hashed,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("2FA habilitado", { userId });

    return {
      success: true,
      backupCodes: backupCodes.plain, // Solo se devuelven una vez
    };
  } catch (error) {
    logger.error("Error habilitando 2FA", {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Deshabilita 2FA para un usuario
 */
export async function disable2FA(userId) {
  try {
    await db.collection("users").doc(userId).update({
      twoFactorEnabled: false,
      twoFactorSecret: FieldValue.delete(),
      twoFactorSetupAt: FieldValue.delete(),
      twoFactorVerifiedAt: FieldValue.delete(),
      twoFactorBackupCodes: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("2FA deshabilitado", { userId });

    return { success: true };
  } catch (error) {
    logger.error("Error deshabilitando 2FA", {
      userId,
      error: error.message,
    });
    throw new Error("Error al deshabilitar 2FA");
  }
}

/**
 * Verifica un código 2FA durante el login
 */
export async function verify2FALogin(userId, token) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error("Usuario no encontrado");
    }

    const user = userDoc.data();
    
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error("2FA no está habilitado para este usuario");
    }

    // Intentar verificar con TOTP primero
    let isValid = verifyTOTP(user.twoFactorSecret, token);

    // Si falla, verificar si es un código de respaldo
    if (!isValid && user.twoFactorBackupCodes) {
      const bcrypt = await import("bcrypt");
      const backupCodes = Array.isArray(user.twoFactorBackupCodes) 
        ? user.twoFactorBackupCodes 
        : [];

      for (let i = 0; i < backupCodes.length; i++) {
        const match = await bcrypt.compare(token, backupCodes[i]);
        if (match) {
          isValid = true;
          // Eliminar el código de respaldo usado
          const updatedCodes = backupCodes.filter((_, index) => index !== i);
          await db.collection("users").doc(userId).update({
            twoFactorBackupCodes: updatedCodes,
            updatedAt: FieldValue.serverTimestamp(),
          });
          logger.info("Código de respaldo 2FA usado", { userId });
          await logSecurityEvent("2FA_BACKUP_CODE_USED", { userId });
          break;
        }
      }
    }

    if (!isValid) {
      await logSecurityEvent("2FA_VERIFICATION_FAILED", { userId });
      throw new Error("Código 2FA inválido");
    }

    logger.info("2FA verificado exitosamente", { userId });

    return { success: true };
  } catch (error) {
    logger.error("Error verificando 2FA en login", {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Genera códigos de respaldo para 2FA
 */
async function generateBackupCodes(count = 8) {
  const bcrypt = await import("bcrypt");
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    // Generar código de 8 dígitos
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
    
    // Hashear el código para almacenarlo
    const hashed = await bcrypt.hash(code, 10);
    hashedCodes.push(hashed);
  }

  return {
    plain: codes,
    hashed: hashedCodes,
  };
}

/**
 * Verifica si un usuario tiene 2FA habilitado
 */
export async function is2FAEnabled(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }

    const user = userDoc.data();
    return user.twoFactorEnabled === true && !!user.twoFactorSecret;
  } catch (error) {
    logger.error("Error verificando estado 2FA", {
      userId,
      error: error.message,
    });
    return false;
  }
}

