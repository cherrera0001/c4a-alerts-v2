import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    return process.env.NODE_ENV === "development";
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Demasiados intentos de autenticación, intenta de nuevo más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const createAlertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Demasiadas alertas creadas, intenta de nuevo más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
