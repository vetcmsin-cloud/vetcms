-- ============================================================
-- PetPoint Pro - Database Fix for Invoice & Estimate Items
-- Run this ONCE on the VPS
-- ============================================================

DO $$
BEGIN
  -- Run for invoice_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'inventory_id') THEN
    ALTER TABLE invoice_items ADD COLUMN inventory_id INTEGER;
    RAISE NOTICE 'Added: invoice_items.inventory_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'product_code') THEN
    ALTER TABLE invoice_items ADD COLUMN product_code TEXT;
    RAISE NOTICE 'Added: invoice_items.product_code';
  END IF;

  -- Run for estimate_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'inventory_id') THEN
    ALTER TABLE estimate_items ADD COLUMN inventory_id INTEGER;
    RAISE NOTICE 'Added: estimate_items.inventory_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'product_code') THEN
    ALTER TABLE estimate_items ADD COLUMN product_code TEXT;
    RAISE NOTICE 'Added: estimate_items.product_code';
  END IF;

END $$;

SELECT 'Success: Added inventory_id and product_code to items tables!' AS result;
