-- ============================================================
-- PetPoint Pro - Safe Database Migration Script
-- Run this ONCE on the VPS to add new columns/tables
-- It uses IF NOT EXISTS / DO blocks so it is 100% safe to re-run
-- NO existing data will be changed or deleted
-- ============================================================

-- 1. Add age_months column to pets table (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'age_months'
  ) THEN
    ALTER TABLE pets ADD COLUMN age_months INTEGER DEFAULT 0;
    RAISE NOTICE 'Added: pets.age_months';
  ELSE
    RAISE NOTICE 'OK: pets.age_months already exists';
  END IF;
END $$;

-- 2. Add product_id column to inventory_items (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN product_id TEXT UNIQUE;
    RAISE NOTICE 'Added: inventory_items.product_id';
  ELSE
    RAISE NOTICE 'OK: inventory_items.product_id already exists';
  END IF;
END $$;

-- 3. Add sub_category column to inventory_items (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'sub_category'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN sub_category TEXT;
    RAISE NOTICE 'Added: inventory_items.sub_category';
  ELSE
    RAISE NOTICE 'OK: inventory_items.sub_category already exists';
  END IF;
END $$;

-- 4. Add base_unit column to inventory_items (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'base_unit'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN base_unit TEXT DEFAULT 'Unit';
    RAISE NOTICE 'Added: inventory_items.base_unit';
  ELSE
    RAISE NOTICE 'OK: inventory_items.base_unit already exists';
  END IF;
END $$;

-- 5. Add multi_unit column to inventory_items (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'multi_unit'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN multi_unit JSONB;
    RAISE NOTICE 'Added: inventory_items.multi_unit';
  ELSE
    RAISE NOTICE 'OK: inventory_items.multi_unit already exists';
  END IF;
END $$;

-- 6. Add supplier_id column to inventory_items (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER;
    RAISE NOTICE 'Added: inventory_items.supplier_id';
  ELSE
    RAISE NOTICE 'OK: inventory_items.supplier_id already exists';
  END IF;
END $$;

-- 7. Create inventory_sub_categories table (if missing)
CREATE TABLE IF NOT EXISTS inventory_sub_categories (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'General'
);
DO $$ BEGIN RAISE NOTICE 'OK: inventory_sub_categories table ready'; END $$;

-- 8. Create suppliers table (if missing)
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT
);
DO $$ BEGIN RAISE NOTICE 'OK: suppliers table ready'; END $$;

-- 9. Create purchase_orders table (if missing)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_number TEXT NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  received_date TEXT,
  created_by INTEGER
);
DO $$ BEGIN RAISE NOTICE 'OK: purchase_orders table ready'; END $$;

-- 10. Create purchase_order_items table (if missing)
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  purchase_order_id INTEGER NOT NULL,
  inventory_item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
);
DO $$ BEGIN RAISE NOTICE 'OK: purchase_order_items table ready'; END $$;

-- 11. Create expenses table (if missing)
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT DEFAULT 'General',
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
DO $$ BEGIN RAISE NOTICE 'OK: expenses table ready'; END $$;

-- 12. Create activity_logs table (if missing)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
DO $$ BEGIN RAISE NOTICE 'OK: activity_logs table ready'; END $$;

-- 13. Create pet_documents table (if missing)
CREATE TABLE IF NOT EXISTS pet_documents (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pet_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
DO $$ BEGIN RAISE NOTICE 'OK: pet_documents table ready'; END $$;

-- 14. Create species table (if missing)
CREATE TABLE IF NOT EXISTS species (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE
);
DO $$ BEGIN RAISE NOTICE 'OK: species table ready'; END $$;

-- Done
SELECT 'Migration complete. All tables and columns are up to date.' AS status;
