import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Pre-cache all JS/CSS assets so the app shell loads from disk, not network
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Don't pre-cache large Excel/debug files
        globIgnores: ["**/xlsx/**", "**/*.map"],
        // Cache API responses for clinic settings (rarely changes)
        runtimeCaching: [
          {
            urlPattern: /^\/api\/clinic-settings$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "clinic-settings-cache",
              expiration: { maxAgeSeconds: 5 * 60 }, // 5 minutes
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Split vendor chunks so browsers can cache them independently
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-toast",
          ],
          "vendor-charts": ["recharts"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-date": ["date-fns"],
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [".."],
    },
  },
});
