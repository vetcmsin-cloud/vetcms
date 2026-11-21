import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";
import { eq, sql } from "drizzle-orm";
import { tenants, users } from "@shared/schema";

const isServerless = !!process.env.VERCEL;
const needsSsl = process.env.DATABASE_URL?.includes("supabase") ||
                 process.env.DATABASE_URL?.includes("aws") ||
                 process.env.DATABASE_URL?.includes("pooler") ||
                 process.env.DATABASE_SSL === "true";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 3 : 20,
  min: isServerless ? 0 : 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

// Kill any query that runs longer than 15 seconds to prevent server freezes
pool.on("connect", (client) => {
  client.query("SET statement_timeout = 15000").catch(() => {});
});

const rootDb = drizzle(pool, { schema });
const tenantDbContext = new AsyncLocalStorage<{ transaction: any; tenantId: number }>();

// All existing storage and route queries use this shared handle. Within a
// tenant-scoped request it transparently routes them through the request's
// transaction, where PostgreSQL RLS reads app.tenant_id.
export const db = new Proxy(rootDb, {
  get(target, property, receiver) {
    const transaction = tenantDbContext.getStore()?.transaction;
    const source = transaction || target;
    const value = Reflect.get(source, property, transaction ? source : receiver);
    return typeof value === "function" ? value.bind(source) : value;
  },
}) as typeof rootDb;

export async function runWithTenant<T>(tenantId: number, callback: () => Promise<T>): Promise<T> {
  return rootDb.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT set_config('app.tenant_id', ${String(tenantId)}, true)`);
    return tenantDbContext.run({ transaction, tenantId }, callback);
  });
}

export function getCurrentTenantId(): number | undefined {
  return tenantDbContext.getStore()?.tenantId;
}

export async function getTenantAccessError(tenantId: number): Promise<string | null> {
  const [tenant] = await rootDb.select({ status: tenants.status, isDemo: tenants.isDemo, demoUntil: tenants.demoUntil, validUntil: tenants.validUntil })
    .from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return "Clinic account was not found";
  if (tenant.status !== "active") return "This clinic account is suspended. Contact the platform administrator.";
  const now = Date.now();
  if (tenant.validUntil && tenant.validUntil.getTime() < now) return "This clinic subscription has expired. Contact the platform administrator.";
  if (tenant.isDemo && tenant.demoUntil && tenant.demoUntil.getTime() < now) return "This clinic demo has expired. Contact the platform administrator.";
  return null;
}

// Apply tenant RLS to the complete request, including direct SQL and storage
// calls. The transaction remains open until the response is sent.
export async function tenantRequestContext(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (["/auth/login", "/auth/register"].includes(req.path)) return next();
  if (session?.platformAdminId) {
    if (["/auth/me", "/auth/logout"].includes(req.path) || req.path.startsWith("/platform/")) return next();
    return res.status(403).json({ message: "Platform admins use the clinic management dashboard" });
  }
  // The session's tenant is only a hint. Resolve the tenant from the
  // authenticated account on every request so stale or inconsistent sessions
  // cannot route a user into another clinic's data context.
  const userId = Number(session?.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) return next();
  const [user] = await rootDb.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !Number.isSafeInteger(user.tenantId) || user.tenantId <= 0) {
    return res.status(401).json({ message: "User is not assigned to a clinic" });
  }
  const tenantId = user.tenantId;
  if (Number(session.tenantId) !== tenantId) {
    session.tenantId = tenantId;
    await new Promise<void>((resolve, reject) => session.save((error) => error ? reject(error) : resolve()));
  }

  const accessError = await getTenantAccessError(tenantId);
  if (accessError) return res.status(403).json({ message: accessError, code: "CLINIC_ACCESS_DISABLED" });

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolveRequest();
  };
  let resolveRequest!: () => void;
  const requestFinished = new Promise<void>((resolve) => { resolveRequest = resolve; });

  res.once("finish", finish);
  res.once("close", finish);

  void runWithTenant(tenantId, async () => {
    next();
    await requestFinished;
  }).catch((error) => {
    console.error("Tenant request transaction failed:", error);
    if (!res.headersSent) res.status(500).json({ message: "Request failed" });
    finish();
  });
}
