import express from "express";
import { authRequired } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCtiItemSchema,
  getCtiItemsQuerySchema,
  ctiItemIdParamSchema,
} from "../schemas/cti.schema.js";
import * as ctiController from "../controllers/cti.controller.js";

const router = express.Router();

router.use(authRequired);

router.post("/items", validate({ body: createCtiItemSchema }), ctiController.createCtiItem);
router.get("/items", validate({ query: getCtiItemsQuerySchema }), ctiController.getCtiItems);
router.post("/items/:id/enrich", validate({ params: ctiItemIdParamSchema }), ctiController.enrichCtiItem);

export default router;
