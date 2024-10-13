import express, { Request, Response, NextFunction } from "express";

import moment from "moment";

import prisma from "@database";

import { PurchaseOrdersInputValidator } from "@database/validators/PurchaseOrderValidators";
import { SharedOptionalParametersValidator } from "@database/validators/SharedValidators";
import { Authenticate, RoleChecker } from "@middleware/authMiddleware";
import {
  validateData,
  validateQueryParameters,
} from "@middleware/dataValidator";
import { ActionTypes, Prisma } from "@prisma/client";
import {
  AddItemTransaction,
  CreateActivityLog,
  deepDiff,
  pageSkipper,
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

      const queryConditions: Prisma.PurchaseOrdersWhereInput = {
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
            supplier: {
              OR: [
                {
                  contact_name: {
                    contains: `${search}`,
                    mode: "insensitive",
                  },
                },
                {
                  supplier_name: {
                    contains: `${search}`,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        ],
      };

      let purchaseOrdersCount = await prisma.purchaseOrders.count({
        where: queryConditions,
      });
      let purchaseOrders = await prisma.purchaseOrders.findMany({
        where: queryConditions,
        orderBy: {
          id_seq: "desc",
        },
        select: {
          custom_id: true,
          id_seq: true,
          status: true,
          supplier: {
            select: {
              contact_name: true,
              contact_no: true,
              supplier_id: true,
              supplier_name: true,
            },
          },
          purchase_order_details: {
            select: {
              inventory_id: true,
              quantity: true,
              cost: true,
              total_cost: true,
              purchase_order_details_id: true,
              inventory: {
                select: {
                  complete_item_name: true,
                },
              },
            },
          },
          overall_purchase_cost: true,
          purchase_order_id: true,
          order_by: true,
          order_date: true,
          created_at: true,
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      return res.json({
        count: purchaseOrdersCount,
        results: purchaseOrders,
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

      const queryConditions: Prisma.PurchaseOrdersWhereInput = {
        AND: [
          {
            purchase_order_id: include_ids
              ? { in: include_ids as [] }
              : undefined,
          },
          {
            purchase_order_id: exclude_ids
              ? { notIn: exclude_ids as [] }
              : undefined,
          },
        ],
        OR: [
          {
            supplier: {
              OR: [
                {
                  contact_name: {
                    contains: `${search}`,
                    mode: "insensitive",
                  },
                },
                {
                  supplier_name: {
                    contains: `${search}`,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        ],
      };

      let purchaseOrdersCount = await prisma.purchaseOrders.count({
        where: queryConditions,
      });
      let purchaseOrders = await prisma.purchaseOrders.findMany({
        where: {
          ...queryConditions,
        },
        select: {
          purchase_order_id: true,
          custom_id: true,
        },
        orderBy: {
          id_seq: "desc",
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      const adjustedResult = purchaseOrders.map(
        ({ purchase_order_id, custom_id, ...rest }) => {
          return {
            ...rest,
            value: purchase_order_id,
            label: custom_id,
          };
        }
      );

      return res.json({
        count: purchaseOrdersCount,
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
  validateData(PurchaseOrdersInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      let { purchase_order_details, ...data } =
        req.body as Prisma.PurchaseOrdersCreateArgs["data"];

      const profile = req.user as Prisma.CredentialsGetPayload<{
        select: {
          user_id: true;
        };
      }>;

      data.order_by_user_id = profile.user_id;

      const newPurchaseOrder = await prisma.purchaseOrders.create({
        data: {
          ...data,
          purchase_order_details: {
            create: purchase_order_details as [],
          },
        },
      });

      const { modifiedValues, comparisonResults } = deepDiff(
        data,
        newPurchaseOrder
      );

      await CreateActivityLog(profile.user_id, {
        updatedFields: comparisonResults,
        logActionType: requestMethod,
        logStatus: "success",
        targetTable: {
          key: "purchase_order_id",
          value: newPurchaseOrder.purchase_order_id,
        },
      });

      return CustomSuccess(
        {
          title: "Purchase Order Added!",
          content: `${newPurchaseOrder.custom_id} has been added`,
          payload: newPurchaseOrder,
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
  "/:purchase_order_id",
  RoleChecker(["superadmin", "admin"]),
  validateData(PurchaseOrdersInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      const { purchase_order_id } = req.params;
      const { purchase_order_details, ...data } =
        req.body as Prisma.PurchaseOrdersUpdateInput;

      const currentPurchaseOrderDetails = (
        purchase_order_details as Prisma.PurchaseOrderDetailsUpdateManyWithoutPurchase_orderNestedInput[]
      ).map(({ className, value, label, ...rest }: any) => rest);

      const {
        purchase_order_details: previousPurchaseOrderDetails,
        ...previousPurchaseOrder
      } = await prisma.purchaseOrders.findUniqueOrThrow({
        where: {
          purchase_order_id: purchase_order_id as string,
        },
        include: {
          purchase_order_details: true,
        },
      });

      if (previousPurchaseOrder.status === "completed") {
        throw CustomError({
          title: "Not Allowed!",
          statusCode: 401,
          content:
            "Purchase Order is already completed. Updating data is not allowed",
        });
      }

      const { modifiedValues, comparisonResults } = deepDiff(
        { ...data, purchase_order_details: currentPurchaseOrderDetails },
        {
          ...previousPurchaseOrder,
          purchase_order_details: previousPurchaseOrderDetails,
        }
      );

      let purchaseOrderDetailsData: any = updateDataClassifier(
        currentPurchaseOrderDetails as [],
        previousPurchaseOrderDetails,
        "purchase_order_details_id"
      );

      if (modifiedValues) {
        const transaction = await prisma.$transaction(async (tx) => {
          const {
            purchase_order_details: purchaseOrderDetailsResponse,
            ...updatePurchaseOrder
          } = await tx.purchaseOrders.update({
            where: {
              purchase_order_id: purchase_order_id as string,
            },
            include: {
              purchase_order_details: true,
            },
            data: {
              ...modifiedValues,
              purchase_order_details: purchaseOrderDetailsData,
            },
          });

          if (updatePurchaseOrder.status === "completed") {
            let filteredPurchaseOrderDetails = purchaseOrderDetailsResponse.map(
              ({ quantity, cost, purchase_order_details_id, inventory_id }) => {
                return {
                  quantity,
                  cost,
                  purchase_order_details_id,
                  inventory_id,
                };
              }
            );
            await AddItemTransaction(filteredPurchaseOrderDetails);
          }

          await CreateActivityLog(profile.user_id, {
            updatedFields: comparisonResults,
            logActionType: requestMethod,
            logStatus: "success",
            targetTable: { key: "purchase_order_id", value: purchase_order_id },
          });

          return updatePurchaseOrder;
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
            title: `${previousPurchaseOrder.custom_id} Update Success!`,
            content: `${previousPurchaseOrder.custom_id} has been updated`,
            payload: previousPurchaseOrder,
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

router.delete("/:purchase_order_id", async (req: Request, res: Response) => {
  const profile = req.user as Prisma.CredentialsGetPayload<{
    select: {
      user_id: true;
    };
  }>;
  const requestMethod = req.method.toLowerCase() as ActionTypes;
  try {
    const { purchase_order_id } = req.params;

    const deletedUser = await prisma.purchaseOrders.delete({
      where: {
        purchase_order_id,
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
        targetTable: { key: "purchase_order_id", value: purchase_order_id },
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
