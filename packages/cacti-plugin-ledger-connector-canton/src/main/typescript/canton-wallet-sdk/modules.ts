import type { ICantonWalletSdkModules } from "./types";
import type { createRequire } from "module";

// Access the native loader directly: Jest's VM loader cannot require ESM even
// though our supported Node runtime can. SDK imports remain static in the bridge.
// The repository's older Node type definitions predate this Node 20.16 API.
const nativeProcess = process as NodeJS.Process & {
  getBuiltinModule(id: "module"): { createRequire: typeof createRequire };
};
const requireSdkModules = nativeProcess
  .getBuiltinModule("module")
  .createRequire(__filename);
/** Explicit tsc, development webpack, and production webpack output layouts. */
const bridgeLocations = [
  "./sdk-modules.mjs",
  "./canton-wallet-sdk/sdk-modules.mjs",
  "./lib/main/typescript/canton-wallet-sdk/sdk-modules.mjs",
];
function resolveBridgePath(): string {
  let lastError: unknown;
  for (const location of bridgeLocations) {
    try {
      return requireSdkModules.resolve(location);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "MODULE_NOT_FOUND") {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}
// Resolve before loading so dependency import errors are never mistaken for
// a missing bridge. All Node builds ship the tsc-emitted bridge in dist/lib.
const sdkModules = requireSdkModules(
  resolveBridgePath(),
) as ICantonWalletSdkModules;

/** Load the statically imported ESM SDK graph using Node 20.20 require(ESM). */
export async function loadCantonWalletSdk(): Promise<ICantonWalletSdkModules> {
  return sdkModules;
}
