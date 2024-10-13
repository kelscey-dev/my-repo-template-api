import {
  registerAdminAccount,
  registerUserAccount,
} from "@database/models/userModels";
import { Prisma, PrismaClient } from "@prisma/client";
import { zeroPad } from "@utils/helpers";

// Global singleton for Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    errorFormat: "pretty",
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Extend Prisma Client
const extendedPrisma = prisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const start = performance.now();
      const result = await query(args);
      const end = performance.now();
      const time = end - start;

      console.log(
        `------------------------------------------------------------`
      );
      console.log(`Model: ${model}`);
      console.log(`Operation: ${operation}`);
      // console.log(`Result: ${JSON.stringify(result)}`);
      console.log(`Duration: ${time}ms`);
      console.log(
        `------------------------------------------------------------`
      );

      return result; // Return the result of the query execution
    },
  },
  result: {
    suppliers: {
      custom_id: {
        compute({ id_seq }) {
          return `SP-${zeroPad(Number(id_seq), 6)}`;
        },
      },
    },
    inventories: {
      complete_item_name: {
        needs: {
          item_name: true,
          item_measurement: true,
          item_measurement_type: true,
        },
        compute({ item_measurement, item_name, item_measurement_type }) {
          return `${item_measurement}${item_measurement_type} ${item_name}`;
        },
      },
      custom_id: {
        compute({ id_seq }) {
          return `IT-${zeroPad(Number(id_seq), 6)}`;
        },
      },
    },
    products: {
      custom_id: {
        compute({ id_seq }) {
          return `PR-${zeroPad(Number(id_seq), 6)}`;
        },
      },
    },
    purchaseOrders: {
      custom_id: {
        compute({ id_seq }) {
          return `PO-${zeroPad(Number(id_seq), 6)}`;
        },
      },
    },
    purchaseOrderDetails: {
      total_cost: {
        compute({ quantity, cost }) {
          return quantity * cost;
        },
      },
    },
    batchOrders: {
      custom_id: {
        compute({ id_seq }) {
          return `BO-${zeroPad(Number(id_seq), 6)}`;
        },
      },
    },
    sales: {
      custom_id: {
        compute({ id_seq }) {
          return `SA-${zeroPad(Number(id_seq), 6)}`;
        },
      },
    },
    salesDetails: {
      total_amount: {
        compute({ quantity, amount }) {
          return quantity * amount;
        },
      },
    },
  },
  model: {
    users: {
      registerUserAccount,
      registerAdminAccount,
    },
  },
});

export default extendedPrisma;
