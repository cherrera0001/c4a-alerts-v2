import * as authService from "../services/auth.service.js";

export async function register(req, res, next) {
  try {
    const { email, password, name, role, organizationId, whatsapp } = req.body;
    
    const user = await authService.createUser({
      email,
      password,
      name,
      role,
      organizationId,
      whatsapp,
    });

    const { signToken } = await import("../utils/jwt.js");
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    const result = await authService.loginUser(email, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const updateData = req.body;
    
    const updatedUser = await authService.updateUserProfile(userId, updateData);

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    await authService.changeUserPassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error) {
    next(error);
  }
}
