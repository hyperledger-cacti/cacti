/**
 * ΔID: Δ02
 * SPEC: draft-ietf-satp-core-16 §7.3 (Error Messages), §11.3 (SATP Protocol Errors),
 *       RFC 9457 (Problem Details for HTTP APIs)
 *
 * v16 §11.3 mandates:
 *   "SATP error messages MUST be encoded as Problem Details objects as defined in
 *    [RFC9457], with content type application/problem+json."
 *
 * SATPError already implements a toJSON() shaped as RFC 9457 → PASSES baseline.
 *
 * SatpCommonBodyError (the per-message validation error class) does NOT expose a
 * toProblemDetails() method → FAILS gap assertion.
 */

import {
  SATPError,
  SATPInternalError,
  SATP_ERROR_URN_PREFIX,
  formatSATPErrorTypeURN,
} from "../../../main/typescript/core/errors/satp-errors";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";
import { SatpCommonBodyError } from "../../../main/typescript/core/errors/satp-service-errors";
import { satpProblemDetailsErrorMiddleware } from "../../../main/typescript/services/gateway/gateway-orchestrator";
import { Servers } from "@hyperledger-cacti/cactus-common";
import express from "express";
import http from "node:http";
import { AddressInfo } from "node:net";

describe("Δ02 — draft-ietf-satp-core-16 §11.3 + RFC 9457 Problem Details compliance", () => {
  describe("compliant baseline — SATPError.toJSON() (PASS)", () => {
    it("SATPError.fromInternalError().toJSON().type matches SATP_ERROR_URN_PREFIX", () => {
      const internal = new SATPInternalError(
        "test internal",
        null,
        422,
        "trace-rfc9457-01",
      );
      const clientErr = SATPError.fromInternalError(internal);
      const json = clientErr.toJSON();

      // SPEC REF: draft-ietf-satp-core-16 §11.3 — type MUST be a URN with the error prefix
      expect(json.type).toMatch(new RegExp(`^${SATP_ERROR_URN_PREFIX}`));
    });

    it("SATPError.toJSON() contains type, title, status, detail fields", () => {
      const err = new SATPError(
        "some error",
        422,
        SATPErrorType.MISSING_PARAMETER,
      );
      const json = err.toJSON();

      // SPEC REF: draft-ietf-satp-core-16 §11.3 references RFC 9457 fields
      expect(json).toHaveProperty("type");
      expect(json).toHaveProperty("status");
      expect(json).toHaveProperty("title");
      expect(json).toHaveProperty("detail");
    });

    it("SATPError.toJSON().type is a valid URN under the satp error namespace", () => {
      const err = new SATPError(
        "urn-test",
        415,
        SATPErrorType.BADLY_FORMATED_MESSAGE,
      );
      // SPEC REF: draft-ietf-satp-core-16 §11.3, §13.1
      expect(err.toJSON().type).toContain("urn:ietf:params:satp:");
    });

    it("formatSATPErrorTypeURN produces a type URI matching the error prefix", () => {
      const urn = formatSATPErrorTypeURN(SATPErrorType.MISSING_PARAMETER);
      // SPEC REF: draft-ietf-satp-core-16 §11.3 — urn:ietf:params:satp:core:error:<code>
      expect(urn).toMatch(new RegExp(`^${SATP_ERROR_URN_PREFIX}`));
    });
  });

  describe("SatpCommonBodyError.toProblemDetails()", () => {
    it("SatpCommonBodyError exposes toProblemDetails() returning an RFC 9457 object", () => {
      // SPEC REF: draft-ietf-satp-core-16 §11.3
      // SatpCommonBodyError is the per-message validation error. v16 requires ALL
      // SATP errors to be representable as Problem Details.
      // Currently SATPInternalError has no toProblemDetails() method.
      const err = new SatpCommonBodyError(
        "Stage1ServerService#test",
        '{"sessionId":"x"}',
        null,
      );

      expect(typeof err.toProblemDetails).toBe("function");
    });

    it("toProblemDetails() returns { type, title, status, detail } with satp error URN", () => {
      const err = new SatpCommonBodyError("tag", "data", null);

      const pd: unknown = err.toProblemDetails?.();

      // SPEC REF: draft-ietf-satp-core-16 §11.3, RFC 9457 §3
      // pd would need to have: { type: "urn:ietf:params:satp:...", title, status, detail }
      expect(pd).toBeDefined();
      expect((pd as Record<string, unknown>)?.type).toMatch(
        new RegExp(`^${SATP_ERROR_URN_PREFIX}`),
      );
    });

    it("serializes SATPInternalError as application/problem+json at the HTTP boundary", async () => {
      const app = express();
      app.get("/satp-error", (_request, _response, next) => {
        next(new SatpCommonBodyError("test#http", "{}", null));
      });
      app.use(satpProblemDetailsErrorMiddleware);
      const server = http.createServer(app);

      try {
        const address = (await Servers.listen({
          hostname: "127.0.0.1",
          port: 0,
          server,
        })) as AddressInfo;
        const response = await fetch(
          `http://${address.address}:${address.port}/satp-error`,
        );
        const body = (await response.json()) as Record<string, unknown>;

        // SPEC REF: draft-ietf-satp-core-16 §11.3, RFC 9457 §3
        expect(response.status).toBe(400);
        // SPEC REF: draft-ietf-satp-core-16 §11.3, RFC 9457 §3
        expect(response.headers.get("content-type")).toMatch(
          /^application\/problem\+json/,
        );
        // SPEC REF: draft-ietf-satp-core-16 §11.3, RFC 9457 §3.1
        expect(body).toEqual(
          expect.objectContaining({
            type: expect.stringMatching(/^urn:ietf:params:satp:error:/),
            title: "SatpCommonBodyError",
            status: 400,
            detail: expect.any(String),
          }),
        );
      } finally {
        await Servers.shutdown(server);
      }
    });
  });
});
