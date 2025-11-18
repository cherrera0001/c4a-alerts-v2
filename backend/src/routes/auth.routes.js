import express from "express";
import { authRequired } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../schemas/auth.schema.js";
import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.get("/me", authRequired, authController.getProfile);
router.patch("/profile", authRequired, validateBody(updateProfileSchema), authController.updateProfile);
router.post("/change-password", authRequired, validateBody(changePasswordSchema), authController.changePassword);

export default router;
