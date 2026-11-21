import { sql } from "drizzle-orm";
import { db, runWithTenant } from "./db";
import { platformAdmins, users } from "@shared/schema";

async function migratePlatformAdmins(): Promise<void> {
  const result: any = await db.execute(sql`SELECT version FROM tenant_migrations WHERE version = 'platform-admin-v1'`);
  if (result.rows?.length) return;

  // The old superadmin account lived inside the first clinic. Move its
  // credentials to the platform account table and remove its tenant account.
  const legacyAdmins = await db.select().from(users).where(sql`lower(${users.role}) = 'superadmin'`);
  for (const admin of legacyAdmins) {
    await db.insert(platformAdmins).values({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      password: admin.password,
    }).onConflictDoNothing({ target: platformAdmins.email });
    await runWithTenant(admin.tenantId, async () => {
      await db.delete(users).where(sql`${users.id} = ${admin.id}`);
    });
  }
  await db.execute(sql`INSERT INTO tenant_migrations (version) VALUES ('platform-admin-v1') ON CONFLICT DO NOTHING`);
}

// Keep relationships tenant-local too. RLS prevents a clinic from reading a
// different clinic's rows; these composite foreign keys also prevent a write
// from attaching this clinic's appointment or record to another clinic's pet,
// owner, or appointment by guessing a globally unique ID.
async function ensureTenantLocalClinicalRelations(): Promise<void> {
  const parentTables = ["owners", "pets", "appointments"];
  for (const table of parentTables) {
    await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS "${table}_tenant_id_id_unique" ON "${table}" (tenant_id, id)`));
  }

  const relations: Array<[string, string, string, string]> = [
    ["pets", "owner_id", "owners", "pets_owner_tenant_fk"],
    ["appointments", "owner_id", "owners", "appointments_owner_tenant_fk"],
    ["appointments", "pet_id", "pets", "appointments_pet_tenant_fk"],
    ["medical_records", "pet_id", "pets", "medical_records_pet_tenant_fk"],
    ["medical_records", "appointment_id", "appointments", "medical_records_appointment_tenant_fk"],
    ["invoices", "owner_id", "owners", "invoices_owner_tenant_fk"],
    ["invoices", "pet_id", "pets", "invoices_pet_tenant_fk"],
    ["lab_reports", "pet_id", "pets", "lab_reports_pet_tenant_fk"],
    ["pet_documents", "pet_id", "pets", "pet_documents_pet_tenant_fk"],
  ];

  for (const [child, column, parent, constraint] of relations) {
    await db.execute(sql.raw(`
      DO $tenant_fk$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraint}') THEN
          ALTER TABLE "${child}" ADD CONSTRAINT "${constraint}"
            FOREIGN KEY (tenant_id, "${column}") REFERENCES "${parent}" (tenant_id, id);
        END IF;
      END
      $tenant_fk$;
    `));
  }
}

// Safe to run at every boot: existing rows are assigned to the original
// clinic, then RLS is enabled on every clinic-owned table.
export async function ensureTenantSchema(): Promise<number> {
  const roleResult: any = await db.execute(sql`
    SELECT rolsuper OR rolbypassrls AS bypasses_rls
    FROM pg_roles WHERE rolname = current_user
  `);
  if (roleResult.rows?.[0]?.bypasses_rls) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SUPERUSER !== "true" && !process.env.VERCEL) {
      // RLS is the tenant boundary for all storage and SQL paths. Continuing
      // with a bypass-capable account silently exposes every clinic's records.
      throw new Error("Unsafe DATABASE_URL role: tenant isolation requires a PostgreSQL role without SUPERUSER or BYPASSRLS");
    } else {
      console.warn("⚠️ WARNING: Running with superuser/BYPASSRLS. PostgreSQL Row-Level Security (RLS) is bypassed by superusers.");
    }
  }

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS tenants (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tenant_migrations (
      version text PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'standard';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_name text;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email text;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone text;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS demo_until timestamp;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS valid_until timestamp;
    CREATE TABLE IF NOT EXISTS platform_admins (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      phone text NOT NULL DEFAULT '',
      password text NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS platform_clinic_payments (
      id serial PRIMARY KEY,
      clinic_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      amount numeric(12,2) NOT NULL,
      currency text NOT NULL DEFAULT 'INR',
      method text NOT NULL,
      status text NOT NULL DEFAULT 'paid',
      payment_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reference text,
      period_start timestamp,
      period_end timestamp,
      notes text,
      recorded_by integer,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS platform_clinic_payments_clinic_date_idx ON platform_clinic_payments (clinic_id, payment_date DESC);
  `));

  const tenantTables = [
    "users", "owners", "pets", "appointments", "medical_records", "roles",
    "fee_structures", "invoices", "invoice_items", "estimates", "estimate_items",
    "clinic_settings", "tax_categories", "suppliers", "inventory_units",
    "inventory_categories", "inventory_sub_categories", "inventory_product_types",
    "inventory_items", "purchase_orders", "purchase_order_items", "purchases",
    "purchase_items", "expenses", "expense_categories", "lab_reports", "activity_logs",
    "pet_documents", "lab_test_categories", "lab_tests", "species", "lab_ref_ranges",
    "blood_smear_pathogens", "ledger_entries",
  ];

  const priorMigration: any = await db.execute(sql`SELECT version FROM tenant_migrations WHERE version = 'tenant-isolation-v1'`);
  if (priorMigration.rows?.length) {
    await ensureTenantLocalClinicalRelations();
    await migratePlatformAdmins();
    return 0;
  }

  const tenantUniqueKeys: Array<[string, string]> = [
    ["roles", "name"], ["invoices", "invoice_number"], ["estimates", "estimate_number"],
    ["clinic_settings", "setting_key"], ["inventory_units", "name"],
    ["inventory_categories", "name"], ["inventory_sub_categories", "name"],
    ["inventory_product_types", "name"], ["inventory_items", "product_id"],
    ["purchase_orders", "order_number"], ["purchases", "purchase_number"], ["species", "name"],
  ];

  let legacyTenantId = 0;
  for (const table of tenantTables) {
    const exists: any = await db.execute(sql.raw(`SELECT EXISTS (SELECT 1 FROM "${table}" LIMIT 1) AS has_data`));
    if (exists.rows?.[0]?.has_data) {
      const inserted: any = await db.execute(sql`
        INSERT INTO tenants (name, slug) VALUES ('PetPoint Veterinary Clinic', 'petpoint-veterinary-clinic')
        ON CONFLICT (slug) DO NOTHING RETURNING id
      `);
      if (inserted.rows?.[0]?.id) legacyTenantId = Number(inserted.rows[0].id);
      else {
        const existing: any = await db.execute(sql`SELECT id FROM tenants WHERE slug = 'petpoint-veterinary-clinic' LIMIT 1`);
        legacyTenantId = Number(existing.rows?.[0]?.id || 0);
      }
      break;
    }
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(827364991::bigint)`);

    for (const table of tenantTables) {
      await tx.execute(sql.raw(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS tenant_id integer`));
      if (legacyTenantId > 0) await tx.execute(sql.raw(`UPDATE "${table}" SET tenant_id = ${Number(legacyTenantId)} WHERE tenant_id IS NULL`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" ALTER COLUMN tenant_id SET DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::integer`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" ALTER COLUMN tenant_id SET NOT NULL`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_tenant_id_fkey"`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`));
      await tx.execute(sql.raw(`DROP POLICY IF EXISTS tenant_isolation ON "${table}"`));
      await tx.execute(sql.raw(`CREATE POLICY tenant_isolation ON "${table}" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::integer) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::integer)`));
      await tx.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${table}_tenant_id_idx" ON "${table}" (tenant_id)`));
    }

    for (const [table, column] of tenantUniqueKeys) {
      const oldConstraint = `${table}_${column}_key`;
      await tx.execute(sql.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${oldConstraint}"`));
      await tx.execute(sql.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_${column}_unique"`));
      const indexName = `${table}_${column}_tenant_unique`;
      await tx.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (tenant_id, "${column}")`));
    }

    // Email is the login identifier, so it must be discoverable before a
    // session exists. This policy grants SELECT only; tenant writes still
    // require the tenant policy above.
    await tx.execute(sql.raw(`DROP POLICY IF EXISTS users_login_lookup ON users`));
    await tx.execute(sql.raw(`CREATE POLICY users_login_lookup ON users FOR SELECT USING (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)`));
    await tx.execute(sql.raw(`INSERT INTO tenant_migrations (version) VALUES ('tenant-isolation-v1') ON CONFLICT DO NOTHING`));
  });

  await ensureTenantLocalClinicalRelations();
  await migratePlatformAdmins();
  return legacyTenantId;
}
