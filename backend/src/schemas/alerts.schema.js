import { z } from "zod";

const ipAddressRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
// URL regex (definido pero no usado actualmente - puede usarse en el futuro)
const urlRegex = /^https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?$/i;
const cveIdRegex = /^CVE-\d{4}-\d{4,}$/;

const alertMetadataSchema = z.object({
  ip: z
    .string()
    .regex(ipAddressRegex, { message: "Dirección IP inválida (IPv4 o IPv6)" })
    .optional(),
  userAgent: z
    .string()
    .max(500, { message: "User agent no puede exceder 500 caracteres" })
    .optional(),
  origin: z
    .string()
    .url({ message: "Origen debe ser una URL válida" })
    .max(2000, { message: "URL de origen no puede exceder 2000 caracteres" })
    .optional(),
  extra: z.record(z.any()).optional(),
}).strict().optional();

export const createAlertSchema = z.object({
  assetId: z.string().min(1, { message: "assetId es requerido" }).optional(),
  type: z.enum(["INFO", "WARNING", "CRITICAL"]).default("INFO"),
  title: z
    .string({
      required_error: "El título es requerido",
      invalid_type_error: "El título debe ser una cadena de texto",
    })
    .min(1, { message: "El título es requerido" })
    .max(500, { message: "El título no puede exceder 500 caracteres" })
    .trim(),
  description: z
    .string({
      invalid_type_error: "La descripción debe ser una cadena de texto",
    })
    .max(10000, { message: "La descripción no puede exceder 10000 caracteres" })
    .trim()
    .optional()
    .default(""),
  source: z.enum(["CTI_FEED", "INTERNAL_LOG", "MANUAL", "OTHER"]).default("MANUAL"),
  cveIds: z
    .array(
      z.string().regex(cveIdRegex, { message: "Formato CVE inválido (ej: CVE-2024-1234)" })
    )
    .max(50, { message: "No se pueden tener más de 50 CVE IDs" })
    .default([])
    .optional(),
  tactics: z
    .array(z.string())
    .max(50, { message: "No se pueden tener más de 50 tácticas" })
    .default([])
    .optional(),
  metadata: alertMetadataSchema.default({}),
}).strict();

export const updateAlertSchema = z.object({
  assetId: z.string().min(1).optional(),
  type: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  title: z
    .string()
    .min(1, { message: "El título no puede estar vacío" })
    .max(500, { message: "El título no puede exceder 500 caracteres" })
    .trim()
    .optional(),
  description: z
    .string()
    .max(10000, { message: "La descripción no puede exceder 10000 caracteres" })
    .trim()
    .optional(),
  source: z.enum(["CTI_FEED", "INTERNAL_LOG", "MANUAL", "OTHER"]).optional(),
  cveIds: z
    .array(
      z.string().regex(cveIdRegex, { message: "Formato CVE inválido (ej: CVE-2024-1234)" })
    )
    .max(50, { message: "No se pueden tener más de 50 CVE IDs" })
    .optional(),
  tactics: z
    .array(z.string())
    .max(50, { message: "No se pueden tener más de 50 tácticas" })
    .optional(),
  metadata: alertMetadataSchema.optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debe proporcionar al menos un campo para actualizar" }
);

export const getAlertsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, { message: "Limit debe ser un número" })
    .transform(Number)
    .pipe(z.number().int().min(1, { message: "Limit debe ser mayor que 0" }).max(100, { message: "Limit no puede exceder 100" }))
    .optional()
    .default("20"),
  startAfter: z
    .string()
    .min(1, { message: "startAfter no puede estar vacío" })
    .max(100, { message: "startAfter no puede exceder 100 caracteres" })
    .optional(),
  assetId: z.string().optional(),
  type: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  orderBy: z
    .string()
    .default("createdAt")
    .refine(
      (val) => ["createdAt", "updatedAt", "type", "title"].includes(val),
      { message: "orderBy debe ser uno de: createdAt, updatedAt, type, title" }
    )
    .optional(),
  orderDirection: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "orderDirection debe ser 'asc' o 'desc'" }),
    })
    .default("desc")
    .optional(),
});

export const alertIdParamSchema = z.object({
  id: z
    .string({
      required_error: "El ID de la alerta es requerido",
      invalid_type_error: "El ID debe ser una cadena de texto",
    })
    .min(1, { message: "El ID de la alerta no puede estar vacío" })
    .max(100, { message: "El ID no puede exceder 100 caracteres" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "El ID contiene caracteres inválidos" }),
});
