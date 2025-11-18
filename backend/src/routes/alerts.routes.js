import express from "express";
import { authRequired } from "../middlewares/auth.middleware.js";
import { createAlertLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createAlertSchema,
  getAlertsQuerySchema,
} from "../schemas/alerts.schema.js";
import * as alertsController from "../controllers/alerts.controller.js";

const router = express.Router();

router.get(
  "/",
  authRequired,
  validate({ query: getAlertsQuerySchema }),
  alertsController.getAlerts
);

router.post(
  "/",
  authRequired,
  createAlertLimiter,
  validate({ body: createAlertSchema }),
  alertsController.createAlert
);

export default router;
