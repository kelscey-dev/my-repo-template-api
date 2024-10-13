import { ZodTypeAny, z } from "zod";
import { PurchaseOrderStatus, Prisma } from "@prisma/client";
import { numberTypeZod, stringTypeZod } from "@utils/schemaHelpers";

type OmittedPurchaseOrdersCreateInputKeys =
  | "purchase_order_id"
  | "supplier"
  | "order_by"
  | "purchase_order_history"
  | "order_by_user_id"
  | "id_seq"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

type OmittedPurchaseOrderDetailsCreateInputKeys =
  | "purchase_order_id"
  | "purchase_order_details_id"
  | "inventory"
  | "purchase_order"
  | "items_stock_in"
  | "id_seq"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

export const PurchaseOrderDetailsInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.PurchaseOrderDetailsCreateArgs["data"],
      OmittedPurchaseOrderDetailsCreateInputKeys
    >,
    ZodTypeAny
  >
>({
  quantity: numberTypeZod("Quantity", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  cost: numberTypeZod("Cost", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  inventory_id: stringTypeZod("Item Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
});

export const PurchaseOrdersInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.PurchaseOrdersCreateArgs["data"],
      OmittedPurchaseOrdersCreateInputKeys
    >,
    ZodTypeAny
  >
>({
  supplier_id: stringTypeZod("Supplier Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  status: z.optional(
    z.enum(Object.values(PurchaseOrderStatus) as [string, ...string[]], {
      message: "Invalid Purchase Order Status",
    })
  ),
  overall_purchase_cost: numberTypeZod("Overall Purchase Cost", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  order_date: z.optional(
    z.nullable(
      stringTypeZod("Order Date", {
        type: "date",
      })
    )
  ),
  purchase_order_details: z.array(PurchaseOrderDetailsInputValidator),
});
