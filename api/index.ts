import type { Request, Response } from "express";
import { initApp } from "../server/app";

let appPromise: ReturnType<typeof initApp> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!appPromise) {
    appPromise = initApp();
  }
  const app = await appPromise;
  return app(req, res);
}
