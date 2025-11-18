import { z } from "zod";

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Error de validación",
          details: formatZodError(error),
        });
      }
      return res.status(500).json({
        success: false,
        error: "Error interno de validación",
      });
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Error de validación en parámetros de consulta",
          details: formatZodError(error),
        });
      }
      return res.status(500).json({
        success: false,
        error: "Error interno de validación",
      });
    }
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Error de validación en parámetros de ruta",
          details: formatZodError(error),
        });
      }
      return res.status(500).json({
        success: false,
        error: "Error interno de validación",
      });
    }
  };
}

export function validate({ body, query, params }) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Error de validación",
          details: formatZodError(error),
        });
      }
      return res.status(500).json({
        success: false,
        error: "Error interno de validación",
      });
    }
  };
}

function formatZodError(error) {
  return error.errors.map((err) => ({
    field: err.path.join(".") || "root",
    message: err.message,
    code: err.code,
  }));
}
