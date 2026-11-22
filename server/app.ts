import 'dotenv/config';
if (!process.env.DATABASE_URL) {
  console.error("CRITICAL ERROR: DATABASE_URL is not defined in .env or environment!");
  if (!process.env.VERCEL) {
    process.exit(1);
  }
}

process.env.TZ = 'Asia/Kolkata';

// --- Global Error Handlers to prevent server crashes on background tasks ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { ensurePlatformAdminSeed, seedDatabase } from "./seed";
import { setupAuth } from "./auth";
import { ensureTenantSchema } from "./multitenancy";
import { runWithTenant } from "./db";
import { log } from "./logger";
import compression from "compression";

export const app = express();
app.set("trust proxy", 1);
export const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Enable gzip compression for all responses
app.use(compression());

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      const preview = JSON.stringify(capturedJsonResponse).slice(0, 200);
      logLine += ` :: ${preview}`;
    }
    log(logLine);
  });

  next();
});

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initApp(): Promise<express.Express> {
  if (initialized) return app;
  if (initPromise) {
    await initPromise;
    return app;
  }

  initPromise = (async () => {
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing! Please configure DATABASE_URL in Vercel Settings -> Environment Variables.");
      }
      setupAuth(app);
      try {
        console.log("[App Init] Checking tenant schema and platform admin...");
        const legacyTenantId = await ensureTenantSchema();
        await ensurePlatformAdminSeed();
        if (legacyTenantId > 0) await runWithTenant(legacyTenantId, () => seedDatabase());
        console.log("[App Init] Tenant schema verified.");
      } catch (dbInitErr) {
        console.warn("[App Init] DB schema verification warning:", dbInitErr);
      }
      console.log("Database initialized, registering routes...");
      await registerRoutes(httpServer, app);
      console.log("Routes registered.");

      // 404 catch-all for unmatched API routes
      app.use("/api", (_req: Request, res: Response) => {
        res.status(404).json({ message: "API route not found" });
      });

      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Internal Server Error:", err);
        if (res.headersSent) {
          return next(err);
        }
        return res.status(status).json({ message });
      });

      // Serve static build in production when NOT on Vercel
      // (Vercel automatically serves static files via its Edge CDN)
      if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
        serveStatic(app);
      }

      initialized = true;
    } catch (err) {
      console.error("CRITICAL ERROR during app initialization:", err);
      initPromise = null;
      throw err;
    }
  })();

  await initPromise;
  return app;
}
