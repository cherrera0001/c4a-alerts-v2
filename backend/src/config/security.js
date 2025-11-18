import helmet from "helmet";

/**
 * Configuración de Helmet con CSP restrictivo
 * Protege contra XSS, clickjacking, iframe embedding e inline scripts
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Permitir 'unsafe-inline' solo para desarrollo (Tailwind necesita esto en desarrollo)
      styleSrc: process.env.NODE_ENV === "production" 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'"],
      // Permitir scripts inline en desarrollo para la página de estado
      scriptSrc: ["'self'"].concat(
        process.env.NODE_ENV === "production" 
          ? [] 
          : ["'unsafe-eval'", "'unsafe-inline'"]
      ),
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Bloquear iframes
      frameAncestors: ["'none'"], // Prevenir clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true,
    force: process.env.NODE_ENV === "production",
  },
  noSniff: true, // Prevenir MIME type sniffing
  xssFilter: true, // Filtro XSS del navegador
  frameguard: { action: "deny" }, // Bloquear iframes
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

