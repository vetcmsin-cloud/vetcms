-- ============================================================
-- PetPoint Pro - Safe Database Fix for Invoices Table
-- Run this ONCE on the VPS
-- ============================================================

DO $$
BEGIN
  -- Check and add billed_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'billed_by') THEN
    ALTER TABLE invoices ADD COLUMN billed_by INTEGER;
    RAISE NOTICE 'Added: invoices.billed_by';
  END IF;

  -- Check and add clinic_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'clinic_name') THEN
    ALTER TABLE invoices ADD COLUMN clinic_name TEXT DEFAULT 'PetPoint Pro Veterinary Clinic';
    RAISE NOTICE 'Added: invoices.clinic_name';
  END IF;

  -- Check and add clinic_address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'clinic_address') THEN
    ALTER TABLE invoices ADD COLUMN clinic_address TEXT;
    RAISE NOTICE 'Added: invoices.clinic_address';
  END IF;

  -- Check and add clinic_phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'clinic_phone') THEN
    ALTER TABLE invoices ADD COLUMN clinic_phone TEXT;
    RAISE NOTICE 'Added: invoices.clinic_phone';
  END IF;

  -- Check and add forwarded_to
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'forwarded_to') THEN
    ALTER TABLE invoices ADD COLUMN forwarded_to TEXT;
    RAISE NOTICE 'Added: invoices.forwarded_to';
  END IF;

  -- Check and add created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
    ALTER TABLE invoices ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Added: invoices.created_at';
  END IF;
  
  -- Re-check payment_method, invoice_type, op_owner_name, op_pet_name just in case
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

END $$;

SELECT 'Success: All invoice columns verified and added!' AS result;
