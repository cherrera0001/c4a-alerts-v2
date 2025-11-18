import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { helmetConfig } from "./security.js";
import { corsConfig } from "./cors.js";
import { generalLimiter } from "../middlewares/rateLimit.js";
import { sanitizeBody } from "../middlewares/sanitize.middleware.js";
import { errorHandler } from "../middlewares/errorHandler.js";

import authRoutes from "../routes/auth.routes.js";
import alertsRoutes from "../routes/alerts.routes.js";
import assetsRoutes from "../routes/assets.routes.js";
import ctiRoutes from "../routes/cti.routes.js";
import aiRoutes from "../routes/ai.routes.js";
import healthRoutes from "../routes/health.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(helmetConfig);
app.use(corsConfig);
app.use(generalLimiter);
app.use(sanitizeBody);

app.use(express.static(path.join(__dirname, "../../public")));

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/favicon.svg"));
});

app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/cti", ctiRoutes);
app.use("/api/ai", aiRoutes);
app.use("/health", healthRoutes);

app.use(errorHandler);

export default app;
