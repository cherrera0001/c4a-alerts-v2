import { z } from "zod";

const cveIdRegex = /^CVE-\d{4}-\d{4,}$/;
const cweIdRegex = /^CWE-\d+$/;

export const createCtiItemSchema = z.object({
  source: z.enum(["MISP", "NVD", "RSS", "MANUAL", "OTHER"], {
    errorMap: () => ({ message: "La fuente debe ser: MISP, NVD, RSS, MANUAL u OTHER" }),
  }),
  title: z
    .string({
      required_error: "El título es requerido",
      invalid_type_error: "El título debe ser una cadena de texto",
    })
    .min(1, { message: "El título es requerido" })
    .max(500, { message: "El título no puede exceder 500 caracteres" })
    .trim(),
  summary: z
    .string()
    .max(10000, { message: "El resumen no puede exceder 10000 caracteres" })
    .trim()
    .optional()
    .default(""),
  cveIds: z
    .array(
      z.string().regex(cveIdRegex, { message: "Formato CVE inválido (ej: CVE-2024-1234)" })
    )
    .max(50, { message: "No se pueden tener más de 50 CVE IDs" })
    .default([])
    .optional(),
  cwes: z
    .array(
      z.string().regex(cweIdRegex, { message: "Formato CWE inválido (ej: CWE-79)" })
    )
    .max(50, { message: "No se pueden tener más de 50 CWEs" })
    .default([])
    .optional(),
  actors: z
    .array(z.string().max(100))
    .max(50, { message: "No se pueden tener más de 50 actores" })
    .default([])
    .optional(),
  sector: z
    .array(z.string().max(100))
    .max(50, { message: "No se pueden tener más de 50 sectores" })
    .default([])
    .optional(),
  regions: z
    .array(z.string().max(100))
    .max(50, { message: "No se pueden tener más de 50 regiones" })
    .default([])
    .optional(),
  references: z
    .array(z.string().url().max(2000))
    .max(50, { message: "No se pueden tener más de 50 referencias" })
    .default([])
    .optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  publishedAt: z.string().datetime().optional().nullable(),
}).strict();

export const getCtiItemsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, { message: "Limit debe ser un número" })
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default("20"),
  startAfter: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  source: z.enum(["MISP", "NVD", "RSS", "MANUAL", "OTHER"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  orderBy: z
    .string()
    .default("publishedAt")
    .refine(
      (val) => ["publishedAt", "ingestedAt", "severity", "title"].includes(val),
      { message: "orderBy debe ser uno de: publishedAt, ingestedAt, severity, title" }
    )
    .optional(),
  orderDirection: z
    .enum(["asc", "desc"])
    .default("desc")
    .optional(),
});

export const ctiItemIdParamSchema = z.object({
  id: z
    .string({
      required_error: "El ID del item CTI es requerido",
      invalid_type_error: "El ID debe ser una cadena de texto",
    })
    .min(1, { message: "El ID del item CTI no puede estar vacío" })
    .max(100, { message: "El ID no puede exceder 100 caracteres" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "El ID contiene caracteres inválidos" }),
});

