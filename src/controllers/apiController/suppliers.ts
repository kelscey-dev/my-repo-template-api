import { hash, genSaltSync, compare } from "bcrypt";
import express, { Request, Response, NextFunction } from "express";

import _ from "lodash";

import moment from "moment";

import passport from "passport";
import prisma from "@database";
import {
  AdminChangePasswordValidator,
  AdminInputValidator,
} from "@database/validators/AdminValidators";
import { SuppliersInputValidator } from "@database/validators/SuppliersValidators";
import { Authenticate, RoleChecker } from "@middleware/authMiddleware";
import { validateData } from "@middleware/dataValidator";
import { ActionTypes, Prisma, Suppliers } from "@prisma/client";
import { CreateActivityLog, deepDiff, pageSkipper } from "@utils/prismaHelpers";

import ErrorHandler, {
  CustomError,
  CustomSuccess,
} from "@utils/responseHandler";

let router = express.Router();

router.get(
  "/",
  RoleChecker(["superadmin", "admin"]),
  async (req: Request, res: Response) => {
    try {
      const {
        fields,
        search = "",
        page = 1,
        take = 5,
        created_at_start,
        created_at_end,
      } = req.query;

      const queryConditions: Prisma.SuppliersWhereInput = {
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
            supplier_name: {
              contains: `${search}`,
              mode: "insensitive",
            },
          },
          {
            contact_name: {
              contains: `${search}`,
              mode: "insensitive",
            },
          },
        ],
      };
      let suppliersCount = await prisma.suppliers.count({
        where: queryConditions,
      });
      let suppliers = await prisma.suppliers.findMany({
        where: queryConditions,
        orderBy: {
          id_seq: "desc",
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      return res.json({
        count: suppliersCount,
        results: suppliers,
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

      const queryConditions: Prisma.SuppliersWhereInput = {
        AND: [
          {
            supplier_id: include_ids ? { in: include_ids as [] } : undefined,
          },
          {
            supplier_id: exclude_ids ? { notIn: exclude_ids as [] } : undefined,
          },
        ],
        OR: [
          {
            supplier_name: {
              contains: `${search}`,
              mode: "insensitive",
            },
          },
          {
            contact_name: {
              contains: `${search}`,
              mode: "insensitive",
            },
          },
        ],
      };
      let suppliersCount = await prisma.suppliers.count({
        where: queryConditions,
      });
      let suppliers = await prisma.suppliers.findMany({
        where: queryConditions,
        select: {
          supplier_id: true,
          supplier_name: true,
          contact_no: true,
        },
        orderBy: {
          id_seq: "desc",
        },
        skip: pageSkipper(Number(page), Number(take)),
        take: Number(take),
      });

      const adjustedResult = suppliers.map(
        ({ supplier_id, supplier_name, ...rest }) => {
          return {
            ...rest,
            value: supplier_id,
            label: supplier_name,
          };
        }
      );

      return res.json({
        count: suppliersCount,
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
  validateData(SuppliersInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      let { ...data } = req.body as Prisma.SuppliersCreateArgs["data"];

      const newSupplier = await prisma.suppliers.create({
        data,
      });

      console.log(data, newSupplier);

      const { modifiedValues, comparisonResults } = deepDiff(data, newSupplier);

      await CreateActivityLog(profile.user_id, {
        updatedFields: comparisonResults,
        logActionType: requestMethod,
        logStatus: "success",
        targetTable: { key: "supplier_id", value: newSupplier.supplier_id },
      });

      return CustomSuccess(
        {
          title: "Supplier Added!",
          content: `${newSupplier?.supplier_name} has been added`,
          payload: newSupplier,
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
  "/:supplier_id",
  RoleChecker(["superadmin", "admin"]),
  validateData(SuppliersInputValidator),
  async (req: Request, res: Response) => {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        user_id: true;
      };
    }>;
    const requestMethod = req.method.toLowerCase() as ActionTypes;
    try {
      const { ...data } = req.body as Prisma.SuppliersUpdateInput;
      const { supplier_id } = req.params;

      const previousSupplier = await prisma.suppliers
        .findUniqueOrThrow({
          where: { supplier_id },
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
        previousSupplier
      );

      if (Array.isArray(modifiedValues)) {
        const transaction = await prisma.$transaction(async (tx) => {
          const updatedSupplier = await tx.suppliers.update({
            where: {
              supplier_id,
            },
            data: modifiedValues,
          });

          await CreateActivityLog(profile.user_id, {
            updatedFields: comparisonResults,
            logActionType: requestMethod,
            logStatus: "success",
            targetTable: { key: "supplier_id", value: supplier_id },
          });

          return updatedSupplier;
        });

        return CustomSuccess(
          {
            title: `${transaction?.supplier_name} Update Success!`,
            content: `${transaction?.supplier_name} has been updated`,
            payload: transaction,
          },
          req,
          res
        );
      } else {
        return CustomSuccess(
          {
            title: `${previousSupplier?.supplier_name} Update Success!`,
            content: `${previousSupplier?.supplier_name} has been updated`,
            payload: previousSupplier,
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

router.delete("/:supplier_id", async (req: Request, res: Response) => {
  const profile = req.user as Prisma.CredentialsGetPayload<{
    select: {
      user_id: true;
    };
  }>;
  const requestMethod = req.method.toLowerCase() as ActionTypes;
  try {
    const { supplier_id } = req.params;

    const deletedUser = await prisma.suppliers.delete({
      where: {
        supplier_id,
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
        targetTable: { key: "supplier_id", value: supplier_id },
      });
    }

    return CustomSuccess(
      {
        title: "Account Deleted",
        content: `${deletedUser.supplier_name}'s has been deleted.`,
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
