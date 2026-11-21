import type { Request, Response } from "express";
import { initApp, app } from "../server/app";

let isInitialized = false;
let initPromise: Promise<void> | null = null;
let initError: any = null;

async function ensureAppInitialized(): Promise<void> {
  if (isInitialized) return;
  if (initError) throw initError;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log("[Vercel API] Starting app initialization...");
        await initApp();
        isInitialized = true;
        console.log("[Vercel API] App successfully initialized.");
      } catch (err: any) {
        initError = err;
        console.error("[Vercel API] App initialization failed:", err);
        throw err;
      }
    })();
  }

  await initPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    // 1. Ensure database and express routes are initialized
    try {
      await ensureAppInitialized();
    } catch (err: any) {
      return res.status(500).json({
        message: "Server initialization failed",
        error: err?.message || String(err),
        hint: !process.env.DATABASE_URL ? "DATABASE_URL environment variable is missing in Vercel!" : undefined,
      });
    }

    // 2. Delegate to Express and ensure the Promise waits until the response finishes
    return await new Promise<void>((resolve, reject) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      res.on("error", reject);

      try {
        app(req, res);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err: any) {
    console.error("[Vercel API] Unhandled handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error during request execution",
        error: err?.message || String(err),
      });
    }
  }
}
