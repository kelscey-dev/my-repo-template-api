import express, { Request, Response, NextFunction } from "express";

import moment from "moment";

import prisma from "@database";

import { InventoriesInputValidator } from "@database/validators/InventoryValidators";
import { SharedOptionalParametersValidator } from "@database/validators/SharedValidators";
import { Authenticate, RoleChecker } from "@middleware/authMiddleware";
import {
  validateData,
  validateQueryParameters,
} from "@middleware/dataValidator";
import { ActionTypes, ItemTypes, Prisma } from "@prisma/client";
import { Sql } from "@prisma/client/runtime/library";
import {
  CreateActivityLog,
  deepDiff,
  pageSkipper,
  whereClauseBuilder,
} from "@utils/prismaHelpers";
import ErrorHandler, {
  CustomError,
  CustomSuccess,
} from "@utils/responseHandler";

let router = express.Router();

router.get(
  "/",
  validateQueryParameters(SharedOptionalParametersValidator),
  RoleChecker(["superadmin", "admin"]),
  async (req: Request, res: Response) => {
    try {
      let {
        search = "",
        page = 1,
        take = 5,
        include_ids,
        created_at_start,
        created_at_end,
      } = req.query;

      if (created_at_start) {
        moment(created_at_start as string)
          .startOf("day")
          .toISOString();
      }

      if (created_at_end) {
        moment(created_at_end as string)
          .startOf("day")
          .toISOString();
      }

      let queryCondition = whereClauseBuilder([
        {
          value: `i.created_at BETWEEN ${created_at_start} AND ${created_at_end}`,
          checker: created_at_start && (created_at_end as string),
        },
        {
          value: `(i.item_name iLIKE '%${search}%' OR i.item_type iLIKE '%${search}%')`,
          checker: search as string,
        },
      ]);

      const inventoriesCount: { count: number }[] =
        await prisma.$queryRaw(Prisma.sql`
        SELECT COUNT(i.inventory_id)::integer
        FROM "Inventories" i
        ${queryCondition}
      `);

      const inventories = await prisma.$queryRaw(Prisma.sql`
      SELECT
        i.*,
        'IT-' || LPAD(CAST(i.id_seq AS TEXT), 6, '0') AS custom_id,
        json_build_object(
          'remaining_quantity', (COALESCE(isi.total_quantity_in, 0) - COALESCE(iso.total_quantity_out, 0)),
          'remaining_cost', (COALESCE(isi.total_cost_in, 0) - COALESCE(iso.total_cost_out, 0))
        ) AS remaining_stocks,
        jsonb_build_object(
          'quantity', COALESCE(isi.total_quantity_in, 0),
          'total_cost', COALESCE(isi.total_cost_in, 0)
        ) AS total_stock_in,
        jsonb_build_object(
          'quantity', COALESCE(iso.total_quantity_out, 0),
          'total_cost', COALESCE(iso.total_cost_out, 0)
        ) AS total_stock_out
      FROM
        "Inventories" i
      LEFT JOIN (
        SELECT
          inventory_id,
          COALESCE(SUM(cost * quantity), 0) AS total_cost_in,
          SUM(quantity) AS total_quantity_in
        FROM
          "ItemsStockIn"
        GROUP BY
          inventory_id
      ) isi ON i.inventory_id = isi.inventory_id
      LEFT JOIN (
        SELECT
          isi.inventory_id,
          SUM(iso.quantity) AS total_quantity_out,
          COALESCE(SUM(iso.quantity * isi.cost), 0) AS total_cost_out
        FROM
          "ItemsStockOut" iso
        JOIN
          "ItemsStockIn" isi ON iso.item_stock_in_id = isi.item_stock_in_id
        GROUP BY
          isi.inventory_id
      ) iso ON i.inventory_id = iso.inventory_id
      ${queryCondition}
      ORDER BY
        i.id_seq DESC
      LIMIT
        ${Prisma.raw(`${take}`)}
      OFFSET
        ${Prisma.raw(`${pageSkipper(Number(page), Number(take))}`)};
    `);

      return res.json({
        count: inventoriesCount[0].count,
        results: inventories,
      });
    } catch (err) {
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.get(
  "/selection",
  validateQueryParameters(SharedOptionalParametersValidator),
  RoleChecker(["superadmin", "admin"]),
  async (req: Request, res: Response) => {
    try {
      const {
        search = "",
        page = 1,
        take = 5,
        include_ids,
        exclude_ids,
        item_type,
      } = req.query;

      const queryConditions: Prisma.InventoriesWhereInput = {
        AND: [
          {
            inventory_id: include_ids ? { in: include_ids as [] } : undefined,
          },
          {
            inventory_id: exclude_ids
              ? { notIn: exclude_ids as [] }
              : undefined,
          },
        ],
        item_type: item_type as ItemTypes,
        OR: [
          {
            item_name: {
              contains: `${search}`,
              mode: "insensitive",
            },
          },
        ],
      };

      let inventoriesCount = await prisma.inventories.count({
        where: queryConditions,
      });
      let inventories = await prisma.inventories.findMany({
        where: {
          ...queryConditions,
        },
        select: {
          inventory_id: true,
          complete_item_name: true,
        },
        orderBy: {
          id_seq: "desc",
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      const adjustedResult = inventories.map(
        ({ inventory_id, complete_item_name, ...rest }) => {
          return {
            ...rest,
            value: inventory_id,
            label: complete_item_name,
          };
        }
      );

      return res.json({
        count: inventoriesCount,
        results: adjustedResult,
      });
    } catch (err) {
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.get(
  "/inventory-transaction/:inventory_id",
  validateQueryParameters(SharedOptionalParametersValidator),
  RoleChecker(["superadmin", "admin"]),
  async (req: Request, res: Response) => {
    try {
      let {
        search = "",
        page = 1,
        take = 5,
        include_ids,
        inventory_type,
        excluded_batch_order_id,
        excluded_sales_id,
      } = req.query;
      const { inventory_id } = req.params;

      let leftJoinCondition: Sql;
      let customID: Sql;
      let groupBy: Sql;

      let queryCondition = whereClauseBuilder([
        {
          value: `isi.inventory_id LIKE '%${inventory_id}%'`,
          checker: inventory_id as string,
        },
      ]);

      if (inventory_type === "batch") {
        customID = Prisma.raw(
          `'PO-' || LPAD(CAST(po.id_seq AS TEXT), 6, '0') AS purchase_order_id,`
        );
        leftJoinCondition = Prisma.raw(`
          LEFT JOIN
            "ItemsStockOut" iso ON isi.item_stock_in_id = iso.item_stock_in_id
            AND iso.batch_order_details_id NOT IN (
              SELECT bod.batch_order_details_id 
              FROM "BatchOrderDetails" bod
              WHERE bod.batch_order_id = '${excluded_batch_order_id}'
            )
          LEFT JOIN
            "PurchaseOrderDetails" pod ON isi.purchase_order_details_id = pod.purchase_order_details_id
          LEFT JOIN
            "PurchaseOrders" po ON pod.purchase_order_id = po.purchase_order_id
        `);
        groupBy = Prisma.raw(`
          GROUP BY
            isi.item_stock_in_id, po.id_seq
        `);
      } else if (inventory_type === "sales") {
        customID = Prisma.raw(
          `'BO-' || LPAD(CAST(bo.id_seq AS TEXT), 6, '0') AS batch_order_id,`
        );
        leftJoinCondition = Prisma.raw(`
          LEFT JOIN
            "ItemsStockOut" iso ON isi.item_stock_in_id = iso.item_stock_in_id
            AND iso.sales_details_id NOT IN (
              SELECT so.sales_details_id 
              FROM "SalesDetails" so
              WHERE so.sales_id = '${excluded_sales_id}'
            )
          LEFT JOIN
            "BatchOrders" bo ON isi.batch_order_id = bo.batch_order_id
        `);
        groupBy = Prisma.raw(`
          GROUP BY
            isi.item_stock_in_id, bo.id_seq
        `);
      } else {
        customID = Prisma.empty;
        leftJoinCondition = Prisma.raw(`
          LEFT JOIN
            "ItemsStockOut" iso ON isi.item_stock_in_id = iso.item_stock_in_id
        `);
        groupBy = Prisma.raw(`
          GROUP BY
            isi.item_stock_in_id
        `);
      }

      const inventoryCount: { count: number }[] =
        await prisma.$queryRaw(Prisma.sql`
        SELECT 
          COUNT(isi.inventory_id)::integer
        FROM 
          "ItemsStockIn" isi
        ${queryCondition}
      `);

      const inventory: any = await prisma.$queryRaw(Prisma.sql`
        SELECT
          ${customID}
          (isi.quantity - COALESCE(SUM(iso.quantity), 0)) AS remaining_quantity,
          (isi.cost * (isi.quantity - COALESCE(SUM(iso.quantity), 0))) AS total_cost,
          isi.cost,
          isi.item_stock_in_id,
          isi.id_seq
        FROM
          "ItemsStockIn" isi
        ${leftJoinCondition}
        ${queryCondition}
        ${groupBy}
        HAVING
          (SUM(iso.quantity) IS NULL OR SUM(iso.quantity) != isi.quantity)
        ORDER BY
          isi.id_seq ASC;
      `);

      let overallTotalCost = 0;
      let overallTotalRemainingQuantity = 0;

      inventory.forEach((item: any) => {
        overallTotalCost += item.total_cost;
        overallTotalRemainingQuantity += item.remaining_quantity;
      });

      return res.json({
        overall_total_cost: overallTotalCost,
        overall_total_remaining_quantity: overallTotalRemainingQuantity,
        count: inventoryCount[0].count,
        results: inventory,
      });
    } catch (err) {
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.post(
  "/",
  RoleChecker(["superadmin", "admin"]),
  validateData(InventoriesInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;

    try {
      let { ...data } = req.body as Prisma.InventoriesCreateArgs["data"];

      const newItem = await prisma.inventories.create({
        data,
      });

      const { modifiedValues, comparisonResults } = deepDiff(data, newItem);

      await CreateActivityLog(profile.user_id, {
        updatedFields: comparisonResults,
        logActionType: requestMethod,
        logStatus: "success",
        targetTable: {
          key: "inventory_id",
          value: newItem.inventory_id,
        },
      });

      return CustomSuccess(
        {
          title: "Item Added!",
          content: `${newItem.item_name} has been added`,
          payload: newItem,
        },
        req,
        res
      );
    } catch (err) {
      await CreateActivityLog(profile.user_id, {
        logActionType: requestMethod,
        logStatus: "failed",
        error: JSON.stringify(err),
      });
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.patch(
  "/:inventory_id",
  RoleChecker(["superadmin", "admin"]),
  validateData(InventoriesInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      const { inventory_id } = req.params;
      const { ...data } = req.body as Prisma.InventoriesUpdateInput;

      const previousInventory = await prisma.inventories
        .findUniqueOrThrow({
          where: { inventory_id },
        })
        .catch(() => {
          throw CustomError({
            title: "Supplier not found",
            statusCode: 401,
            content: "No supplier was found.",
          });
        });

      const { modifiedValues, comparisonResults } = deepDiff(
        data,
        previousInventory
      );

      if (modifiedValues) {
        const transaction = await prisma.$transaction(async (tx) => {
          const updateItem = await tx.inventories.update({
            where: {
              inventory_id,
            },
            data,
          });

          await CreateActivityLog(profile.user_id, {
            updatedFields: comparisonResults,
            logActionType: requestMethod,
            logStatus: "success",
            targetTable: { key: "inventory_id", value: inventory_id },
          });

          return updateItem;
        });

        return CustomSuccess(
          {
            title: `${transaction.item_name} Update Success!`,
            content: `${transaction.item_name} has been updated`,
            payload: transaction,
          },
          req,
          res
        );
      } else {
        return CustomSuccess(
          {
            title: `${previousInventory.item_name} Update Success!`,
            content: `${previousInventory.item_name} has been updated`,
            payload: previousInventory,
          },
          req,
          res
        );
      }
    } catch (err) {
      await CreateActivityLog(profile.user_id, {
        logActionType: requestMethod,
        logStatus: "failed",
        error: JSON.stringify(err),
      });
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.delete("/:inventory_id", async (req: Request, res: Response) => {
  const profile = req.user as Prisma.CredentialsGetPayload<{
    select: {
      user_id: true;
    };
  }>;
  const requestMethod = req.method.toLowerCase() as ActionTypes;
  try {
    const { inventory_id } = req.params;

    const deletedUser = await prisma.inventories.delete({
      where: {
        inventory_id,
      },
    });

    const { modifiedValues, comparisonResults } = deepDiff(
      deletedUser,
      deletedUser
    );

    if (modifiedValues) {
      await CreateActivityLog(profile.user_id, {
        updatedFields: comparisonResults,
        logActionType: requestMethod,
        logStatus: "success",
        targetTable: { key: "inventory_id", value: inventory_id },
      });
    }

    return CustomSuccess(
      {
        title: "Account Deleted",
        content: `${deletedUser.item_name}'s has been deleted.`,
        payload: deletedUser,
      },
      req,
      res
    );
  } catch (err) {
    await CreateActivityLog(profile.user_id, {
      logActionType: requestMethod,
      logStatus: "failed",
      error: JSON.stringify(err),
    });
    ErrorHandler(err, req, res);
  } finally {
    await prisma.$disconnect();
  }
});

export default router;
