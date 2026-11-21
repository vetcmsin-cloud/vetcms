CREATE TABLE "blood_smear_pathogens" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"species" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate_items" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "estimate_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"estimate_id" integer NOT NULL,
	"fee_id" integer,
	"inventory_id" integer,
	"product_code" text,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "estimates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"estimate_number" text NOT NULL,
	"client_name" text NOT NULL,
	"pet_name" text,
	"date" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"converted_invoice_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expense_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category" text NOT NULL,
	"sub_category" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_product_types" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_product_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_sub_categories" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_sub_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"category_id" integer,
	"category" text DEFAULT 'General'
);
--> statement-breakpoint
CREATE TABLE "inventory_units" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"voucher_number" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"party" text,
	"reference_type" text,
	"reference_id" integer,
	"reference_number" text,
	"debit_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "platform_admins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "platform_clinic_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"clinic_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"reference" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"notes" text,
	"recorded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_report_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"filename" text NOT NULL,
	"owner_phone" text,
	"pet_name" text,
	"report_title" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "public_report_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"purchase_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"mrp" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"sgst_rate" numeric(5, 2) DEFAULT '0',
	"cgst_rate" numeric(5, 2) DEFAULT '0',
	"sgst_amount" numeric(10, 2) DEFAULT '0',
	"cgst_amount" numeric(10, 2) DEFAULT '0',
	"unit" text DEFAULT 'Unit'
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"purchase_number" text NOT NULL,
	"order_id" integer,
	"supplier_id" integer NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"reference_number" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_categories" (
	"tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tax_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"purchase_sgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sales_sgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"purchase_cgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sales_cgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"purchase_igst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sales_igst" numeric(5, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"plan" text DEFAULT 'standard' NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"demo_until" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "clinic_settings" DROP CONSTRAINT "clinic_settings_setting_key_unique";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_invoice_number_unique";--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_order_number_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "species" DROP CONSTRAINT "species_name_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_settings" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "tax_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "tax_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "total_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "sub_category" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "paid_by_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "voucher_number" text;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD COLUMN "product_code" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "sub_category" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "product_type" text DEFAULT 'Medicine';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "base_unit" text DEFAULT 'Unit';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "multi_unit" jsonb;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "mrp" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "min_selling_price" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "tax_category_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "purchase_sgst_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "purchase_cgst_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "sale_sgst_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "sale_cgst_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "batch_criteria" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "mfg_date" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "shelf_details" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "inventory_id" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "product_code" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_type" text DEFAULT 'ip';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "op_owner_name" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "op_pet_name" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "lab_ref_ranges" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_reports" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_test_categories" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_tests" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_records" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "pet_documents" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "age_months" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "mrp" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "sgst_rate" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "cgst_rate" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "sgst_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "cgst_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "unit" text DEFAULT 'Unit';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" integer DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "estimates_estimate_number_tenant_unique" ON "estimates" USING btree ("tenant_id","estimate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_categories_name_tenant_unique" ON "inventory_categories" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_product_types_name_tenant_unique" ON "inventory_product_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_sub_categories_name_tenant_unique" ON "inventory_sub_categories" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_units_name_tenant_unique" ON "inventory_units" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_purchase_number_tenant_unique" ON "purchases" USING btree ("tenant_id","purchase_number");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_settings_setting_key_tenant_unique" ON "clinic_settings" USING btree ("tenant_id","setting_key");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_product_id_tenant_unique" ON "inventory_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_tenant_unique" ON "invoices" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_order_number_tenant_unique" ON "purchase_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_tenant_unique" ON "roles" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "species_name_tenant_unique" ON "species" USING btree ("tenant_id","name");