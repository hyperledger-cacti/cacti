import { JsObjectSigner, Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { TransferCommenceResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATPGateway } from "../../../gateway-refactor";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LockAssertionRequestMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import {
  bufArray2HexStr,
  getHash,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";
import { getMessageHash, saveHash, saveSignature } from "../../session-utils";
import { SATPSession } from "../../../core/satp-session";
import { SATPService, ISATPClientServiceOptions } from "../../../types/satp-protocol";

export class Stage2ClientService implements SATPService {
  public static readonly CLASS_NAME = "Stage2Service-Client";
  private _log: Logger;
  private signer: JsObjectSigner;
  
  constructor(ops: ISATPClientServiceOptions) {
    const level = "INFO";
    const label = Stage2ClientService.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
    this.signer = ops.signer;

  }

  public get className(): string {
    return Stage2ClientService.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async lockAssertionRequest(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): Promise<void | LockAssertionRequestMessage> {
    const fnTag = `${this.className}#lockAssertionRequest()`;
    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.LOCK_ASSERT;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
    );

    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const lockAssertionRequestMessage = new LockAssertionRequestMessage();
    lockAssertionRequestMessage.common = commonBody;

    lockAssertionRequestMessage.lockAssertionClaim =
      sessionData.lockAssertionClaim;
    lockAssertionRequestMessage.lockAssertionFormat =
      sessionData.lockAssertionFormat;

    const messageSignature = bufArray2HexStr(
      sign(this.signer, JSON.stringify(lockAssertionRequestMessage)),
    );

    lockAssertionRequestMessage.common.signature = messageSignature;

    saveSignature(sessionData, MessageType.LOCK_ASSERT, messageSignature);

    saveHash(
      sessionData,
      MessageType.LOCK_ASSERT,
      getHash(lockAssertionRequestMessage),
    );

    /*	
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "lockAssertionRequest",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */
    this.log.info(`${fnTag}, sending LockAssertionMessage...`);

    return lockAssertionRequestMessage;
  }
  

  checkTransferCommenceResponseMessage(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): void {
    const fnTag = `${this.className}#lockAssertionRequestMessage()`;

    if (
      response.common == undefined ||
      response.common.version == undefined ||
      response.common.messageType == undefined ||
      response.common.sessionId == undefined ||
      // request.common.transferContextId == undefined ||
      response.common.sequenceNumber == undefined ||
      response.common.resourceUrl == undefined ||
      // request.common.actionResponse == undefined ||
      // request.common.payloadProfile == undefined ||
      // request.common.applicationProfile == undefined ||
      response.common.signature == undefined ||
      response.common.clientGatewayPubkey == undefined ||
      response.common.serverGatewayPubkey == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(`${fnTag}, session data was not load correctly`);
    }

    if (
      response.common.serverGatewayPubkey != sessionData.serverGatewayPubkey
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (
      response.common.clientGatewayPubkey != sessionData.clientGatewayPubkey
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    if (
      !verifySignature(
        this.signer,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse message signature verification failed`,
      );
    }

    if (response.common.messageType != MessageType.TRANSFER_COMMENCE_RESPONSE) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceResponse `,
      );
    }

    if (
      response.common.sequenceNumber !=
      sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse sequence number is wrong`,
      );
    }

    if (
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_RESPONSE)
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse previous message hash does not match the one that was sent`,
      );
    }

    this.log.info(`TransferCommenceResponse passed all checks.`);
  }
}
