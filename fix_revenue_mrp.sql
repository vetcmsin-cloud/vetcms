-- ============================================================
-- PetPoint Pro - VPS Migration: Revenue Reports + MRP columns
-- Safe to run multiple times (idempotent ALTER TABLE ... IF NOT EXISTS)
-- Run: psql "$DATABASE_URL" -f /root/fix_revenue_mrp.sql
-- ============================================================

-- ── 1. inventory_items.mrp ────────────────────────────────────
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── 2. purchase_order_items.mrp ──────────────────────────────
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── 3. ledger_entries table (for Revenue Reports / OP Ledger) ──
CREATE TABLE IF NOT EXISTS ledger_entries (
  id              SERIAL PRIMARY KEY,
  date            TEXT NOT NULL,
  voucher_number  TEXT NOT NULL,
  type            TEXT NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  party           TEXT,
  reference_type  TEXT,
  reference_id    INTEGER,
  reference_number TEXT,
  debit_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method  TEXT,
  notes           TEXT,
  created_by      INTEGER,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── 4. Ensure appointments table has booking_id if added ──────
-- (No new column in current schema - skip)

-- ── Verify ────────────────────────────────────────────────────
DO $$
DECLARE
  col_ok1 BOOLEAN;
  col_ok2 BOOLEAN;
  tbl_ok  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'mrp'
  ) INTO col_ok1;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_items' AND column_name = 'mrp'
  ) INTO col_ok2;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ledger_entries'
  ) INTO tbl_ok;

  RAISE NOTICE '=== Migration Result ===';
  RAISE NOTICE 'inventory_items.mrp         : %', CASE WHEN col_ok1 THEN 'OK' ELSE 'MISSING!' END;
  RAISE NOTICE 'purchase_order_items.mrp    : %', CASE WHEN col_ok2 THEN 'OK' ELSE 'MISSING!' END;
  RAISE NOTICE 'ledger_entries table        : %', CASE WHEN tbl_ok  THEN 'OK' ELSE 'MISSING!' END;
END $$;
