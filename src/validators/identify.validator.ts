import { z } from "zod";

export const identifySchema = z
  .object({
    email: z.string().email("Invalid email format").nullish(),
    phoneNumber: z
      .union([z.string(), z.number()])
      .transform((val) => (val != null ? String(val) : undefined))
      .nullish(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "At least one of email or phoneNumber is required",
  });

export type IdentifyInput = z.infer<typeof identifySchema>;
