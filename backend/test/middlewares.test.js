import { describe, it, expect, beforeEach, afterEach } from "node:test";
import { sanitizeString, sanitizeObject } from "../src/middlewares/sanitize.middleware.js";

describe("Middlewares - Sanitización", () => {
  describe("sanitizeString", () => {
    it("debe sanitizar HTML malicioso", () => {
      const malicious = '<script>alert("XSS")</script>Hola';
      const sanitized = sanitizeString(malicious);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toContain("Hola");
    });

    it("debe sanitizar atributos peligrosos", () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeString(malicious);
      expect(sanitized).not.toContain("onerror");
    });

    it("debe preservar strings limpios", () => {
      const clean = "Texto limpio sin HTML";
      const sanitized = sanitizeString(clean);
      expect(sanitized).toBe(clean);
    });

    it("debe limpiar caracteres de control", () => {
      const withControl = "Texto\x00con\x1Fcontrol";
      const sanitized = sanitizeString(withControl);
      expect(sanitized).not.toContain("\x00");
      expect(sanitized).not.toContain("\x1F");
    });
  });

  describe("sanitizeObject", () => {
    it("debe sanitizar strings en objetos", () => {
      const obj = {
        title: '<script>alert("XSS")</script>Título',
        description: "Descripción limpia",
        metadata: {
          value: '<iframe src="evil.com"></iframe>',
        },
      };

      const sanitized = sanitizeObject(obj);
      expect(sanitized.title).not.toContain("<script>");
      expect(sanitized.description).toBe("Descripción limpia");
      expect(sanitized.metadata.value).not.toContain("<iframe>");
    });

    it("debe sanitizar arrays", () => {
      const arr = [
        '<script>malicious</script>',
        "limpio",
        '<img onerror="alert(1)">',
      ];

      const sanitized = sanitizeObject(arr);
      expect(sanitized[0]).not.toContain("<script>");
      expect(sanitized[1]).toBe("limpio");
      expect(sanitized[2]).not.toContain("onerror");
    });

    it("debe preservar números y booleanos", () => {
      const obj = {
        count: 42,
        active: true,
        price: 99.99,
      };

      const sanitized = sanitizeObject(obj);
      expect(sanitized.count).toBe(42);
      expect(sanitized.active).toBe(true);
      expect(sanitized.price).toBe(99.99);
    });

    it("debe limitar profundidad de recursión", () => {
      let deepObj = { value: "test" };
      for (let i = 0; i < 25; i++) {
        deepObj = { nested: deepObj };
      }

      const sanitized = sanitizeObject(deepObj);
      // Debe manejar la profundidad sin errores
      expect(sanitized).toBeDefined();
    });
  });
});

