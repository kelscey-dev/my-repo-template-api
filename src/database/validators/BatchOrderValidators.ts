import { ZodTypeAny, z } from "zod";
import { BatchOrderStatus, ItemStockOutStatus, Prisma } from "@prisma/client";
import { numberTypeZod, stringTypeZod } from "@utils/schemaHelpers";

type OmittedBatchOrdersCreateInputKeys =
  | "batch_order_id"
  | "product"
  | "id_seq"
  | "order_by"
  | "batch_order_history"
  | "items_stock_in"
  | "order_by_user_id"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

type OmittedBatchOrderDetailsCreateInputKeys =
  | "batch_order_id"
  | "batch_order_details_id"
  | "inventory"
  | "batch_order"
  | "id_seq"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

type OmittedItemsStockOutCreateInputKeys =
  | "batch_order_details_id"
  | "item_stock_out_id"
  | "item_stock_in"
  | "sales_details"
  | "sales_details_id"
  | "batch_order_details"
  | "id_seq"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

export const ItemsStockOutInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.ItemsStockOutCreateArgs["data"],
      OmittedItemsStockOutCreateInputKeys
    >,
    ZodTypeAny
  >
>({
  status: z.optional(
    z.enum(Object.values(ItemStockOutStatus) as [string, ...string[]], {
      message: "Item Stock Out Invalid Status",
    })
  ),
  quantity: numberTypeZod("Actual Production Cost Per Bottle", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  item_stock_in_id: stringTypeZod("Item Stock In ID", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
});

export const BatchOrderDetailsInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.BatchOrderDetailsCreateArgs["data"],
      OmittedBatchOrderDetailsCreateInputKeys
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
  inventory_id: stringTypeZod("Item Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  items_stock_out: z.array(ItemsStockOutInputValidator),
});

export const BatchOrderInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.BatchOrdersCreateArgs["data"],
      OmittedBatchOrdersCreateInputKeys
    >,
    ZodTypeAny
  >
>({
  inventory_id: stringTypeZod("Product Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  status: z.optional(
    z.enum(Object.values(BatchOrderStatus) as [string, ...string[]], {
      message: "Invalid Batch Order Status",
    })
  ),
  overall_batch_cost: numberTypeZod("Overall Batch Cost", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  planned_date: stringTypeZod("Planned Date", {
    type: "date",
  }),
  actual_date: z.optional(
    z.nullable(
      stringTypeZod("Actual Date", {
        type: "date",
      })
    )
  ),
  actual_estimated_cost_per_bottle: z.optional(
    z.nullable(
      numberTypeZod("Actual Estimated Cost Per Bottle", {
        rejectLeadingZero: true,
        rejectMin: {
          min: 1,
        },
      })
    )
  ),
  actual_production_quantity: z.optional(
    z.nullable(
      numberTypeZod("Actual Production Cost Per Bottle", {
        rejectLeadingZero: true,
        rejectMin: {
          min: 1,
        },
      })
    )
  ),
  batch_order_details: z.array(BatchOrderDetailsInputValidator),
  planned_production_quantity: numberTypeZod("Planned Production Quantity", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  planned_estimated_cost_per_bottle: numberTypeZod(
    "Planned Estimated Cost Per Bottle",
    {
      rejectLeadingZero: true,
      rejectMin: {
        min: 1,
      },
    }
  ),
  processing_start_date: z.optional(
    z.nullable(
      stringTypeZod("Process Start Date", {
        type: "date",
      })
    )
  ),
  processing_end_date: z.optional(
    z.nullable(
      stringTypeZod("Process End Date", {
        type: "date",
      })
    )
  ),
});
