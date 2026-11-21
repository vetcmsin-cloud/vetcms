-- ================================================================
--  PetPoint Pro — VPS Database Migration
--  Safe to run multiple times (all use IF NOT EXISTS / DO blocks)
--  Does NOT drop, truncate, or modify any existing data.
--  Run this ONCE on the VPS to fix the missing-column errors.
--
--  Usage on VPS:
--    psql "$DATABASE_URL" -f ~/fix_db.sql
--  OR (if you know the DB name):
--    psql -U postgres -d vet_clinic -f ~/fix_db.sql
-- ================================================================

\echo '============================================'
\echo ' PetPoint Pro — Safe DB Migration'
\echo '============================================'

-- ----------------------------------------------------------------
-- 1.  invoices  — columns added after initial deployment
-- ----------------------------------------------------------------
\echo '[1/7] invoices table...'

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS billed_by        INTEGER,
  ADD COLUMN IF NOT EXISTS clinic_name      TEXT    DEFAULT 'PetPoint Pro Veterinary Clinic',
  ADD COLUMN IF NOT EXISTS clinic_address   TEXT,
  ADD COLUMN IF NOT EXISTS clinic_phone     TEXT,
  ADD COLUMN IF NOT EXISTS forwarded_to     TEXT,
  ADD COLUMN IF NOT EXISTS payment_method   TEXT,
  ADD COLUMN IF NOT EXISTS invoice_type     TEXT    DEFAULT 'ip',
  ADD COLUMN IF NOT EXISTS op_owner_name    TEXT,
  ADD COLUMN IF NOT EXISTS op_pet_name      TEXT,
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();

\echo '    OK: invoices'

-- ----------------------------------------------------------------
-- 2.  expenses  — multiple columns added in stages
-- ----------------------------------------------------------------
\echo '[2/7] expenses table...'

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS tax_percentage   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS tax_amount       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sub_category     TEXT,
  ADD COLUMN IF NOT EXISTS vendor_id        INTEGER,
  ADD COLUMN IF NOT EXISTS invoice_number   TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url   TEXT,
  ADD COLUMN IF NOT EXISTS paid_by_id       INTEGER,
  ADD COLUMN IF NOT EXISTS recorded_by      INTEGER,
  ADD COLUMN IF NOT EXISTS voucher_number   TEXT;

\echo '    OK: expenses'

-- ----------------------------------------------------------------
-- 3.  expense_categories  — new table
-- ----------------------------------------------------------------
\echo '[3/7] expense_categories table...'

CREATE TABLE IF NOT EXISTS expense_categories (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category     TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  description  TEXT
);

\echo '    OK: expense_categories'

-- ----------------------------------------------------------------
-- 4.  inventory_items  — sub_category and other newer columns
-- ----------------------------------------------------------------
\echo '[4/7] inventory_items table...'

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS sub_category          TEXT,
  ADD COLUMN IF NOT EXISTS min_selling_price     NUMERIC(10,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_category_id       INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_sgst_amount  NUMERIC(10,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_cgst_amount  NUMERIC(10,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_sgst_amount      NUMERIC(10,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_cgst_amount      NUMERIC(10,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_criteria        TEXT,
  ADD COLUMN IF NOT EXISTS mfg_date              TEXT,
  ADD COLUMN IF NOT EXISTS shelf_details         TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id           INTEGER;

\echo '    OK: inventory_items'

-- ----------------------------------------------------------------
-- 5.  inventory_sub_categories  — new table
-- ----------------------------------------------------------------
\echo '[5/7] inventory_sub_categories table...'

CREATE TABLE IF NOT EXISTS inventory_sub_categories (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  category_id INTEGER,
  category    TEXT DEFAULT 'General'
);

\echo '    OK: inventory_sub_categories'

-- ----------------------------------------------------------------
-- 6.  ledger_entries  — new table (general ledger)
-- ----------------------------------------------------------------
\echo '[6/7] ledger_entries table...'

CREATE TABLE IF NOT EXISTS ledger_entries (
  id               SERIAL PRIMARY KEY,
  date             TEXT        NOT NULL,
  voucher_number   TEXT        NOT NULL,
  type             TEXT        NOT NULL,
  category         TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  party            TEXT,
  reference_type   TEXT,
  reference_id     INTEGER,
  reference_number TEXT,
  debit_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method   TEXT,
  notes            TEXT,
  created_by       INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

\echo '    OK: ledger_entries'

-- ----------------------------------------------------------------
-- 7.  pets  — created_at column (added later)
-- ----------------------------------------------------------------
\echo '[7/7] pets table...'

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

\echo '    OK: pets'

-- ----------------------------------------------------------------
-- Summary
-- ----------------------------------------------------------------
\echo ''
\echo '============================================'
\echo ' Migration complete — zero data loss'
\echo '============================================'
\echo ''
\echo ' Tables checked/updated:'
\echo '   invoices            (billed_by, clinic_*, invoice_type, op_*)'
\echo '   expenses            (tax, sub_category, vendor_id, voucher_number, ...)'
\echo '   expense_categories  (created if missing)'
\echo '   inventory_items     (sub_category, tax, sgst/cgst amounts, ...)'
\echo '   inventory_sub_categories (created if missing)'
\echo '   ledger_entries      (created if missing)'
\echo '   pets                (created_at)'
\echo ''
