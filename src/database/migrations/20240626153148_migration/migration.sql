-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "ActionTypes" AS ENUM ('get', 'post', 'update', 'patch', 'delete');

-- CreateEnum
CREATE TYPE "UserRoles" AS ENUM ('user', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('pending', 'returned', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "BatchOrderStatus" AS ENUM ('pending', 'in_progress', 'returned', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "SalesStatus" AS ENUM ('pending', 'shipped', 'returned', 'cancelled', 'refunded', 'completed');

-- CreateEnum
CREATE TYPE "SalesTypes" AS ENUM ('walk_in', 'shopee', 'lazada', 'tiktok', 'facebook');

-- CreateEnum
CREATE TYPE "ItemTypes" AS ENUM ('product', 'equipment', 'ingredient', 'cleaning_material');

-- CreateEnum
CREATE TYPE "ItemMeasurementTypes" AS ENUM ('kg', 'g', 'mg', 't', 'lb', 'oz', 'L', 'mL', 'gal');

-- CreateEnum
CREATE TYPE "ItemStockOutStatus" AS ENUM ('pending', 'returned', 'used');

-- CreateTable
CREATE TABLE "Users" (
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRoles" NOT NULL DEFAULT 'user',
    "email" TEXT NOT NULL,
    "mobile_no" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Credentials" (
    "credential_id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "last_change_password_at" TIMESTAMP(3),

    CONSTRAINT "Credentials_pkey" PRIMARY KEY ("credential_id")
);

-- CreateTable
CREATE TABLE "Suppliers" (
    "supplier_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_address" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_no" TEXT NOT NULL,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "PurchaseOrders" (
    "purchase_order_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'pending',
    "order_by_user_id" TEXT NOT NULL,
    "overall_purchase_cost" DOUBLE PRECISION NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrders_pkey" PRIMARY KEY ("purchase_order_id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderDetails" (
    "purchase_order_details_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderDetails_pkey" PRIMARY KEY ("purchase_order_details_id")
);

-- CreateTable
CREATE TABLE "Inventories" (
    "inventory_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT NOT NULL DEFAULT '',
    "item_type" "ItemTypes" NOT NULL DEFAULT 'ingredient',
    "item_measurement" DOUBLE PRECISION NOT NULL,
    "item_measurement_type" "ItemMeasurementTypes" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventories_pkey" PRIMARY KEY ("inventory_id")
);

-- CreateTable
CREATE TABLE "ItemsStockIn" (
    "item_stock_in_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "purchase_order_details_id" TEXT,
    "batch_order_id" TEXT,
    "inventory_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemsStockIn_pkey" PRIMARY KEY ("item_stock_in_id")
);

-- CreateTable
CREATE TABLE "ItemsStockOut" (
    "item_stock_out_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" "ItemStockOutStatus" NOT NULL DEFAULT 'pending',
    "item_stock_in_id" TEXT NOT NULL,
    "batch_order_details_id" TEXT,
    "sales_details_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemsStockOut_pkey" PRIMARY KEY ("item_stock_out_id")
);

-- CreateTable
CREATE TABLE "BatchOrders" (
    "batch_order_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "order_by_user_id" TEXT NOT NULL,
    "status" "BatchOrderStatus" NOT NULL DEFAULT 'pending',
    "overall_batch_cost" DOUBLE PRECISION NOT NULL,
    "planned_production_quantity" DOUBLE PRECISION NOT NULL,
    "planned_estimated_cost_per_bottle" DOUBLE PRECISION NOT NULL,
    "actual_production_quantity" DOUBLE PRECISION,
    "actual_estimated_cost_per_bottle" DOUBLE PRECISION,
    "processing_start_date" TIMESTAMP(3),
    "processing_end_date" TIMESTAMP(3),
    "planned_date" TIMESTAMP(3) NOT NULL,
    "actual_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchOrders_pkey" PRIMARY KEY ("batch_order_id")
);

-- CreateTable
CREATE TABLE "BatchOrderDetails" (
    "batch_order_details_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "batch_order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchOrderDetails_pkey" PRIMARY KEY ("batch_order_details_id")
);

-- CreateTable
CREATE TABLE "Sales" (
    "sales_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "overall_sales_cost" DOUBLE PRECISION NOT NULL,
    "overall_sales_amount" DOUBLE PRECISION NOT NULL,
    "total_profit" DOUBLE PRECISION NOT NULL,
    "sales_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "seller_name" TEXT NOT NULL,
    "notes" TEXT,
    "sales_type" "SalesTypes" NOT NULL,
    "status" "SalesStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Sales_pkey" PRIMARY KEY ("sales_id")
);

-- CreateTable
CREATE TABLE "SalesDetails" (
    "sales_details_id" TEXT NOT NULL,
    "id_seq" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "sales_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDetails_pkey" PRIMARY KEY ("sales_details_id")
);

-- CreateTable
CREATE TABLE "ActivityLogs" (
    "activity_logs_id" TEXT NOT NULL,
    "action_type" "ActionTypes" NOT NULL,
    "action_status" "ActionStatus" NOT NULL,
    "updated_fields" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "ActivityLogs_pkey" PRIMARY KEY ("activity_logs_id")
);

-- CreateTable
CREATE TABLE "ActivityLogsRelations" (
    "activity_logs_relations_id" TEXT NOT NULL,
    "activity_logs_id" TEXT,
    "user_id" TEXT,
    "credential_id" TEXT,
    "supplier_id" TEXT,
    "purchase_order_id" TEXT,
    "purchase_order_details_id" TEXT,
    "inventory_id" TEXT,
    "item_stock_in_id" TEXT,
    "item_stock_out_id" TEXT,
    "batch_order_id" TEXT,
    "batch_order_details_id" TEXT,
    "sales_id" TEXT,
    "sales_details_id" TEXT,

    CONSTRAINT "ActivityLogsRelations_pkey" PRIMARY KEY ("activity_logs_relations_id")
);

-- CreateTable
CREATE TABLE "Session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "UserIdSeq" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "UserIdSeq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminIdSeq" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "AdminIdSeq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Credentials_user_id_key" ON "Credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Suppliers_id_seq_key" ON "Suppliers"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "Suppliers_supplier_name_key" ON "Suppliers"("supplier_name");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrders_id_seq_key" ON "PurchaseOrders"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderDetails_id_seq_key" ON "PurchaseOrderDetails"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "Inventories_id_seq_key" ON "Inventories"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "Inventories_item_name_key" ON "Inventories"("item_name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemsStockIn_id_seq_key" ON "ItemsStockIn"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "ItemsStockIn_purchase_order_details_id_key" ON "ItemsStockIn"("purchase_order_details_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemsStockIn_batch_order_id_key" ON "ItemsStockIn"("batch_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemsStockOut_id_seq_key" ON "ItemsStockOut"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "BatchOrders_id_seq_key" ON "BatchOrders"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "BatchOrderDetails_id_seq_key" ON "BatchOrderDetails"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "Sales_id_seq_key" ON "Sales"("id_seq");

-- CreateIndex
CREATE UNIQUE INDEX "SalesDetails_id_seq_key" ON "SalesDetails"("id_seq");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "Session"("expire");

-- AddForeignKey
ALTER TABLE "Credentials" ADD CONSTRAINT "Credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Suppliers"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_order_by_user_id_fkey" FOREIGN KEY ("order_by_user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDetails" ADD CONSTRAINT "PurchaseOrderDetails_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventories"("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDetails" ADD CONSTRAINT "PurchaseOrderDetails_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrders"("purchase_order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemsStockIn" ADD CONSTRAINT "ItemsStockIn_purchase_order_details_id_fkey" FOREIGN KEY ("purchase_order_details_id") REFERENCES "PurchaseOrderDetails"("purchase_order_details_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemsStockIn" ADD CONSTRAINT "ItemsStockIn_batch_order_id_fkey" FOREIGN KEY ("batch_order_id") REFERENCES "BatchOrders"("batch_order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemsStockIn" ADD CONSTRAINT "ItemsStockIn_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventories"("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemsStockOut" ADD CONSTRAINT "ItemsStockOut_item_stock_in_id_fkey" FOREIGN KEY ("item_stock_in_id") REFERENCES "ItemsStockIn"("item_stock_in_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemsStockOut" ADD CONSTRAINT "ItemsStockOut_batch_order_details_id_fkey" FOREIGN KEY ("batch_order_details_id") REFERENCES "BatchOrderDetails"("batch_order_details_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemsStockOut" ADD CONSTRAINT "ItemsStockOut_sales_details_id_fkey" FOREIGN KEY ("sales_details_id") REFERENCES "SalesDetails"("sales_details_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchOrders" ADD CONSTRAINT "BatchOrders_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventories"("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchOrders" ADD CONSTRAINT "BatchOrders_order_by_user_id_fkey" FOREIGN KEY ("order_by_user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchOrderDetails" ADD CONSTRAINT "BatchOrderDetails_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventories"("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchOrderDetails" ADD CONSTRAINT "BatchOrderDetails_batch_order_id_fkey" FOREIGN KEY ("batch_order_id") REFERENCES "BatchOrders"("batch_order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDetails" ADD CONSTRAINT "SalesDetails_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventories"("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDetails" ADD CONSTRAINT "SalesDetails_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "Sales"("sales_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogs" ADD CONSTRAINT "ActivityLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_activity_logs_id_fkey" FOREIGN KEY ("activity_logs_id") REFERENCES "ActivityLogs"("activity_logs_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "Credentials"("credential_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrders"("purchase_order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_purchase_order_details_id_fkey" FOREIGN KEY ("purchase_order_details_id") REFERENCES "PurchaseOrderDetails"("purchase_order_details_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventories"("inventory_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_item_stock_in_id_fkey" FOREIGN KEY ("item_stock_in_id") REFERENCES "ItemsStockIn"("item_stock_in_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_item_stock_out_id_fkey" FOREIGN KEY ("item_stock_out_id") REFERENCES "ItemsStockOut"("item_stock_out_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_batch_order_id_fkey" FOREIGN KEY ("batch_order_id") REFERENCES "BatchOrders"("batch_order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_batch_order_details_id_fkey" FOREIGN KEY ("batch_order_details_id") REFERENCES "BatchOrderDetails"("batch_order_details_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "Sales"("sales_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogsRelations" ADD CONSTRAINT "ActivityLogsRelations_sales_details_id_fkey" FOREIGN KEY ("sales_details_id") REFERENCES "SalesDetails"("sales_details_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdSeq" ADD CONSTRAINT "UserIdSeq_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminIdSeq" ADD CONSTRAINT "AdminIdSeq_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
