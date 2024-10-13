import { ZodTypeAny, z } from "zod";
import {
  SalesStatus,
  ItemStockOutStatus,
  Prisma,
  SalesTypes,
} from "@prisma/client";
import { numberTypeZod, stringTypeZod } from "@utils/schemaHelpers";

type OmittedSalesCreateInputKeys =
  | "sales_id"
  | "created_by"
  | "created_by_user_id"
  | "id_seq"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

type OmittedSalesDetailsCreateInputKeys =
  | "sales_details_id"
  | "cost"
  | "sales"
  | "inventory"
  | "sales_id"
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
  quantity: numberTypeZod("Quantity", {
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

export const SalesDetailsInputValidator = z.object<
  Record<
    keyof Omit<
      Prisma.SalesDetailsCreateArgs["data"],
      OmittedSalesDetailsCreateInputKeys
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
  amount: numberTypeZod("Amount", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  items_stock_out: z.array(ItemsStockOutInputValidator),
});

export const SalesInputValidator = z.object<
  Record<
    keyof Omit<Prisma.SalesCreateArgs["data"], OmittedSalesCreateInputKeys>,
    ZodTypeAny
  >
>({
  seller_name: stringTypeZod("Supplier Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
  }),
  status: z.optional(
    z.enum(Object.values(SalesStatus) as [string, ...string[]], {
      message: "Invalid Sales Status",
    })
  ),
  sales_type: z.enum(Object.values(SalesTypes) as [string, ...string[]], {
    message: "Invalid Sales Type",
  }),
  overall_sales_cost: numberTypeZod("Overall Sales Cost", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  overall_sales_amount: numberTypeZod("Overall Sales Amount", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  total_profit: numberTypeZod("Total Profit", {
    rejectLeadingZero: true,
    rejectMin: {
      min: 1,
    },
  }),
  sales_date: stringTypeZod("Sales Date", {
    type: "date",
  }),
  sales_details: z.array(SalesDetailsInputValidator),
  notes: z.optional(
    z.nullable(
      stringTypeZod("Notes", {
        rejectLeadingSpace: true,
      })
    )
  ),
});
