import express from "express";
import { logger } from "../utils/logger.js";
import { getConfigSummary } from "../config/env.js";

const router = express.Router();

const startTime = Date.now();

router.get("/", (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const configSummary = getConfigSummary();
  
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime,
    config: configSummary,
  });
});

export default router;

