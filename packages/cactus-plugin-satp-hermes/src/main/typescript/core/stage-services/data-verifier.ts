import { JsObjectSigner } from "@hyperledger/cactus-common";
import { verifySignature } from "../../gateway-utils";
import {
  CommonSatp,
  MessageType,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../constants";
import {
  ClientGatewayPubkeyError,
  HashError,
  MessageTypeError,
  ResourceUrlError,
  SatpCommonBodyError,
  SATPVersionError,
  SequenceNumberError,
  ServerGatewayPubkeyError,
  SessionDataNotLoadedCorrectlyError,
  SignatureMissingError,
  SignatureVerificationError,
  TransferContextIdError,
} from "../errors/satp-service-errors";
import { getMessageHash, getPreviousMessageType } from "../session-utils";

export function commonBodyVerifier(
  tag: string,
  common: CommonSatp | undefined,
  sessionData: SessionData | undefined,
  messageStage: MessageType,
  messageStage2?: MessageType, // this is only used in stage 1 when the message received can be either or 2 types
): void {
  if (sessionData == undefined) {
    throw new SessionDataNotLoadedCorrectlyError(tag, "undefined");
  }

  if (common == undefined) {
    throw new SatpCommonBodyError(tag, "undefined");
  }

  if (
    common.version == "" ||
    common.messageType == undefined ||
    common.sessionId == "" ||
    common.sequenceNumber == undefined ||
    common.resourceUrl == "" ||
    common.clientGatewayPubkey == "" ||
    common.serverGatewayPubkey == "" ||
    (common.hashPreviousMessage == "" &&
      messageStage != MessageType.INIT_PROPOSAL)
  ) {
    console.error("errorcommon", safeStableStringify(common));
    throw new SatpCommonBodyError(tag, safeStableStringify(common));
  }

  if (common.version != SATP_VERSION) {
    throw new SATPVersionError(tag, common.version, SATP_VERSION);
  }

  if (common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
    throw new ServerGatewayPubkeyError(tag);
  }

  if (common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
    throw new ClientGatewayPubkeyError(tag);
  }

  if (common.sequenceNumber != sessionData.lastSequenceNumber + BigInt(1)) {
    throw new SequenceNumberError(
      tag,
      common.sequenceNumber,
      sessionData.lastSequenceNumber,
    );
  }

  if (common.transferContextId != sessionData.transferContextId) {
    throw new TransferContextIdError(
      tag,
      common.transferContextId,
      sessionData.transferContextId,
    );
  }

  if (common.resourceUrl != sessionData.resourceUrl) {
    throw new ResourceUrlError(tag);
  }

  if (
    common.messageType != messageStage &&
    common.messageType != messageStage2
  ) {
    throw new MessageTypeError(
      tag,
      common.messageType.toString(),
      messageStage.toString(),
    );
  }

  if (
    common.hashPreviousMessage !=
    getMessageHash(
      sessionData,
      getPreviousMessageType(sessionData, messageStage),
    )
  ) {
    throw new HashError(
      tag,
      common.hashPreviousMessage,
      getMessageHash(
        sessionData,
        getPreviousMessageType(sessionData, messageStage),
      ),
    );
  }
}

export function signatureVerifier(
  tag: string,
  signer: JsObjectSigner,
  message: any,
  sessionData: SessionData | undefined,
) {
  if (sessionData == undefined) {
    throw new SessionDataNotLoadedCorrectlyError(tag, "undefined");
  }

  if (message.serverSignature != undefined && message.serverSignature != "") {
    if (
      !verifySignature(signer, message, sessionData?.serverGatewayPubkey || "")
    ) {
      throw new SignatureVerificationError(tag);
    }
  } else if (
    message.clientSignature != undefined &&
    message.clientSignature != ""
  ) {
    if (
      !verifySignature(signer, message, sessionData?.clientGatewayPubkey || "")
    ) {
      throw new SignatureVerificationError(tag);
    }
  } else {
    throw new SignatureMissingError(tag);
  }
}
