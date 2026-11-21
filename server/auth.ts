import { Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPgSimple(session);

export function setupAuth(app: any) {
  app.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "petpoint-pro-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true" ? true : "auto",
        sameSite: "lax",
      },
    })
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any).userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any).userId || (req.session as any).userRole !== "superadmin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req.session as any).userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes((req.session as any).userRole)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Permission cache — avoids 1-2 DB round-trips on EVERY API call.
// Cache is keyed by userId and expires after 60 seconds.
// Call invalidatePermissionCache(userId) whenever a user or role is modified.
// ---------------------------------------------------------------------------
interface CachedPermissions {
  role: string;
  perms: string[];
  ts: number;
}
const permCache = new Map<number, CachedPermissions>();
const PERM_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidatePermissionCache(userId?: number) {
  if (userId !== undefined) {
    permCache.delete(userId);
    userCache.delete(userId); // also bust user data cache
  } else {
    // Invalidate all — used when a role's permissions change
    permCache.clear();
    userCache.clear();
  }
}

// ---------------------------------------------------------------------------
// User data cache — avoids re-fetching the same user row on every /api/auth/me
// ---------------------------------------------------------------------------
interface CachedUser {
  user: any;
  role: any;
  ts: number;
}
const userCache = new Map<number, CachedUser>();
const USER_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export async function getCachedUserWithRole(userId: number, storage: any): Promise<{ user: any; role: any } | null> {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && now - cached.ts < USER_CACHE_TTL_MS) {
    return { user: cached.user, role: cached.role };
  }
  const user = await storage.getUser(userId);
  if (!user) return null;
  const role = await storage.getRoleByName(user.role);
  userCache.set(userId, { user, role, ts: now });
  return { user, role };
}

async function getEffectivePermissions(userId: number): Promise<{ role: string; perms: string[] }> {
  const now = Date.now();
  const cached = permCache.get(userId);
  if (cached && now - cached.ts < PERM_CACHE_TTL_MS) {
    return { role: cached.role, perms: cached.perms };
  }

  const user = await storage.getUser(userId);
  if (!user) return { role: "", perms: [] };

  let perms: string[];
  if (user.permissions !== null && user.permissions !== undefined && Array.isArray(user.permissions)) {
    perms = user.permissions;
  } else {
    const role = await storage.getRoleByName(user.role);
    perms = (role?.permissions as string[]) || [];
  }

  permCache.set(userId, { role: user.role, perms, ts: now });
  return { role: user.role, perms };
}

export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { role, perms } = await getEffectivePermissions(userId);

      if (!role) return res.status(401).json({ message: "User not found" });

      // Superadmin always has full access — bypass all permission checks
      if (role === "superadmin") {
        return next();
      }

      const hasPermission = permissions.some((p) => perms.includes(p));
      if (!hasPermission) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      next();
    } catch {
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}
