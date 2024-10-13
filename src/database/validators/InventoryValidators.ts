import { ZodTypeAny, z } from "zod";
import { ItemTypes, Prisma } from "@prisma/client";
import { numberTypeZod, stringTypeZod } from "@utils/schemaHelpers";

type OmittedInventoriesCreateInputKeys =
  | "batch_order_id"
  | "product"
  | "id_seq"
  | "items_stock_in"
  | "sales"
  | "inventory_id"
  | "batch_orders"
  | "batch_order_details"
  | "sales_order_details"
  | "purchase_order_details"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

export const InventoriesInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.InventoriesCreateArgs["data"],
      OmittedInventoriesCreateInputKeys
    >,
    ZodTypeAny
  >
>({
  item_name: stringTypeZod("Item Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  item_measurement: numberTypeZod("Item Measurement", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  item_measurement_type: stringTypeZod("Item Measurement Type", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  item_type: z.optional(
    z.enum(Object.values(ItemTypes) as [string, ...string[]], {
      message: "Invalid Item Type",
    })
  ),
  item_description: z.optional(
    z.nullable(
      stringTypeZod("Item Description", {
        rejectLeadingSpace: true,
      })
    )
  ),
});
