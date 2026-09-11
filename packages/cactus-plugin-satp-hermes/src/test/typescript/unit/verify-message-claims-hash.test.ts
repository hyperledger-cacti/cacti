/**
 * Unit tests for the `hashTransferInitClaims` option of `verifyMessage`.
 *
 * The Stage 1 server commence verification used to perform an inline
 * transfer-init-claims hash check. That duplicate logic was consolidated into
 * `verifyMessage` via the `hashTransferInitClaims` option, so these tests pin
 * down the shared behaviour directly on `verifyMessage`.
 */
import { create } from "@bufbuild/protobuf";
import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import {
  CommonSatpSchema,
  MessageType,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SessionData,
  SessionDataSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_CORE_VERSION } from "../../../main/typescript/core/constants";
import { verifyMessage } from "../../../main/typescript/core/stage-services/verifier/data-verifier";
import { SessionType } from "../../../main/typescript/core/session-utils";
import { TransferInitClaimsHashError } from "../../../main/typescript/core/errors/satp-service-errors";
import type { SATPSession } from "../../../main/typescript/core/satp-session";

const TAG = "TestVerifyMessage";
const CLAIMS_HASH = "claims-hash-abc";

function makeSessionData(overrides?: Record<string, unknown>): SessionData {
  return create(SessionDataSchema, {
    id: "session-001",
    transferContextId: "ctx-001",
    version: SATP_CORE_VERSION,
    hashTransferInitClaims: CLAIMS_HASH,
    ...overrides,
  } as Record<string, unknown>);
}

function makeSession(sessionData: SessionData): SATPSession {
  return {
    verify: () => undefined,
    getServerSessionData: () => sessionData,
    getClientSessionData: () => sessionData,
  } as unknown as SATPSession;
}

function makeMessage(overrides?: Record<string, unknown>) {
  return {
    common: create(CommonSatpSchema, {
      version: SATP_CORE_VERSION,
      messageType: MessageType.TRANSFER_COMMENCE_REQUEST,
      sessionId: "session-001",
      transferContextId: "ctx-001",
      ...overrides,
    }),
  };
}

// signatureVerifier only inspects legacy signature fields, which are absent
// on the v13 messages built here, so a dummy signer is never exercised.
const signer = {} as JsObjectSigner;

describe("verifyMessage — hashTransferInitClaims", () => {
  it("does NOT throw when the claims hash matches the session", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);

    expect(() =>
      verifyMessage(
        TAG,
        signer,
        makeMessage(),
        session,
        SessionType.SERVER,
        MessageType.TRANSFER_COMMENCE_REQUEST,
        {
          checkHashPrevMessage: false,
          hashTransferInitClaims: CLAIMS_HASH,
        },
      ),
    ).not.toThrow();
  });

  it("throws TransferInitClaimsHashError when the claims hash mismatches", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);

    expect(() =>
      verifyMessage(
        TAG,
        signer,
        makeMessage(),
        session,
        SessionType.SERVER,
        MessageType.TRANSFER_COMMENCE_REQUEST,
        {
          checkHashPrevMessage: false,
          hashTransferInitClaims: "wrong-hash",
        },
      ),
    ).toThrow(TransferInitClaimsHashError);
  });

  it("throws TransferInitClaimsHashError when the claims hash is empty", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);

    expect(() =>
      verifyMessage(
        TAG,
        signer,
        makeMessage(),
        session,
        SessionType.SERVER,
        MessageType.TRANSFER_COMMENCE_REQUEST,
        {
          checkHashPrevMessage: false,
          hashTransferInitClaims: "",
        },
      ),
    ).toThrow(TransferInitClaimsHashError);
  });

  it("skips the claims-hash check when the option is omitted", () => {
    const sessionData = makeSessionData({ hashTransferInitClaims: "" });
    const session = makeSession(sessionData);

    expect(() =>
      verifyMessage(
        TAG,
        signer,
        makeMessage(),
        session,
        SessionType.SERVER,
        MessageType.TRANSFER_COMMENCE_REQUEST,
        { checkHashPrevMessage: false },
      ),
    ).not.toThrow();
  });
});
