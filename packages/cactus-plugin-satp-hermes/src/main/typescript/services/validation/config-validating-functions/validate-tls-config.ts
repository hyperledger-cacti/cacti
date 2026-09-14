/**
 * Validates the gateway TLS configuration.
 *
 * Enforces the SATP v13 secure-channel requirements: TLS 1.3 as the
 * minimum protocol version, TLS 1.3 cipher suites only, and the
 * mandatory-to-implement `TLS_AES_128_GCM_SHA256` suite from RFC 8446
 * Section 9.1 included by default.
 *
 * @module services/validation/config-validating-functions/validate-tls-config
 */

import { DEFAULT_TLS13_CIPHER_SUITE } from "../../../core/constants";
import { TLS13_CIPHER_SUITES } from "../../../core/stage-services/service-utils";

/** TLS configuration for the gateway secure channel. */
export interface IGatewayTlsConfig {
  /** Enable TLS for the gateway server (required in production). */
  enabled?: boolean;
  /** PEM-encoded certificate chain. */
  cert?: string;
  /** PEM-encoded private key. */
  key?: string;
  /** Minimum TLS protocol version. MUST be `TLSv1.3`. */
  minVersion?: "TLSv1.2" | "TLSv1.3";
  /** Allowed cipher suites. MUST all be TLS 1.3 suites. */
  cipherSuites?: string[];
}

/**
 * Validate and normalize the gateway TLS configuration.
 *
 * Returns a normalized copy of the configuration with `minVersion` forced
 * to `TLSv1.3` and `cipherSuites` defaulted to the mandatory-to-implement
 * suite. Throws when a configuration below TLS 1.3 or with non-TLS-1.3
 * cipher suites is requested.
 *
 * @param opts.configValue - The raw TLS configuration (may be undefined)
 * @returns The normalized TLS configuration, or `undefined` when none was given
 * @throws {TypeError} When the configuration is not an object
 * @throws {Error} When the configuration requests below-TLS-1.3 security
 */
export function validateTlsConfig(opts: {
  readonly configValue: unknown;
}): IGatewayTlsConfig | undefined {
  const config = opts?.configValue;

  if (config === undefined) {
    return undefined;
  }
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new TypeError(
      `Invalid config.tls: ${JSON.stringify(config)}. Expected an object`,
    );
  }

  const raw = config as IGatewayTlsConfig;

  if (raw.minVersion !== undefined && raw.minVersion !== "TLSv1.3") {
    throw new Error(
      `Invalid config.tls.minVersion: "${raw.minVersion}". ` +
        "SATP gateways MUST enforce TLS 1.3 as the minimum protocol version " +
        "(RFC 8446, SATP v13 Section 5.3.3)",
    );
  }

  if (raw.cipherSuites !== undefined) {
    const invalid = raw.cipherSuites.filter(
      (suite) => !TLS13_CIPHER_SUITES.has(suite),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Invalid config.tls.cipherSuites: ${invalid.join(", ")}. ` +
          "Only TLS 1.3 cipher suites are permitted " +
          "(RFC 8446, SATP v13 Section 5.3.3)",
      );
    }
  }

  return {
    ...raw,
    minVersion: "TLSv1.3",
    cipherSuites: raw.cipherSuites ?? [DEFAULT_TLS13_CIPHER_SUITE],
  };
}
