import { z } from "zod";

export const createAssetSchema = z.object({
  name: z
    .string({
      required_error: "El nombre es requerido",
      invalid_type_error: "El nombre debe ser una cadena de texto",
    })
    .min(1, { message: "El nombre es requerido" })
    .max(200, { message: "El nombre no puede exceder 200 caracteres" })
    .trim(),
  type: z.enum(["API", "WEB", "APP", "NETWORK", "OTHER"], {
    errorMap: () => ({ message: "El tipo debe ser: API, WEB, APP, NETWORK u OTHER" }),
  }),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    errorMap: () => ({ message: "La criticidad debe ser: LOW, MEDIUM, HIGH o CRITICAL" }),
  }),
  tags: z
    .array(z.string().min(1).max(50))
    .max(50, { message: "No se pueden tener más de 50 tags" })
    .default([])
    .optional(),
  metadata: z.record(z.any()).default({}).optional(),
}).strict();

export const updateAssetSchema = z.object({
  name: z
    .string()
    .min(1, { message: "El nombre no puede estar vacío" })
    .max(200, { message: "El nombre no puede exceder 200 caracteres" })
    .trim()
    .optional(),
  type: z.enum(["API", "WEB", "APP", "NETWORK", "OTHER"]).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(50, { message: "No se pueden tener más de 50 tags" })
    .optional(),
  metadata: z.record(z.any()).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debe proporcionar al menos un campo para actualizar" }
);

export const assetIdParamSchema = z.object({
  id: z
    .string({
      required_error: "El ID del activo es requerido",
      invalid_type_error: "El ID debe ser una cadena de texto",
    })
    .min(1, { message: "El ID del activo no puede estar vacío" })
    .max(100, { message: "El ID no puede exceder 100 caracteres" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "El ID contiene caracteres inválidos" }),
});

