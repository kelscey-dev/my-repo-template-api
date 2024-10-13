import express, { Request, Response, NextFunction } from "express";

import moment from "moment";

import prisma from "@database";

import { SalesInputValidator } from "@database/validators/SalesValidators";
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

      const queryConditions: Prisma.SalesWhereInput = {
        created_at: {
          gte: created_at_start
            ? moment(`${created_at_start}`).startOf("day").toISOString()
            : undefined,
          lte: created_at_end
            ? moment(`${created_at_end}`).endOf("day").toISOString()
            : undefined,
        },
        // OR: [
        //   {
        //     supplier: {
        //       OR: [
        //         {
        //           contact_name: {
        //             contains: `${search}`,
        //             mode: "insensitive",
        //           },
        //         },
        //         {
        //           supplier_name: {
        //             contains: `${search}`,
        //             mode: "insensitive",
        //           },
        //         },
        //       ],
        //     },
        //   },
        // ],
      };
      let salesCount = await prisma.sales.count({
        where: queryConditions,
      });
      let sales = await prisma.sales.findMany({
        where: queryConditions,
        orderBy: {
          id_seq: "desc",
        },
        select: {
          custom_id: true,
          id_seq: true,
          status: true,
          seller_name: true,
          sales_date: true,
          sales_type: true,
          sales_details: {
            select: {
              inventory_id: true,
              quantity: true,
              amount: true,
              total_amount: true,
              sales_details_id: true,
              inventory: {
                select: {
                  complete_item_name: true,
                },
              },
            },
          },
          overall_sales_cost: true,
          overall_sales_amount: true,
          total_profit: true,
          sales_id: true,
          created_by: true,
          created_at: true,
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      return res.json({
        count: salesCount,
        results: sales,
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
  validateData(SalesInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;

    try {
      let { sales_details, ...data } =
        req.body as Prisma.SalesCreateArgs["data"];

      const profile = req.user as Prisma.CredentialsGetPayload<{
        select: {
          user_id: true;
        };
      }>;

      data.created_by_user_id = profile.user_id;

      const salesDetails = (
        sales_details as Prisma.SalesDetailsCreateNestedManyWithoutSalesInput[]
      ).map(({ items_stock_out, ...rest }: any) => {
        return {
          ...rest,
          items_stock_out: {
            create: items_stock_out,
          },
        };
      });

      const newSales = await prisma.sales.create({
        data: {
          ...data,
          sales_details: {
            create: salesDetails,
          },
        },
      });

      const { modifiedValues, comparisonResults } = deepDiff(data, newSales);

      await CreateActivityLog(profile.user_id, {
        updatedFields: comparisonResults,
        logActionType: requestMethod,
        logStatus: "success",
        targetTable: {
          key: "sales_id",
          value: newSales.sales_id,
        },
      });

      return CustomSuccess(
        {
          title: "Sales Added!",
          content: `${newSales.custom_id} has been added`,
          payload: newSales,
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
  "/:sales_id",
  RoleChecker(["superadmin", "admin"]),
  validateData(SalesInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      const { sales_id } = req.params;
      const { sales_details: currentSalesDetails, ...data } =
        req.body as Prisma.SalesUpdateInput;

      const { sales_details: previousSalesDetails, ...previousSales } =
        await prisma.sales.findUniqueOrThrow({
          where: {
            sales_id: sales_id as string,
          },
          include: {
            sales_details: {
              include: {
                items_stock_out: true,
              },
            },
          },
        });

      if (previousSales.status === "completed") {
        throw CustomError({
          title: "Not Allowed!",
          statusCode: 401,
          content: "Sales is already completed. Updating data is not allowed",
        });
      }

      const { modifiedValues, comparisonResults } = deepDiff(
        { ...data, sales_details: currentSalesDetails },
        {
          ...previousSales,
          sales_details: previousSalesDetails,
        }
      );

      let salesDetailsData: any = updateDataClassifier(
        currentSalesDetails as [],
        previousSalesDetails,
        "sales_details_id",
        [{ key: "items_stock_out", referenceId: "item_stock_out_id" }]
      );

      if (modifiedValues) {
        const transaction = await prisma.$transaction(async (tx) => {
          const { sales_details: salesDetailsResponse, ...updatedSales } =
            await tx.sales.update({
              where: {
                sales_id: sales_id as string,
              },
              include: {
                sales_details: true,
              },
              data: {
                ...modifiedValues,
                sales_details: salesDetailsData,
              },
            });

          // if (updatedSales.status === "completed") {
          //   let filteredSalesDetails = salesDetailsResponse.map(
          //     ({ quantity, amount, sales_details_id, inventory_id }) => {
          //       return {
          //         quantity,
          //         amount,
          //         sales_details_id,
          //         inventory_id,
          //       };
          //     }
          //   );
          //   // await AddItemTransaction(filteredSalesDetails);
          // }

          await CreateActivityLog(profile.user_id, {
            updatedFields: comparisonResults,
            logActionType: requestMethod,
            logStatus: "success",
            targetTable: { key: "sales_id", value: sales_id },
          });

          return updatedSales;
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
            title: `${previousSales.custom_id} Update Success!`,
            content: `${previousSales.custom_id} has been updated`,
            payload: previousSales,
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

router.delete("/:sales_id", async (req: Request, res: Response) => {
  const profile = req.user as Prisma.CredentialsGetPayload<{
    select: {
      user_id: true;
    };
  }>;
  const requestMethod = req.method.toLowerCase() as ActionTypes;
  try {
    const { sales_id } = req.params;

    const deletedUser = await prisma.sales.delete({
      where: {
        sales_id,
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
        targetTable: { key: "sales_id", value: sales_id },
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
