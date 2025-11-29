import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;
const passwordMaxLength = 128;

export const registerSchema = z.object({
  email: z
    .string({
      required_error: "Email es requerido",
      invalid_type_error: "Email debe ser una cadena de texto",
    })
    .email({ message: "Email inválido" })
    .regex(emailRegex, { message: "Formato de email inválido" })
    .max(255, { message: "Email no puede exceder 255 caracteres" })
    .toLowerCase()
    .trim(),
  password: z
    .string({
      required_error: "Contraseña es requerida",
      invalid_type_error: "Contraseña debe ser una cadena de texto",
    })
    .min(passwordMinLength, {
      message: `Contraseña debe tener al menos ${passwordMinLength} caracteres`,
    })
    .max(passwordMaxLength, {
      message: `Contraseña no puede exceder ${passwordMaxLength} caracteres`,
    })
    .regex(/[a-z]/, { message: "Contraseña debe contener al menos una letra minúscula" })
    .regex(/[A-Z]/, { message: "Contraseña debe contener al menos una letra mayúscula" })
    .regex(/[0-9]/, { message: "Contraseña debe contener al menos un número" })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Contraseña debe contener al menos un carácter especial",
    }),
  name: z
    .string({
      required_error: "Nombre es requerido",
      invalid_type_error: "Nombre debe ser una cadena de texto",
    })
    .min(2, { message: "Nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "Nombre no puede exceder 100 caracteres" })
    .trim(),
  role: z.enum(["admin", "analyst", "viewer"]).default("viewer").optional(),
  organizationId: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
}).strict();

export const loginSchema = z.object({
  email: z
    .string({
      required_error: "Email es requerido",
      invalid_type_error: "Email debe ser una cadena de texto",
    })
    .email({ message: "Email inválido" })
    .max(255, { message: "Email no puede exceder 255 caracteres" })
    .toLowerCase()
    .trim(),
  password: z
    .string({
      required_error: "Contraseña es requerida",
      invalid_type_error: "Contraseña debe ser una cadena de texto",
    })
    .min(1, { message: "Contraseña es requerida" }),
  twoFactorCode: z
    .string()
    .length(6, { message: "El código 2FA debe tener 6 dígitos" })
    .regex(/^\d{6}$/, { message: "El código 2FA debe contener solo números" })
    .optional(),
}).strict();

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "Nombre no puede exceder 100 caracteres" })
    .trim()
    .optional(),
  email: z
    .string()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email no puede exceder 255 caracteres" })
    .toLowerCase()
    .trim()
    .optional(),
  whatsapp: z.string().optional().nullable(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debe proporcionar al menos un campo para actualizar" }
);

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: "Contraseña actual es requerida",
    })
    .min(1, { message: "Contraseña actual es requerida" }),
  newPassword: z
    .string({
      required_error: "Nueva contraseña es requerida",
      invalid_type_error: "Nueva contraseña debe ser una cadena de texto",
    })
    .min(passwordMinLength, {
      message: `Nueva contraseña debe tener al menos ${passwordMinLength} caracteres`,
    })
    .max(passwordMaxLength, {
      message: `Nueva contraseña no puede exceder ${passwordMaxLength} caracteres`,
    })
    .regex(/[a-z]/, { message: "Nueva contraseña debe contener al menos una letra minúscula" })
    .regex(/[A-Z]/, { message: "Nueva contraseña debe contener al menos una letra mayúscula" })
    .regex(/[0-9]/, { message: "Nueva contraseña debe contener al menos un número" })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Nueva contraseña debe contener al menos un carácter especial",
    }),
}).strict().refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "La nueva contraseña debe ser diferente de la contraseña actual",
    path: ["newPassword"],
  }
);
