/**
 * Runtime configuration example for the Cacti Ledger Browser.
 *
 * Purpose: let ONE production build serve many environments. The values
 * below override the `VITE_*` variables that were inlined into the bundle
 * at build time - no rebuild needed. Resolution order per key:
 *
 *   1. this runtime file (valid values only - invalid ones are dropped
 *      with a console warning and the next tier applies),
 *   2. the build-time `VITE_*` values baked into the bundle,
 *   3. the built-in defaults (the `.env.template` placeholders and the
 *      SATP gateway default `http://localhost:4010`).
 *
 * Usage: copy this file to `config.js` next to the served `index.html`
 * (the app requests it as `/config.js`), then uncomment and fill in the
 * keys you need. Copying it verbatim is safe - an object with no values
 * uncommented overrides nothing, and the app behaves exactly like a build
 * served without this file.
 *
 * Validation: endpoint URLs must be well-formed absolute `http(s)` URLs
 * without embedded credentials (no `https://user:pass@host`), the schema
 * must be an ASCII identifier, and unknown keys are ignored. A malformed
 * value never crashes the app - it is skipped with a console warning.
 */
window.__LEDGER_BROWSER_CONFIG__ = {
  /**
   * Application shell - config store (Supabase or compatible).
   * Build-time fallbacks: VITE_SUPABASE_URL / VITE_SUPABASE_KEY /
   * VITE_SUPABASE_SCHEMA (placeholder defaults: "__SUPABSE_URL__",
   * "__SUPABSE_KEY__", "public").
   */
  // supabaseUrl: "https://your-supabase-project.supabase.co",
  // supabaseKey: "your-supabase-anon-key",
  // supabaseSchema: "public",
  /**
   * SATP Inspector fallbacks - used only when an app instance has no
   * options configured (e.g. the home-page app status card). Per-instance
   * options configured in the Add Application wizard always win over these.
   * Build-time fallbacks: VITE_SATP_GATEWAY_URL / VITE_SATP_PROMETHEUS_URL.
   */
  // satpGatewayUrl: "http://localhost:3012",
  // satpPrometheusUrl: "http://localhost:9090",
};
