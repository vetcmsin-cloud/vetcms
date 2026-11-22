import 'dotenv/config';
import { app, httpServer, initApp } from "./app";
import { log } from "./logger";

(async () => {
  try {
    await initApp();

    if (process.env.NODE_ENV !== "production") {
      console.log("Importing vite...");
      const { setupVite } = await import("./vite");
      console.log("Imported vite, calling setup...");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    const host = "0.0.0.0";

    httpServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        log(`Error: Port ${port} is already in use.`);
      } else {
        log(`Server error: ${err.message}`);
      }
      process.exit(1);
    });

    httpServer.listen(
      {
        port,
        host,
      },
      () => {
        log(`serving on port ${port} across all interfaces (${host})`);
      },
    );
  } catch (err) {
    console.error("CRITICAL ERROR during server startup:", err);
    setTimeout(() => {
      console.log("Exiting to trigger restart...");
      process.exit(1);
    }, 5000);
  }
})();
