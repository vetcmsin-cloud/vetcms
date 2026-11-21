-- ============================================================
-- PetPoint Pro - Database Fix: Inventory Multi-Unit & Age Months
-- Date: 2026-05-18
-- Safe to run multiple times (idempotent)
-- ============================================================

DO $$
BEGIN

  -- ── inventory_items: multi_unit column ──────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'multi_unit'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN multi_unit JSONB;
    RAISE NOTICE 'Added: inventory_items.multi_unit';
  END IF;

  -- ── inventory_items: base_unit column ───────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'base_unit'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN base_unit TEXT DEFAULT 'Unit';
    RAISE NOTICE 'Added: inventory_items.base_unit';
  END IF;

  -- ── inventory_items: product_type column ────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN product_type TEXT DEFAULT 'Medicine';
    RAISE NOTICE 'Added: inventory_items.product_type';
  END IF;

  -- ── inventory_items: supplier_id column ─────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER;
    RAISE NOTICE 'Added: inventory_items.supplier_id';
  END IF;

  -- ── inventory_items: tax_category_id column ─────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'tax_category_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN tax_category_id INTEGER;
    RAISE NOTICE 'Added: inventory_items.tax_category_id';
  END IF;

  -- ── inventory_items: min_selling_price column ───────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'min_selling_price'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN min_selling_price NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added: inventory_items.min_selling_price';
  END IF;

  -- ── inventory_items: batch_criteria column ──────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'batch_criteria'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN batch_criteria TEXT;
    RAISE NOTICE 'Added: inventory_items.batch_criteria';
  END IF;

  -- ── inventory_items: mfg_date column ────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'mfg_date'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN mfg_date TEXT;
    RAISE NOTICE 'Added: inventory_items.mfg_date';
  END IF;

  -- ── inventory_items: shelf_details column ───────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'shelf_details'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN shelf_details TEXT;
    RAISE NOTICE 'Added: inventory_items.shelf_details';
  END IF;

  -- ── inventory_items: purchase_sgst_amount ───────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'purchase_sgst_amount'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN purchase_sgst_amount NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added: inventory_items.purchase_sgst_amount';
  END IF;

  -- ── inventory_items: purchase_cgst_amount ───────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'purchase_cgst_amount'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN purchase_cgst_amount NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added: inventory_items.purchase_cgst_amount';
  END IF;

  -- ── inventory_items: sale_sgst_amount ───────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'sale_sgst_amount'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN sale_sgst_amount NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added: inventory_items.sale_sgst_amount';
  END IF;

  -- ── inventory_items: sale_cgst_amount ───────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'sale_cgst_amount'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN sale_cgst_amount NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added: inventory_items.sale_cgst_amount';
  END IF;

  -- ── inventory_units table ────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'inventory_units'
  ) THEN
    CREATE TABLE inventory_units (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    RAISE NOTICE 'Created: inventory_units table';
  END IF;

  -- ── inventory_categories table ───────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'inventory_categories'
  ) THEN
    CREATE TABLE inventory_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    RAISE NOTICE 'Created: inventory_categories table';
  END IF;

  -- ── inventory_product_types table ───────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'inventory_product_types'
  ) THEN
    CREATE TABLE inventory_product_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    RAISE NOTICE 'Created: inventory_product_types table';
  END IF;

  -- ── inventory_sub_categories: category_id ───────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_sub_categories' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE inventory_sub_categories ADD COLUMN category_id INTEGER;
    RAISE NOTICE 'Added: inventory_sub_categories.category_id';
  END IF;

  -- ── invoice_items: inventory_id ──────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'inventory_id'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN inventory_id INTEGER;
    RAISE NOTICE 'Added: invoice_items.inventory_id';
  END IF;

  -- ── invoice_items: product_code ─────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'product_code'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN product_code TEXT;
    RAISE NOTICE 'Added: invoice_items.product_code';
  END IF;

  -- ── estimate_items: inventory_id ────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimate_items' AND column_name = 'inventory_id'
  ) THEN
    ALTER TABLE estimate_items ADD COLUMN inventory_id INTEGER;
    RAISE NOTICE 'Added: estimate_items.inventory_id';
  END IF;

  -- ── estimate_items: product_code ────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimate_items' AND column_name = 'product_code'
  ) THEN
    ALTER TABLE estimate_items ADD COLUMN product_code TEXT;
    RAISE NOTICE 'Added: estimate_items.product_code';
  END IF;

  -- ── pets: age_months ─────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'age_months'
  ) THEN
    ALTER TABLE pets ADD COLUMN age_months INTEGER DEFAULT 0;
    RAISE NOTICE 'Added: pets.age_months';
  END IF;

  -- ── purchase_order_items: unit ───────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_items' AND column_name = 'unit'
  ) THEN
    ALTER TABLE purchase_order_items ADD COLUMN unit TEXT DEFAULT 'Unit';
    RAISE NOTICE 'Added: purchase_order_items.unit';
  END IF;

  -- ── purchase_items: unit ─────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_items' AND column_name = 'unit'
  ) THEN
    ALTER TABLE purchase_items ADD COLUMN unit TEXT DEFAULT 'Unit';
    RAISE NOTICE 'Added: purchase_items.unit';
  END IF;

END $$;

SELECT 'Success: All VPS inventory & lab report columns verified!' AS result;
