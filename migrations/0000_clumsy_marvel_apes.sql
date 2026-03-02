CREATE TABLE "activity_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "appointments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pet_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "clinic_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clinic_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"setting_key" text NOT NULL,
	"setting_value" text DEFAULT '' NOT NULL,
	CONSTRAINT "clinic_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"payment_method" text NOT NULL,
	"notes" text,
	"recorded_by" integer
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fee_structures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"is_active" text DEFAULT 'true' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'General',
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_quantity" integer DEFAULT 5 NOT NULL,
	"sale_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"purchase_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"expiry_date" text,
	"batch_number" text,
	"supplier" text,
	"supplier_id" integer,
	"last_updated" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoice_id" integer NOT NULL,
	"fee_id" integer,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoice_number" text NOT NULL,
	"owner_id" integer NOT NULL,
	"pet_id" integer,
	"date" text NOT NULL,
	"due_date" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" integer,
	"billed_by" integer,
	"clinic_name" text DEFAULT 'PetPoint Pro Veterinary Clinic',
	"clinic_address" text,
	"clinic_phone" text,
	"forwarded_to" text,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "lab_ref_ranges" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"min" text,
	"max" text,
	"ref_text" text
);
--> statement-breakpoint
CREATE TABLE "lab_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lab_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pet_id" integer NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"result" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"file_url" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_test_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "lab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"section" text,
	"unit" text,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "medical_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pet_id" integer NOT NULL,
	"appointment_id" integer,
	"date" text NOT NULL,
	"diagnosis" text NOT NULL,
	"treatment" text NOT NULL,
	"prescription" text,
	"veterinarian" text NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "owners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "pet_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pet_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pet_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"category" text DEFAULT 'General',
	"notes" text,
	"uploaded_by" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"age" integer NOT NULL,
	"weight" numeric(5, 2),
	"gender" text DEFAULT 'Male' NOT NULL,
	"color" text,
	"microchip" text,
	"image_url" text,
	"owner_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"purchase_order_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_number" text NOT NULL,
	"supplier_id" integer NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"received_date" text,
	"created_by" integer,
	CONSTRAINT "purchase_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" text DEFAULT 'false' NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "species_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "suppliers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" text NOT NULL,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'receptionist' NOT NULL,
	"permissions" jsonb,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
