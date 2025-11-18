import { describe, it, expect } from "node:test";
import { createAlertSchema, updateAlertSchema, getAlertsQuerySchema } from "../src/schemas/alerts.schema.js";
import { registerSchema, loginSchema } from "../src/schemas/auth.schema.js";

describe("Schemas - Validación Zod", () => {
  describe("alerts.schema.js", () => {
    describe("createAlertSchema", () => {
      it("debe validar una alerta válida", () => {
        const validAlert = {
          title: "CVE-2024-1234: Vulnerabilidad crítica",
          description: "Descripción de la vulnerabilidad",
          type: "CRITICAL",
          source: "CTI_FEED",
          cveIds: ["CVE-2024-1234"],
          tactics: ["T1190"],
        };

        expect(() => createAlertSchema.parse(validAlert)).not.toThrow();
      });

      it("debe rechazar una alerta sin título", () => {
        const invalidAlert = {
          description: "Sin título",
        };

        expect(() => createAlertSchema.parse(invalidAlert)).toThrow();
      });

      it("debe rechazar un título demasiado largo", () => {
        const invalidAlert = {
          title: "A".repeat(501), // Máximo 500 caracteres
        };

        expect(() => createAlertSchema.parse(invalidAlert)).toThrow();
      });

      it("debe rechazar CVE IDs inválidos", () => {
        const invalidAlert = {
          title: "Alerta válida",
          cveIds: ["INVALID-CVE", "CVE-2024-1234"],
        };

        expect(() => createAlertSchema.parse(invalidAlert)).toThrow();
      });

      it("debe rechazar tipos inválidos", () => {
        const invalidAlert = {
          title: "Alerta válida",
          type: "INVALID_TYPE",
        };

        expect(() => createAlertSchema.parse(invalidAlert)).toThrow();
      });
    });

    describe("updateAlertSchema", () => {
      it("debe validar una actualización parcial", () => {
        const update = {
          title: "Nuevo título",
        };

        expect(() => updateAlertSchema.parse(update)).not.toThrow();
      });

      it("debe rechazar una actualización vacía", () => {
        const emptyUpdate = {};

        expect(() => updateAlertSchema.parse(emptyUpdate)).toThrow();
      });
    });

    describe("getAlertsQuerySchema", () => {
      it("debe validar query params válidos", () => {
        const validQuery = {
          limit: "20",
          orderBy: "createdAt",
          orderDirection: "desc",
        };

        expect(() => getAlertsQuerySchema.parse(validQuery)).not.toThrow();
      });

      it("debe rechazar limit inválido", () => {
        const invalidQuery = {
          limit: "invalid",
        };

        expect(() => getAlertsQuerySchema.parse(invalidQuery)).toThrow();
      });

      it("debe rechazar limit mayor a 100", () => {
        const invalidQuery = {
          limit: "101",
        };

        expect(() => getAlertsQuerySchema.parse(invalidQuery)).toThrow();
      });
    });
  });

  describe("auth.schema.js", () => {
    describe("registerSchema", () => {
      it("debe validar registro válido", () => {
        const validRegister = {
          email: "test@example.com",
          password: "SecurePassword123!",
          name: "Test User",
        };

        expect(() => registerSchema.parse(validRegister)).not.toThrow();
      });

      it("debe rechazar email inválido", () => {
        const invalidRegister = {
          email: "invalid-email",
          password: "SecurePassword123!",
          name: "Test User",
        };

        expect(() => registerSchema.parse(invalidRegister)).toThrow();
      });

      it("debe rechazar contraseña demasiado corta", () => {
        const invalidRegister = {
          email: "test@example.com",
          password: "short",
          name: "Test User",
        };

        expect(() => registerSchema.parse(invalidRegister)).toThrow();
      });
    });

    describe("loginSchema", () => {
      it("debe validar login válido", () => {
        const validLogin = {
          email: "test@example.com",
          password: "SecurePassword123!",
        };

        expect(() => loginSchema.parse(validLogin)).not.toThrow();
      });

      it("debe rechazar login sin email", () => {
        const invalidLogin = {
          password: "SecurePassword123!",
        };

        expect(() => loginSchema.parse(invalidLogin)).toThrow();
      });
    });
  });
});

