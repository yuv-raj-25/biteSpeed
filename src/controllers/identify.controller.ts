import { Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/identity.service";
import { identifySchema } from "../validators/identify.validator";
import { asyncHandler } from "../utility/asyncHandler";

export const identify = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const parsed = identifySchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      details: parsed.error.issues.map((e) => ({
        field: e.path.join(".") || "body",
        message: e.message,
      })),
    });
    return;
  }

  const { email, phoneNumber } = parsed.data;
  const phone = phoneNumber != null ? String(phoneNumber) : undefined;
  const result = await identifyContact(email ?? undefined, phone);

  res.status(200).json(result);
});