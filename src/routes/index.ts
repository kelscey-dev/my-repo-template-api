import { Express } from "express";

import Auth from "@controllers/apiController/auth";
import BatchOrders from "@controllers/apiController/batch-orders";
import Inventories from "@controllers/apiController/inventories";
import PurchaseOrders from "@controllers/apiController/purchase-orders";
import Sales from "@controllers/apiController/sales";
import Suppliers from "@controllers/apiController/suppliers";

import { ApiKeyChecker } from "@middleware/authMiddleware";

let apiRoutes = (app: Express) => {
  app.use("/api/auth", ApiKeyChecker, Auth);
  app.use("/api/suppliers", ApiKeyChecker, Suppliers);
  app.use("/api/inventories", ApiKeyChecker, Inventories);
  app.use("/api/purchase-orders", ApiKeyChecker, PurchaseOrders);
  app.use("/api/batch-orders", ApiKeyChecker, BatchOrders);
  app.use("/api/sales", ApiKeyChecker, Sales);
};

export default apiRoutes;
