-- ============================================================
-- PetPoint Pro - Ultimate Schema Catch-Up Script
-- Run this ONCE on the VPS
-- Safe to re-run, no data will be lost.
-- ============================================================

DO $$
BEGIN
  -- USERS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
  END IF;

  -- FEE STRUCTURES
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'is_active') THEN
    ALTER TABLE fee_structures ADD COLUMN is_active TEXT DEFAULT 'true';
  END IF;

  -- APPOINTMENTS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'duration_minutes') THEN
    ALTER TABLE appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'is_follow_up') THEN
    ALTER TABLE appointments ADD COLUMN is_follow_up TEXT DEFAULT 'false';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'created_at') THEN
    ALTER TABLE appointments ADD COLUMN created_at TEXT DEFAULT NOW()::text;
  END IF;

  -- MEDICAL RECORDS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'diagnosis') THEN
    ALTER TABLE medical_records ADD COLUMN diagnosis TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'treatment') THEN
    ALTER TABLE medical_records ADD COLUMN treatment TEXT DEFAULT '';
  END IF;

  -- INVOICES (Comprehensive)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'billed_by') THEN
    ALTER TABLE invoices ADD COLUMN billed_by INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'clinic_name') THEN
    ALTER TABLE invoices ADD COLUMN clinic_name TEXT DEFAULT 'PetPoint Pro Veterinary Clinic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'clinic_address') THEN
    ALTER TABLE invoices ADD COLUMN clinic_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'clinic_phone') THEN
    ALTER TABLE invoices ADD COLUMN clinic_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'forwarded_to') THEN
    ALTER TABLE invoices ADD COLUMN forwarded_to TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
    ALTER TABLE invoices ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_method') THEN
    ALTER TABLE invoices ADD COLUMN payment_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_type') THEN
    ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'ip';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'op_owner_name') THEN
    ALTER TABLE invoices ADD COLUMN op_owner_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'op_pet_name') THEN
    ALTER TABLE invoices ADD COLUMN op_pet_name TEXT;
  END IF;

  -- ESTIMATES is already created by migrate_mar08.sql, but we can double check.

END $$;

SELECT 'Success: All tables verified and brought up to date!' AS result;
