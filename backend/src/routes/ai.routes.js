import express from "express";
import { authRequired } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import * as aiController from "../controllers/ai.controller.js";
import { z } from "zod";

const router = express.Router();

// Todos los endpoints requieren autenticación
router.use(authRequired);

// Esquemas de validación
const enrichSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const predictImpactSchema = z.object({
  body: z.object({
    ctiItemId: z.string().min(1),
    organizationId: z.string().min(1),
  }),
});

const recommendMitigationsSchema = z.object({
  body: z.object({
    ctiItemId: z.string().min(1),
    assetId: z.string().optional(),
  }),
});

const triggerIngestionSchema = z.object({
  body: z.object({
    sources: z.array(z.enum(["misp", "nvd", "rss"])).optional(),
    options: z.object({}).optional(),
  }),
});

const generateReportSchema = z.object({
  body: z.object({
    type: z.enum(["executive", "technical", "threat_landscape"]),
    organizationId: z.string().optional(),
    userId: z.string().optional(),
    period: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional(),
  }),
});

// Endpoints de IA - Solo analistas y admins
router.post(
  "/enrich/:id",
  authorize(["admin", "analyst"]),
  validate(enrichSchema),
  aiController.enrichCtiWithAI
);

router.post(
  "/predict/impact",
  authorize(["admin", "analyst"]),
  validate(predictImpactSchema),
  aiController.predictImpact
);

router.post(
  "/recommend/mitigations",
  authorize(["admin", "analyst"]),
  validate(recommendMitigationsSchema),
  aiController.recommendMitigations
);

// Endpoints de agentes - Solo admins
router.get(
  "/agents/status",
  authorize(["admin"]),
  aiController.getAgentsStatus
);

router.post(
  "/agents/ingest",
  authorize(["admin"]),
  validate(triggerIngestionSchema),
  aiController.triggerIngestion
);

router.post(
  "/agents/report",
  authorize(["admin", "analyst"]),
  validate(generateReportSchema),
  aiController.generateReport
);

export default router;

