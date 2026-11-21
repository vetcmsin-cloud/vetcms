import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./server/routes";

async function testRoutes() {
  const app = express();
  const server = createServer(app);
  try {
    console.log("Registering routes...");
    await registerRoutes(server, app);
    console.log("SUCCESS!");
  } catch (err) {
    console.error("FAILED TO REGISTER ROUTES:", err);
  } finally {
    process.exit(0);
  }
}

testRoutes();
