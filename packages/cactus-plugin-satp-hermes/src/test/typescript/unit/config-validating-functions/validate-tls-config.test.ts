/**
 * Unit tests for gateway TLS configuration validation.
 *
 * Verifies that the gateway enforces TLS 1.3 as the minimum protocol
 * version with TLS 1.3 cipher suites only (SATP draft-16 Section 5.4.2 and
 * the mandatory-to-implement TLS_AES_128_GCM_SHA256 suite from RFC 8446
 * Section 9.1), and that TLS cannot be enabled without complete
 * certificate material (no silent plain-HTTP fallback).
 */
import {
  validateTlsConfig,
  type IGatewayTlsConfig,
} from "../../../../main/typescript/services/validation/config-validating-functions/validate-tls-config";
import { DEFAULT_TLS13_CIPHER_SUITE } from "../../../../main/typescript/core/constants";

const CERT = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----";
const KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----";

describe("validateTlsConfig — TLS 1.3 enforcement", () => {
  it("passes undefined through (TLS not configured)", () => {
    expect(validateTlsConfig({ configValue: undefined })).toBeUndefined();
  });

  it("defaults minVersion to TLSv1.3 and the mandatory cipher suite", () => {
    const result = validateTlsConfig({
      configValue: { enabled: true, cert: CERT, key: KEY },
    })!;
    expect(result.minVersion).toBe("TLSv1.3");
    expect(result.cipherSuites).toEqual([DEFAULT_TLS13_CIPHER_SUITE]);
  });

  it("accepts a valid TLS 1.3 configuration", () => {
    const config: IGatewayTlsConfig = {
      enabled: true,
      cert: CERT,
      key: KEY,
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

  it("rejects enabling TLS without a certificate", () => {
    expect(() =>
      validateTlsConfig({
        configValue: { enabled: true, key: KEY },
      }),
    ).toThrow(/cert missing/);
  });

  it("rejects enabling TLS without a private key", () => {
    expect(() =>
      validateTlsConfig({
        configValue: { enabled: true, cert: CERT },
      }),
    ).toThrow(/key missing/);
  });

  it("rejects enabling TLS without certificate material at all", () => {
    expect(() =>
      validateTlsConfig({
        configValue: { enabled: true },
      }),
    ).toThrow(/cert and key missing/);
  });

  it("allows a disabled configuration without certificate material", () => {
    const result = validateTlsConfig({
      configValue: { enabled: false },
    })!;
    expect(result.enabled).toBe(false);
  });

  it("rejects a minimum version below TLS 1.3", () => {
    expect(() =>
      validateTlsConfig({
        configValue: {
          enabled: true,
          cert: CERT,
          key: KEY,
          minVersion: "TLSv1.2",
        },
      }),
    ).toThrow(/TLS 1\.3/);
  });

  it("rejects cipher suites that are not TLS 1.3 suites", () => {
    expect(() =>
      validateTlsConfig({
        configValue: {
          enabled: true,
          cert: CERT,
          key: KEY,
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
