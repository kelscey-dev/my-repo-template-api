import { ZodTypeAny, z } from "zod";
import { ItemTypes, Prisma } from "@prisma/client";
import { numberTypeZod, stringTypeZod } from "@utils/schemaHelpers";

type OmittedSuppliersCreateInputKeys =
  | "supplier_id"
  | "purchase_orders"
  | "id_seq"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

export const SuppliersInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.SuppliersCreateArgs["data"],
      OmittedSuppliersCreateInputKeys
    >,
    ZodTypeAny
  >
>({
  supplier_name: stringTypeZod("Supplier Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  supplier_address: z.optional(
    z.nullable(
      stringTypeZod("Supplier Address", {
        rejectLeadingSpace: true,
      })
    )
  ),
  contact_name: stringTypeZod("Contact Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  contact_no: stringTypeZod("Contact Number", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
    type: "mobile_number",
  }),
  contact_email: z.optional(
    z.nullable(
      stringTypeZod("Contact Email", {
        rejectLeadingSpace: true,
        type: "email",
      })
    )
  ),
});
