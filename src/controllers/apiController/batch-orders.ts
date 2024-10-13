import express, { Request, Response, NextFunction } from "express";

import moment from "moment";

import prisma from "@database";

import { BatchOrderInputValidator } from "@database/validators/BatchOrderValidators";
import { SharedOptionalParametersValidator } from "@database/validators/SharedValidators";

import { Authenticate, RoleChecker } from "@middleware/authMiddleware";
import {
  validateData,
  validateQueryParameters,
} from "@middleware/dataValidator";
import { Prisma, BatchOrderStatus, ActionTypes } from "@prisma/client";
import {
  AddItemTransaction,
  CreateActivityLog,
  SubtractItemTransaction,
  deepDiff,
  pageSkipper,
  removeNullUndefinedFromArray,
  updateDataClassifier,
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
      const {
        search = "",
        page = 1,
        take = 5,
        created_at_start,
        created_at_end,
      } = req.query;

      const queryConditions: Prisma.BatchOrdersWhereInput = {
        created_at: {
          gte: created_at_start
            ? moment(`${created_at_start}`).startOf("day").toISOString()
            : undefined,
          lte: created_at_end
            ? moment(`${created_at_end}`).endOf("day").toISOString()
            : undefined,
        },
        OR: [
          {
            product: {
              item_name: {
                contains: `${search}`,
                mode: "insensitive",
              },
            },
          },
        ],
      };
      let batchOrdersCount = await prisma.batchOrders.count({
        where: queryConditions,
      });
      let batchOrders = await prisma.batchOrders.findMany({
        where: queryConditions,
        orderBy: {
          id_seq: "desc",
        },
        select: {
          custom_id: true,
          id_seq: true,
          status: true,
          inventory_id: true,
          product: {
            select: {
              complete_item_name: true,
            },
          },
          batch_order_details: {
            select: {
              inventory_id: true,
              quantity: true,
              batch_order_details_id: true,
              items_stock_out: true,
              inventory: {
                select: {
                  complete_item_name: true,
                },
              },
            },
          },
          overall_batch_cost: true,
          batch_order_id: true,
          order_by: true,
          actual_date: true,
          actual_production_quantity: true,
          actual_estimated_cost_per_bottle: true,
          planned_date: true,
          planned_production_quantity: true,
          planned_estimated_cost_per_bottle: true,
          created_at: true,
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      return res.json({
        count: batchOrdersCount,
        results: removeNullUndefinedFromArray(batchOrders),
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
      } = req.query;

      const queryConditions: Prisma.BatchOrdersWhereInput = {
        AND: [
          {
            batch_order_id: include_ids ? { in: include_ids as [] } : undefined,
          },
          {
            batch_order_id: exclude_ids
              ? { notIn: exclude_ids as [] }
              : undefined,
          },
        ],
        OR: [
          {
            product: {
              item_name: {
                contains: `${search}`,
                mode: "insensitive",
              },
            },
          },
        ],
      };

      let batchOrdersCount = await prisma.batchOrders.count({
        where: queryConditions,
      });
      let batchOrders = await prisma.batchOrders.findMany({
        where: {
          ...queryConditions,
        },
        select: {
          batch_order_id: true,
          custom_id: true,
        },
        orderBy: {
          id_seq: "desc",
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      const adjustedResult = batchOrders.map(
        ({ batch_order_id, custom_id, ...rest }) => {
          return {
            ...rest,
            value: batch_order_id,
            label: custom_id,
          };
        }
      );

      return res.json({
        count: batchOrdersCount,
        results: adjustedResult,
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
  validateData(BatchOrderInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      let { batch_order_details, ...data } =
        req.body as Prisma.BatchOrdersCreateArgs["data"];

      data.order_by_user_id = profile.user_id;

      const batchOrderDetails = (
        batch_order_details as Prisma.BatchOrderDetailsCreateNestedManyWithoutBatch_orderInput[]
      ).map(({ items_stock_out, ...rest }: any) => {
        return {
          ...rest,
          items_stock_out: {
            create: items_stock_out,
          },
        };
      });

      const newBatchOrder = await prisma.batchOrders.create({
        data: {
          ...data,
          batch_order_details: {
            create: batchOrderDetails,
          },
        },
      });

      const { modifiedValues, comparisonResults } = deepDiff(
        data,
        newBatchOrder
      );

      await CreateActivityLog(profile.user_id, {
        updatedFields: comparisonResults,
        logActionType: requestMethod,
        logStatus: "success",
        targetTable: {
          key: "batch_order_id",
          value: newBatchOrder.batch_order_id,
        },
      });

      return CustomSuccess(
        {
          title: "Batch Order Added!",
          content: `${newBatchOrder.custom_id} has been added`,
          payload: newBatchOrder,
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
  "/:batch_order_id",
  RoleChecker(["superadmin", "admin"]),
  validateData(BatchOrderInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      const { batch_order_id } = req.params;
      const { batch_order_details: currentBatchOrderDetails, ...data } =
        req.body as Prisma.BatchOrdersUpdateInput;

      const {
        batch_order_details: previousBatchOrderDetails,
        ...previousBatchOrder
      } = await prisma.batchOrders.findUniqueOrThrow({
        where: {
          batch_order_id,
        },
        include: {
          batch_order_details: {
            include: {
              items_stock_out: true,
            },
          },
        },
      });

      if (
        previousBatchOrder.status === "in_progress" &&
        data.status === "pending"
      ) {
        throw CustomError({
          title: "Not Allowed!",
          statusCode: 401,
          content:
            "Batch Order is already In Progress. Updating data to pending is not allowed",
        });
      }

      if (previousBatchOrder.status === "completed") {
        throw CustomError({
          title: "Not Allowed!",
          statusCode: 401,
          content:
            "Batch Order is already completed. Updating data is not allowed",
        });
      }

      const { modifiedValues, comparisonResults } = deepDiff(
        { ...data, batch_order_details: currentBatchOrderDetails },
        {
          ...previousBatchOrder,
          batch_order_details: previousBatchOrderDetails,
        }
      );

      let batchOrderDetailsData: any = updateDataClassifier(
        currentBatchOrderDetails as [],
        previousBatchOrderDetails,
        "batch_order_details_id",
        [{ key: "items_stock_out", referenceId: "item_stock_out_id" }]
      );

      if (modifiedValues) {
        const transaction = await prisma.$transaction(async (tx) => {
          const {
            batch_order_details: batchOrderDetailsResponse,
            ...updateBatchOrder
          } = await tx.batchOrders.update({
            where: {
              batch_order_id: batch_order_id as string,
            },
            include: {
              batch_order_details: true,
            },
            data: {
              ...modifiedValues,
              batch_order_details: batchOrderDetailsData,
              actual_date: data.status === "completed" ? new Date() : undefined,
              processing_start_date:
                data.status === "in_progress" &&
                previousBatchOrder.status === "pending"
                  ? new Date()
                  : undefined,
            },
          });

          if (updateBatchOrder.status === "completed") {
            const {
              actual_production_quantity,
              actual_estimated_cost_per_bottle,
              inventory_id,
            } = updateBatchOrder;

            if (
              actual_production_quantity !== null &&
              actual_estimated_cost_per_bottle !== null
            ) {
              await AddItemTransaction([
                {
                  inventory_id,
                  cost: actual_estimated_cost_per_bottle,
                  quantity: actual_production_quantity,
                  batch_order_id,
                },
              ]);
            } else {
              throw CustomError({
                title: "Ooops!",
                statusCode: 401,
                content:
                  "Actual Production Quantity and Actual Estimated Cost Per Bottle are required",
              });
            }
          }

          await CreateActivityLog(profile.user_id, {
            updatedFields: comparisonResults,
            logActionType: requestMethod,
            logStatus: "success",
            targetTable: { key: "batch_order_id", value: batch_order_id },
          });

          return updateBatchOrder;
        });

        return CustomSuccess(
          {
            title: `${transaction.custom_id} Update Success!`,
            content: `${transaction.custom_id} has been updated`,
            payload: transaction,
          },
          req,
          res
        );
      } else {
        return CustomSuccess(
          {
            title: `${previousBatchOrder.custom_id} Update Success!`,
            content: `${previousBatchOrder.custom_id} has been updated`,
            payload: previousBatchOrder,
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

router.delete("/:batch_order_id", async (req: Request, res: Response) => {
  const profile = req.user as Prisma.CredentialsGetPayload<{
    select: {
      user_id: true;
    };
  }>;
  const requestMethod = req.method.toLowerCase() as ActionTypes;
  try {
    const { batch_order_id } = req.params;

    const deletedUser = await prisma.batchOrders.delete({
      where: {
        batch_order_id,
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
        targetTable: { key: "batch_order_id", value: batch_order_id },
      });
    }

    return CustomSuccess(
      {
        title: "Account Deleted",
        content: `${deletedUser.custom_id}'s has been deleted.`,
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
