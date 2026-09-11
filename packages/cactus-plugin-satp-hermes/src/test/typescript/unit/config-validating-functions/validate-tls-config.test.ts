/**
 * Unit tests for gateway TLS configuration validation.
 *
 * Verifies that the gateway enforces TLS 1.3 as the minimum protocol
 * version with TLS 1.3 cipher suites only (SATP v13 Section 5.3.3 and
 * the mandatory-to-implement TLS_AES_128_GCM_SHA256 suite from RFC 8446
 * Section 9.1).
 */
import {
  validateTlsConfig,
  type IGatewayTlsConfig,
} from "../../../../main/typescript/services/validation/config-validating-functions/validate-tls-config";
import { DEFAULT_TLS13_CIPHER_SUITE } from "../../../../main/typescript/core/constants";

describe("validateTlsConfig — TLS 1.3 enforcement", () => {
  it("passes undefined through (TLS not configured)", () => {
    expect(validateTlsConfig({ configValue: undefined })).toBeUndefined();
  });

  it("defaults minVersion to TLSv1.3 and the mandatory cipher suite", () => {
    const result = validateTlsConfig({ configValue: { enabled: true } })!;
    expect(result.minVersion).toBe("TLSv1.3");
    expect(result.cipherSuites).toEqual([DEFAULT_TLS13_CIPHER_SUITE]);
  });

  it("accepts a valid TLS 1.3 configuration", () => {
    const config: IGatewayTlsConfig = {
      enabled: true,
      minVersion: "TLSv1.3",
      cipherSuites: [
        DEFAULT_TLS13_CIPHER_SUITE,
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
      ],
    };
    const result = validateTlsConfig({ configValue: config })!;
    expect(result.enabled).toBe(true);
    expect(result.minVersion).toBe("TLSv1.3");
  });

  it("rejects a minimum version below TLS 1.3", () => {
    expect(() =>
      validateTlsConfig({
        configValue: { enabled: true, minVersion: "TLSv1.2" },
      }),
    ).toThrow(/TLS 1\.3/);
  });

  it("rejects cipher suites that are not TLS 1.3 suites", () => {
    expect(() =>
      validateTlsConfig({
        configValue: {
          enabled: true,
          cipherSuites: [
            DEFAULT_TLS13_CIPHER_SUITE,
            "TLS_RSA_WITH_AES_128_CBC_SHA",
          ],
        },
      }),
    ).toThrow(/TLS 1\.3 cipher suites/);
  });

  it("rejects non-object configuration", () => {
    expect(() => validateTlsConfig({ configValue: "tls" })).toThrow(TypeError);
  });
});
