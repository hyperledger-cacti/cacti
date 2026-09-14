/**
 * Validates the enableCrashRecovery configuration value.
 *
 * Crash recovery and rollback are not yet supported in the current
 * implementation.  They are defined in the IETF SATP Crash Recovery draft
 * ({@link https://datatracker.ietf.org/doc/draft-belchior-satp-gateway-recovery/})
 * and will be supported in a future release.
 *
 * Setting {@link enableCrashRecovery} to `true` will throw an error.
 */
export function validateSatpEnableCrashRecovery(opts: {
  readonly configValue: unknown;
}): boolean {
  if (!opts || opts.configValue === undefined) {
    return false;
  }

  if (typeof opts.configValue !== "boolean") {
    throw new TypeError(
      `Invalid config.enableCrashRecovery: ${opts.configValue}. Expected a boolean`,
    );
  }

  if (opts.configValue === true) {
    throw new Error(
      "Crash recovery and rollback are not yet supported. " +
        "They are defined in the IETF SATP Crash Recovery draft " +
        "(https://datatracker.ietf.org/doc/draft-belchior-satp-gateway-recovery/) " +
        "and will be supported in a future release.",
    );
  }

  return opts.configValue;
}
