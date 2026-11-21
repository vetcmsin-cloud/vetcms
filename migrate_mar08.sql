-- ============================================================
-- PetPoint Pro - Database Schema Update (March 8)
-- Run this ONCE on the VPS to add new columns/tables for latest features
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

-- 2. Add payment_method column to invoices table (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method TEXT;
    RAISE NOTICE 'Added: invoices.payment_method';
  END IF;
END $$;

-- 3. Add invoice_type column to invoices table (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'ip';
    RAISE NOTICE 'Added: invoices.invoice_type';
  END IF;
END $$;

-- 4. Add op_owner_name column to invoices table (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'op_owner_name'
  ) THEN
    ALTER TABLE invoices ADD COLUMN op_owner_name TEXT;
    RAISE NOTICE 'Added: invoices.op_owner_name';
  END IF;
END $$;

-- 5. Add op_pet_name column to invoices table (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'op_pet_name'
  ) THEN
    ALTER TABLE invoices ADD COLUMN op_pet_name TEXT;
    RAISE NOTICE 'Added: invoices.op_pet_name';
  END IF;
END $$;


-- 6. Create estimates table (if missing)
CREATE TABLE IF NOT EXISTS estimates (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  estimate_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  pet_name TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  converted_invoice_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
DO $$ BEGIN RAISE NOTICE 'OK: estimates table ready'; END $$;

-- 7. Create estimate_items table (if missing)
CREATE TABLE IF NOT EXISTS estimate_items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  estimate_id INTEGER NOT NULL,
  fee_id INTEGER,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
);
DO $$ BEGIN RAISE NOTICE 'OK: estimate_items table ready'; END $$;

-- Done
SELECT 'Schema Update Complete. All tables and columns for the latest version are ready.' AS status;
