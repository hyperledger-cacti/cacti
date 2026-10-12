/**
 * DEV_MODE resolution for SATP gateway deployments.
 *
 * Split out of `plugin-satp-hermes-gateway-cli.ts` so that unit tests can
 * import it without pulling in the CLI entry point, whose `#!/usr/bin/env
 * node` shebang is not valid JavaScript when the file is loaded through
 * jest's CommonJS wrapper.
 */

/**
 * Resolve whether DEV_MODE is active for this gateway launch.
 *
 * Precedence: an explicit `devMode` value in config.json always wins; the
 * `DEV_MODE` environment variable (truthy: "1", "true", "yes", "on", case
 * insensitive) applies only when the config field is absent. DEV_MODE
 * relaxes the TLS certificate-material requirement for test deployments —
 * the gateway then serves plain HTTP with a loud warning instead of
 * refusing to start. Never enable it in production.
 *
 * @param configValue - The raw `devMode` field from config.json (if present)
 * @param envValue - The raw `DEV_MODE` environment variable value (if set)
 * @returns `true` when DEV_MODE is active
 */
export function resolveDevMode(
  configValue: unknown,
  envValue: string | undefined,
): boolean {
  if (configValue !== undefined) {
    return configValue === true;
  }
  if (envValue === undefined) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(envValue.trim().toLowerCase());
}
