import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3001,
  },
  preview: {
    port: 4173,
    // Serving-layer security headers for the production bundle.
    // CSP notes:
    // - `style-src 'unsafe-inline'` is required by MUI/emotion and apexcharts,
    //   which inject <style> elements at runtime.
    // - `connect-src` must accept arbitrary http(s) origins because gateway,
    //   Prometheus and Supabase endpoints are configured at runtime (per app
    //   instance / env), not known at build time.
    // - No `unsafe-eval` / `unsafe-inline` for scripts: the production bundle
    //   is fully externalized (`dist/index.html` only references
    //   /assets/*.js), so `script-src 'self'` is sufficient.
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' http: https:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  },
  plugins: [react()],
});
