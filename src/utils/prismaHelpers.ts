import _ from "lodash";
import prisma from "@database";

import {
  Prisma,
  PurchaseOrderStatus,
  BatchOrderStatus,
  ActionTypes,
  ActionStatus,
} from "@prisma/client";

import { ActivityLogsTypes, DiffResult } from "./types";

export function generateRandomPassword(length: number) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?";

  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }

  return password;
}

export function generateFullName({
  firstName,
  middleName,
  lastName,
}: {
  firstName: string;
  middleName?: string;
  lastName: string;
}) {
  const fullNameParts = [firstName, middleName, lastName];

  const fullName = fullNameParts
    .filter((part) => part?.trim() !== "")
    .join(" ");

  return fullName;
}

export function updateDataClassifier(
  currentData: { [key: string]: any }[],
  previousData: { [key: string]: any }[],
  referenceId: string,
  nestedKeys: {
    key: string;
    referenceId: string;
  }[] = []
) {
  function createMapFromReferenceId(
    data: { [key: string]: any }[],
    referenceId: string
  ) {
    return new Map<string, { [key: string]: any }>(
      data.map((item) => [item[referenceId], item])
    );
  }

  function updateItemWithNestedData(
    currentItem: { [key: string]: any },
    previousItem: { [key: string]: any },
    nestedKeys: { key: string; referenceId: string }[]
  ) {
    const updatedItem = { ...currentItem };
    nestedKeys.forEach((nestedKey) => {
      const { key, referenceId: nestedReferenceId } = nestedKey;
      if (Array.isArray(currentItem[key]) && Array.isArray(previousItem[key])) {
        const nestedResult = updateDataClassifier(
          currentItem[key],
          previousItem[key],
          nestedReferenceId
        );
        updatedItem[key] = nestedResult;
      } else if (Array.isArray(currentItem[key])) {
        updatedItem[key] = { create: currentItem[key] };
      }
    });
    return updatedItem;
  }

  const dataToCreate: { [key: string]: any }[] = [];
  const dataToUpdate: {
    where: { [key: string]: any };
    data: { [key: string]: any };
  }[] = [];
  const dataToDelete: { [key: string]: any }[] = [];

  const previousDataMap = createMapFromReferenceId(previousData, referenceId);

  currentData.forEach((currentItem) => {
    const previousItem = previousDataMap.get(currentItem[referenceId]);

    if (previousItem) {
      const updatedItem = updateItemWithNestedData(
        currentItem,
        previousItem,
        nestedKeys
      );
      dataToUpdate.push({
        where: { [referenceId]: currentItem[referenceId] },
        data: { ...updatedItem },
      });
      previousDataMap.delete(currentItem[referenceId]);
    } else {
      const updatedItem = updateItemWithNestedData(currentItem, {}, nestedKeys);
      dataToCreate.push(updatedItem);
    }
  });

  dataToDelete.push(...previousDataMap.values());

  return {
    ...(dataToCreate.length > 0 && { create: dataToCreate }),
    ...(dataToUpdate.length > 0 && { update: dataToUpdate }),
    ...(dataToDelete.length > 0 && {
      deleteMany: {
        [referenceId]: { in: dataToDelete.map((item) => item[referenceId]) },
      },
    }),
  };
}

export function whereClauseBuilder(
  conditions: {
    checker: string | undefined;
    value: string;
  }[]
) {
  const clauses: string[] = [];

  conditions.map((condition) => {
    const { checker, value } = condition;
    if (checker) {
      clauses.push(value);
    }
  });

  return clauses.length > 0
    ? Prisma.raw(`WHERE ${clauses.join(" AND ")}`)
    : Prisma.empty;
}

export const pageSkipper = (page: number, take: number) => {
  return (page - 1) * take;
};

type ExtendedItemsStockInCreateManyInput =
  | (Prisma.ItemsStockInCreateManyInput & {
      purchase_order_details_id: string;
      batch_order_id?: never;
    })
  | (Prisma.ItemsStockInCreateManyInput & {
      purchase_order_details_id?: never;
      batch_order_id: string;
    });

export async function AddItemTransaction(
  data: ExtendedItemsStockInCreateManyInput[]
) {
  await prisma.itemsStockIn.createMany({
    data,
  });
}

export async function SubtractItemTransaction(
  data: Prisma.ItemsStockOutCreateManyInput[]
) {
  await prisma.itemsStockOut.createMany({
    data,
  });
}

export async function CreateActivityLog(
  userID: string,
  {
    logStatus,
    targetTable,
    logActionType,
    error,
    updatedFields,
  }: ActivityLogsTypes
) {
  if (targetTable) {
    await prisma.activityLogs.create({
      data: {
        user_id: userID,
        action_status: logStatus,
        action_type: logActionType,
        error: logStatus === "failed" ? error : undefined,
        updated_fields: updatedFields,
        activity_logs_relations: {
          create: {
            [targetTable.key]: targetTable.value,
          },
        },
      },
    });
  } else {
    await prisma.activityLogs.create({
      data: {
        user_id: userID,
        action_status: logStatus,
        action_type: logActionType,
        error: logStatus === "failed" ? error : undefined,
        updated_fields: updatedFields,
      },
    });
  }
}

export function CreateOrderHistory<T extends "batchOrder" | "purchaseOrder">(
  previousStatus: T extends "batchOrder"
    ? BatchOrderStatus
    : PurchaseOrderStatus,
  currentStatus: T extends "batchOrder" ? BatchOrderStatus : PurchaseOrderStatus
) {
  if (previousStatus !== currentStatus) {
    const createObject: {
      status_from: typeof previousStatus;
      status_to: typeof currentStatus;
    } = {
      status_from: previousStatus,
      status_to: currentStatus,
    };

    return {
      create: createObject,
    };
  }

  return undefined;
}

export const removeNullUndefinedFromArray = (arr: Array<any>) => {
  return arr.map((obj) => {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    return Object.fromEntries(
      Object.entries(obj).filter(
        ([_, value]) => value !== null && value !== undefined
      )
    );
  });
};

export function deepDiff(
  newObj: { [key: string]: any },
  oldObj: { [key: string]: any }
): {
  modifiedValues: { [key: string]: any } | null;
  comparisonResults: DiffResult[] | [];
} {
  if (_.isEqual(newObj, oldObj)) {
    return { modifiedValues: null, comparisonResults: [] };
  }

  const comparisonResults: DiffResult[] = [];
  const modifiedValues: { [key: string]: any } = {};

  function collectDiffs(newVal: any, oldVal: any, path: string) {
    if (_.isEqual(newVal, oldVal)) return;

    if (_.isObject(newVal) && _.isObject(oldVal)) {
      _.forEach(newVal, (value, key) => {
        collectDiffs(
          value,
          (oldVal as { [key: string]: any })[key],
          path ? `${path}.${key}` : key
        );
      });
    } else {
      const keyPath = path;
      modifiedValues[keyPath] = newVal !== undefined ? newVal : null;
      comparisonResults.push({
        key: keyPath,
        currentValue: newVal !== undefined ? newVal : null,
        previousValue: oldVal !== undefined ? oldVal : null,
      });
    }
  }

  collectDiffs(newObj, oldObj, "");

  const transformedModifiedValues: { [key: string]: any } = {};
  Object.keys(modifiedValues).forEach((key) => {
    const keys = key.split(".");
    let currentLevel = transformedModifiedValues;
    for (let i = 0; i < keys.length; i++) {
      const nestedKey = keys[i];
      if (i === keys.length - 1) {
        currentLevel[nestedKey] = modifiedValues[key];
      } else {
        currentLevel[nestedKey] = currentLevel[nestedKey] || {};
        currentLevel = currentLevel[nestedKey];
      }
    }
  });

  return { modifiedValues: transformedModifiedValues, comparisonResults };
}
