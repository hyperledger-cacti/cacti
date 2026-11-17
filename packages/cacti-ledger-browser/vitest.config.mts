import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Vitest (jsdom) configuration for the ledger browser frontend tests.
 *
 * This supplements - not replaces - the repo-root Jest suite (which runs the
 * pure `apps/satp/transform.ts` unit tests in a node environment). Everything
 * that needs a DOM (React Testing Library component tests, app definition /
 * wizard tests) and the fast-check property tests of the untrusted-JSON
 * boundary live under `src/test/typescript/vitest/` and are NOT picked up by
 * the root Jest `testMatch` (it only scans `src/test/typescript/{unit,
 * integration,benchmark}/**` for `*.test.ts`).
 *
 * Run with: `yarn workspace @hyperledger-cacti/cacti-ledger-browser test:unit`
 * (or `yarn test:unit` inside this package).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/test/typescript/vitest/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/typescript/vitest/setup.ts"],
    // Tests are fully hermetic: network access is never needed (all gateway
    // calls are module-mocked) and CSS is irrelevant to what they assert.
    css: false,
    // fast-check properties run hundreds of shrinking-enabled iterations.
    testTimeout: 30_000,
  },
});
