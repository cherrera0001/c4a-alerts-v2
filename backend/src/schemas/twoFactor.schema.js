import { z } from "zod";

export const enable2FASchema = z.object({
  token: z
    .string({
      required_error: "Código 2FA es requerido",
      invalid_type_error: "Código 2FA debe ser una cadena de texto",
    })
    .length(6, { message: "El código 2FA debe tener 6 dígitos" })
    .regex(/^\d{6}$/, { message: "El código 2FA debe contener solo números" }),
}).strict();


