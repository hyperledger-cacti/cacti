import { TransferCommenceResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  LockAssertionClaim,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LockAssertionRequestMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import { getMessageHash, saveHash, saveSignature } from "../../session-utils";
import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  ISATPClientServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { ISATPServiceOptions } from "../satp-service";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";

export class Stage2ClientService extends SATPService {
  public static readonly SATP_STAGE = "2";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage2ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage2ClientService.SERVICE_TYPE,
      bridgeManager: ops.bridgeManager,
    };
    super(commonOptions);

    if (ops.bridgeManager == undefined) {
      throw new Error(
        `${this.getServiceIdentifier()}#constructor(), bridgeManager is missing`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  async lockAssertionRequest(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): Promise<void | LockAssertionRequestMessage> {
    const stepTag = `lockAssertionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, lockAssertionRequest...`);

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
    lockAssertionRequestMessage.lockAssertionClaimFormat =
      sessionData.lockAssertionClaimFormat;

    if (sessionData.transferContextId != undefined) {
      lockAssertionRequestMessage.common.transferContextId =
        sessionData.transferContextId;
    }
    if (sessionData.clientTransferNumber != undefined) {
      lockAssertionRequestMessage.clientTransferNumber =
        sessionData.clientTransferNumber;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(lockAssertionRequestMessage)),
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
    this.Log.info(`${fnTag}, sending LockAssertionMessage...`);

    return lockAssertionRequestMessage;
  }

  checkTransferCommenceResponseMessage(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkTransferCommenceResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferCommenceResponseMessage...`);

    if (
      response.common == undefined ||
      response.common.version == undefined ||
      response.common.messageType == undefined ||
      response.common.sessionId == undefined ||
      response.common.sequenceNumber == undefined ||
      response.common.resourceUrl == undefined ||
      response.common.signature == undefined ||
      response.common.clientGatewayPubkey == undefined ||
      response.common.serverGatewayPubkey == undefined ||
      response.common.hashPreviousMessage == undefined
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
        this.Signer,
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

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(
        `${fnTag}, transferContextId does not match the one that was sent`,
      );
    }

    if (response.serverTransferNumber != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: serverTransferNumber...`,
      );
      sessionData.serverTransferNumber = response.serverTransferNumber;
    }

    this.Log.info(`${fnTag}, TransferCommenceResponse passed all checks.`);
  }

  async lockAsset(session: SATPSession): Promise<void> {
    const stepTag = `lockAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Locking Asset...`);
      const sessionData = session.getSessionData();
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountFromOriginator;

      this.Log.debug(`${fnTag}, Lock Asset ID: ${assetId} amount: ${amount}`);
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      // const bridge = this.bridgeManager.getBridge(
      //   sessionData.senderGatewayNetworkId,
      // );

      // sessionData.lockAssertionClaim = new LockAssertionClaim();
      // sessionData.lockAssertionClaim.receipt = await bridge.lockAsset(
      //   assetId,
      //   Number(amount),
      // );

      // sessionData.lockAssertionClaim.signature = bufArray2HexStr(
      //   sign(this.Signer, sessionData.lockAssertionClaim.receipt),
      // );
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process Lock Asset ${error}`);
    }
  }
}
