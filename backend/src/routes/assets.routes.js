import express from "express";
import { authRequired } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createAssetSchema,
  updateAssetSchema,
  assetIdParamSchema,
} from "../schemas/assets.schema.js";
import * as assetsController from "../controllers/assets.controller.js";

const router = express.Router();

router.use(authRequired);

router.get("/", assetsController.getAssets);
router.get("/:id", validate({ params: assetIdParamSchema }), assetsController.getAssetById);
router.post("/", validate({ body: createAssetSchema }), assetsController.createAsset);
router.put("/:id", validate({ params: assetIdParamSchema, body: updateAssetSchema }), assetsController.updateAsset);
router.delete("/:id", validate({ params: assetIdParamSchema }), assetsController.deleteAsset);

export default router;
