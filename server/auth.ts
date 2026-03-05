import { Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const PgSession = connectPgSimple(session);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

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
        secure: process.env.NODE_ENV === "production",
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

export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      let effectivePerms: string[] = [];
      // Only use user-level permissions if explicitly set (even if empty)
      // A null/undefined value means "no override" — fall back to role permissions
      if (user.permissions !== null && user.permissions !== undefined && Array.isArray(user.permissions)) {
        effectivePerms = user.permissions;
      } else {
        // Fall back to the role's permissions
        const role = await storage.getRoleByName(user.role);
        effectivePerms = (role?.permissions as string[]) || [];
        // Superadmin always has full access regardless of role config
        if (user.role === "superadmin" && effectivePerms.length === 0) {
          return next(); // superadmin bypasses all permission checks
        }
      }

      const hasPermission = permissions.some((p) => effectivePerms.includes(p));
      if (!hasPermission) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      next();
    } catch {
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}
