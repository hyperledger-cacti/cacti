import { create } from "@bufbuild/protobuf";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { Servers } from "@hyperledger-cacti/cactus-common";
import express from "express";
import http from "node:http";
import { AddressInfo } from "node:net";
import {
  SATPError,
  SATPInternalError,
  SATP_ERROR_URN_PREFIX,
  SATP_MSG_TYPE_URN_PREFIX,
  formatSATPErrorTypeURN,
  satpProblemDetailsErrorMiddleware,
} from "../../../main/typescript/core/errors/satp-errors";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";
import {
  NetworkCapabilitiesError,
  SatpCommonBodyError,
} from "../../../main/typescript/core/errors/satp-service-errors";
import { messageTypeToUrn } from "../../../main/typescript/core/iana-message-types";
import { getMessageTypeName } from "../../../main/typescript/core/satp-utils";
import { checkNetworkCapabilities } from "../../../main/typescript/core/stage-services/verifier/stage-1-server-service-verifications";
import {
  LockType,
  MessageType,
  NetworkCapabilitiesSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SatpStage1Service,
  TransferProposalResponseSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_1_pb";

describe("draft-ietf-satp-core-16 compliance", () => {
  it("uses registered error and message type URNs", () => {
    const error = new SATPError("test", 400, SATPErrorType.UNSPECIFIED);

    expect(SATP_ERROR_URN_PREFIX).toBe("urn:ietf:params:satp:error:");
    expect(SATP_MSG_TYPE_URN_PREFIX).toBe("urn:ietf:params:satp:core:msgtype:");
    expect(error.messageType).toBe(
      "urn:ietf:params:satp:core:msgtype:error-msg",
    );
    expect(messageTypeToUrn(MessageType.INIT_PROPOSAL)).toBe(
      "urn:ietf:params:satp:core:msgtype:transfer-proposal-msg",
    );
    expect(getMessageTypeName(MessageType.LOCK_ASSERT)).toContain(
      "lock-assert",
    );
    expect(formatSATPErrorTypeURN(SATPErrorType.MISSING_PARAMETER)).toMatch(
      new RegExp(`^${SATP_ERROR_URN_PREFIX}`),
    );
  });

  it("encodes SATP errors as RFC 9457 Problem Details", async () => {
    const internalError = new SATPInternalError("test", null, 422, "trace");
    expect(SATPError.fromInternalError(internalError).toJSON()).toEqual(
      expect.objectContaining({
        type: expect.stringMatching(new RegExp(`^${SATP_ERROR_URN_PREFIX}`)),
        status: 422,
      }),
    );

    const app = express();
    app.get("/satp-error", (_request, _response, next) => {
      next(new SatpCommonBodyError("test", "{}", null));
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

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toMatch(
        /^application\/problem\+json/,
      );
      expect(body).toEqual(
        expect.objectContaining({
          type: expect.stringMatching(/^urn:ietf:params:satp:error:/),
          title: "SatpCommonBodyError",
          status: 400,
        }),
      );
    } finally {
      await Servers.shutdown(server);
    }
  });

  it("rejects non-TLS 1.3 network capabilities", () => {
    const capabilities = create(NetworkCapabilitiesSchema, {
      gatewayDefaultSignatureAlgorithm: "ES256",
      gatewaySupportedSignatureAlgorithms: ["ES256"],
      networkLockType: LockType.HASH_LOCK,
      networkLockExpirationTime: BigInt(1),
      gatewayTlsScheme: "TLS_RSA_WITH_AES_128_CBC_SHA",
    });

    expect(() => checkNetworkCapabilities("test", capabilities)).toThrow(
      NetworkCapabilitiesError,
    );

    capabilities.gatewayTlsScheme = "TLS_AES_128_GCM_SHA256";
    expect(() => checkNetworkCapabilities("test", capabilities)).not.toThrow();
  });

  const server = http.createServer(
    connectNodeAdapter({
      routes: (router) => {
        router.service(SatpStage1Service, {
          transferProposal: async () => create(TransferProposalResponseSchema),
        });
      },
    }),
  );

  afterAll(async () => {
    await Servers.shutdown(server);
  });

  it("rejects HTTP GET for Connect RPC stage endpoints", async () => {
    const address = (await Servers.listen({
      hostname: "127.0.0.1",
      port: 0,
      server,
    })) as AddressInfo;
    const response = await fetch(
      `http://${address.address}:${address.port}/cacti.satp.v13.service.SatpStage1Service/TransferProposal`,
      { method: "GET" },
    );

    expect([405, 415]).toContain(response.status);
  });
});
