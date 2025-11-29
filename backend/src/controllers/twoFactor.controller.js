import * as twoFactorService from "../services/twoFactor.service.js";
import * as authService from "../services/auth.service.js";

/**
 * Genera un nuevo secreto 2FA y QR code para el usuario
 */
export async function setup2FA(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: "2FA ya está habilitado para este usuario",
      });
    }

    const secret = await twoFactorService.generate2FASecret(userId, user.email);

    res.json({
      success: true,
      data: {
        secret: secret.secret,
        qrCode: secret.qrCode,
        otpauthUrl: secret.otpauthUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifica el código 2FA y habilita 2FA para el usuario
 */
export async function enable2FA(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const { token } = req.body;

    if (!token || typeof token !== "string" || token.length !== 6) {
      return res.status(400).json({
        success: false,
        error: "Código 2FA inválido. Debe tener 6 dígitos.",
      });
    }

    const result = await twoFactorService.enable2FA(userId, token);

    res.json({
      success: true,
      data: {
        enabled: true,
        backupCodes: result.backupCodes,
        message: "2FA habilitado exitosamente. Guarda tus códigos de respaldo en un lugar seguro.",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deshabilita 2FA para el usuario
 */
export async function disable2FA(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    
    await twoFactorService.disable2FA(userId);

    res.json({
      success: true,
      message: "2FA deshabilitado exitosamente",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifica si el usuario tiene 2FA habilitado
 */
export async function get2FAStatus(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    
    const enabled = await twoFactorService.is2FAEnabled(userId);

    res.json({
      success: true,
      data: {
        enabled,
      },
    });
  } catch (error) {
    next(error);
  }
}


