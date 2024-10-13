import { z } from "zod";

export const SharedOptionalParametersValidator = z.object({
  page: z.optional(
    z.string().refine((val) => !isNaN(Number(val)), {
      message: "Page must be valid number",
    })
  ),
  take: z.optional(
    z.string().refine((val) => !isNaN(Number(val)), {
      message: "Take must be valid number",
    })
  ),
  exlude_ids: z.optional(z.array(z.string())),
  include_ids: z.optional(z.array(z.string())),
  created_at_start: z.optional(z.string().datetime()),
  created_at_end: z.optional(z.string().datetime()),
});
