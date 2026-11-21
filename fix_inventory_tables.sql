-- ============================================================
-- PetPoint Pro - Database Fix for Inventory Missing Columns
-- ============================================================

DO $$
BEGIN
  -- 1. inventory_sub_categories
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_sub_categories' AND column_name = 'category_id') THEN
    ALTER TABLE inventory_sub_categories ADD COLUMN category_id INTEGER;
    RAISE NOTICE 'Added: inventory_sub_categories.category_id';
  END IF;

  -- 2. inventory_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'supplier_id') THEN
    ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER;
    RAISE NOTICE 'Added: inventory_items.supplier_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'tax_category_id') THEN
    ALTER TABLE inventory_items ADD COLUMN tax_category_id INTEGER;
    RAISE NOTICE 'Added: inventory_items.tax_category_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'min_selling_price') THEN
    ALTER TABLE inventory_items ADD COLUMN min_selling_price NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added: inventory_items.min_selling_price';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'batch_criteria') THEN
    ALTER TABLE inventory_items ADD COLUMN batch_criteria TEXT;
    RAISE NOTICE 'Added: inventory_items.batch_criteria';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'mfg_date') THEN
    ALTER TABLE inventory_items ADD COLUMN mfg_date TEXT;
    RAISE NOTICE 'Added: inventory_items.mfg_date';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'shelf_details') THEN
    ALTER TABLE inventory_items ADD COLUMN shelf_details TEXT;
    RAISE NOTICE 'Added: inventory_items.shelf_details';
  END IF;
  
  -- Prevent failure from previous script if already run or skipped
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'inventory_id') THEN
    ALTER TABLE invoice_items ADD COLUMN inventory_id INTEGER;
    RAISE NOTICE 'Added: invoice_items.inventory_id';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'product_code') THEN
    ALTER TABLE invoice_items ADD COLUMN product_code TEXT;
    RAISE NOTICE 'Added: invoice_items.product_code';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'inventory_id') THEN
    ALTER TABLE estimate_items ADD COLUMN inventory_id INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'product_code') THEN
    ALTER TABLE estimate_items ADD COLUMN product_code TEXT;
  END IF;

END $$;

SELECT 'Success: All inventory columns verified and added!' AS result;
