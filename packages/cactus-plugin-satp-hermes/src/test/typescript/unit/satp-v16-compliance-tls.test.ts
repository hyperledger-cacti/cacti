/**
 * ΔID: Δ04
 * SPEC: draft-ietf-satp-core-16 §5.3.9 ("Gateway Supported TLS Schemes"),
 *       §5.4.2 ("TLS Secure Channel Establishment"), RFC 8446 §9.1
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Normative sentences extracted from draft-ietf-satp-core-16:
 *
 *   §5.3.9:
 *     "Gateways MUST support TLS1.3 [RFC8446]."
 *     "Gateways MUST support cryptographic schemes at least as secure AES-128
 *      in GCM mode with SHA-256 (TLS_AES_128_GCM_SHA256)."
 *
 *   §5.4.2:
 *     "TLS 1.3 MUST be implemented to protect gateway communications."
 *
 * ──────────────────────────────────────────────────────────────────────────
 * RFC 8446 §9.1 TLS 1.3 cipher suites (implementation requirements):
 *
 *   TLS_AES_128_GCM_SHA256        {0x13,0x01}  — MUST implement
 *   TLS_AES_256_GCM_SHA384        {0x13,0x02}  — SHOULD implement
 *   TLS_CHACHA20_POLY1305_SHA256  {0x13,0x03}  — SHOULD implement
 *   TLS_AES_128_CCM_SHA256        {0x13,0x04}  — MAY be used
 *   TLS_AES_128_CCM_8_SHA256      {0x13,0x05}  — MAY be used (short tag)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * File structure:
 *   Section A — local spec-derived oracle  (PASS: validates the oracle itself)
 *   Section B — production import gap      (FAIL: service-utils has no isTLS13Suite)
 *   Section C — Stage1ServerService gap    (FAIL: no TLS validation in checkTransferProposalRequestMessage)
 */

import { create } from "@bufbuild/protobuf";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import { NetworkCapabilitiesError } from "../../../main/typescript/core/errors/satp-service-errors";
import { Stage1ServerService } from "../../../main/typescript/core/stage-services/server/stage1-server-service";
import {
	LockType,
	NetworkCapabilities,
	NetworkCapabilitiesSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";

// ── Section A: spec-derived oracle ──────────────────────────────────────────

/**
 * Local implementation of the TLS 1.3 cipher-suite validator derived from
 * RFC 8446 §9.1.  This is the oracle the production code SHOULD expose.
 *
 * A "TLS 1.3 suite" is any suite registered in the TLS 1.3 cipher suite
 * registry (all five suites whose IANA code starts with 0x13).
 */
function isTLS13Suite(scheme: string): boolean {
	// Source: RFC 8446 §9.1 and IANA TLS Cipher Suite Registry (TLS 1.3 suites)
	const TLS13_SUITES = new Set([
		"TLS_AES_128_GCM_SHA256",
		"TLS_AES_256_GCM_SHA384",
		"TLS_CHACHA20_POLY1305_SHA256",
		"TLS_AES_128_CCM_SHA256",
		"TLS_AES_128_CCM_8_SHA256",
	]);
	return TLS13_SUITES.has(scheme);
}

describe("Δ04 — draft-ietf-satp-core-16 §5.3.9 / §5.4.2 TLS 1.3 compliance", () => {
	// ── A. Spec-derived oracle unit tests (PASS) ───────────────────────────
	describe("A. spec-derived isTLS13Suite oracle (PASS — validates this file's logic)", () => {
		it("accepts the MUST-implement suite TLS_AES_128_GCM_SHA256", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.9; RFC 8446 §9.1 (MUST)
			expect(isTLS13Suite("TLS_AES_128_GCM_SHA256")).toBe(true);
		});

		it("accepts the SHOULD-implement suite TLS_AES_256_GCM_SHA384", () => {
			// SPEC REF: RFC 8446 §9.1 (SHOULD)
			expect(isTLS13Suite("TLS_AES_256_GCM_SHA384")).toBe(true);
		});

		it("accepts the SHOULD-implement suite TLS_CHACHA20_POLY1305_SHA256", () => {
			// SPEC REF: RFC 8446 §9.1 (SHOULD)
			expect(isTLS13Suite("TLS_CHACHA20_POLY1305_SHA256")).toBe(true);
		});

		it("accepts TLS_AES_128_CCM_SHA256 (RFC 8446 MAY suite)", () => {
			// SPEC REF: RFC 8446 §9.1
			expect(isTLS13Suite("TLS_AES_128_CCM_SHA256")).toBe(true);
		});

		it("accepts TLS_AES_128_CCM_8_SHA256 (RFC 8446 MAY suite)", () => {
			// SPEC REF: RFC 8446 §9.1
			expect(isTLS13Suite("TLS_AES_128_CCM_8_SHA256")).toBe(true);
		});

		it("rejects a TLS 1.2 cipher suite TLS_RSA_WITH_AES_128_CBC_SHA", () => {
			// SPEC REF: RFC 8446 §9.1 — TLS 1.2 suites are NOT TLS 1.3 suites
			expect(isTLS13Suite("TLS_RSA_WITH_AES_128_CBC_SHA")).toBe(false);
		});

		it("rejects an empty string", () => {
			// SPEC REF: RFC 8446 §9.1 — must be a registered TLS 1.3 suite identifier
			expect(isTLS13Suite("")).toBe(false);
		});

		it("rejects arbitrary garbage input", () => {
			// SPEC REF: RFC 8446 §9.1
			expect(isTLS13Suite("NOT_A_CIPHER_SUITE")).toBe(false);
		});
	});

	// ── B. Production helper ───────────────────────────────────────────────
	describe("B. production isTLS13Suite export in service-utils", () => {
		it("service-utils exports a runtime isTLS13Suite function", async () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.9
			// The production helper that validates gatewayTlsScheme values should
			// live in service-utils so that stage handlers can call it.
			// Currently that export does not exist.
			let productionHelper: unknown;
			try {
				const mod = await import(
					"../../../main/typescript/core/stage-services/service-utils"
				);
				productionHelper = (mod as Record<string, unknown>)["isTLS13Suite"];
			} catch {
				productionHelper = undefined;
			}
			// SPEC REF: draft-ietf-satp-core-16 §5.3.9 — helper must exist to enforce the MUST
			expect(typeof productionHelper).toBe("function");
		});
	});

	// ── C. Stage1 validation ───────────────────────────────────────────────
	describe("C. checkTransferProposalRequestMessage TLS validation", () => {
		it("Stage1ServerService is importable and defined", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.9 — validation must occur at proposal time
			expect(Stage1ServerService).toBeDefined();
		});

		it("checkTransferProposalRequestMessage rejects a TLS 1.2 scheme", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.9
			const service = Object.create(
				Stage1ServerService.prototype,
			) as Stage1ServerService;
			Object.assign(service, {
				serviceType: "Server",
				stage: "1",
				monitorService: {
					startSpan: () => ({
						span: {
							setStatus: jest.fn(),
							recordException: jest.fn(),
							end: jest.fn(),
						},
						context: ROOT_CONTEXT,
					}),
				},
			});
			const capabilities = create(NetworkCapabilitiesSchema, {
				gatewayDefaultSignatureAlgorithm: "ES256",
				gatewaySupportedSignatureAlgorithms: ["ES256"],
				networkLockType: LockType.HASH_LOCK,
				networkLockExpirationTime: BigInt(1),
				gatewayTlsScheme: "TLS_RSA_WITH_AES_128_CBC_SHA",
			});
			const validate = service["checkNetworkCapabilities"].bind(service) as (
				networkCapabilities: NetworkCapabilities,
				tag: string,
			) => boolean;

			// SPEC REF: draft-ietf-satp-core-16 §5.3.9, §5.4.2
			expect(() => validate(capabilities, "test")).toThrow(
				NetworkCapabilitiesError,
			);

			capabilities.gatewayTlsScheme = "TLS_AES_128_GCM_SHA256";
			// SPEC REF: draft-ietf-satp-core-16 §5.3.9, §5.4.2
			expect(validate(capabilities, "test")).toBe(true);
		});
	});
});
