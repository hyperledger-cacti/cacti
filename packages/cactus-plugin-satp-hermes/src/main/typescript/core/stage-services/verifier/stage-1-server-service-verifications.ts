/**
 * @fileoverview
 * Stage 1 server-side verification helpers for the SATP protocol.
 *
 * @description
 * These functions layer the Stage 1 server-specific validation on top of the
 * stage-agnostic {@link verifyMessage} entry point. Keeping the bespoke checks
 * here (network capabilities, transfer-init claims, DLT support, and the
 * transfer-init-claims hash) keeps the Stage 1 server service step
 * implementations thin.
 *
 * @since 3.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 */

import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { getHash } from "../../../utils/gateway-utils";
import {
  MessageType,
  LockType,
  type NetworkCapabilities,
  type TransferClaims,
} from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type {
  TransferProposalRequest,
  TransferCommenceRequest,
} from "../../../generated/proto/cacti/satp/v13/service/stage_1_pb";
import {
  State,
  type SessionData,
} from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import type { SATPSession } from "../../satp-session";
import type { SATPLogger as Logger } from "../../satp-logger";
import {
  SessionType,
  TimestampType,
  saveHash,
  saveTimestamp,
} from "../../session-utils";
import {
  DLTNotSupportedError,
  NetworkCapabilitiesError,
  SessionError,
  TransferInitClaimsError,
} from "../../errors/satp-service-errors";
import type { NetworkId } from "../../../services/network-identification/chainid-list";
import { isTLS13Suite } from "../service-utils";
import { verifyMessage } from "./data-verifier";

/**
 * Validates the network capabilities carried by a Stage 1 proposal request.
 *
 * @param tag - Context tag for error reporting
 * @param networkCapabilities - The capabilities block from the request
 * @throws {NetworkCapabilitiesError} When missing or advertising a non-TLS-1.3 scheme
 */
export function checkNetworkCapabilities(
  tag: string,
  networkCapabilities: NetworkCapabilities | undefined,
): void {
  if (networkCapabilities == undefined) {
    throw new NetworkCapabilitiesError(tag);
  }
  if (networkCapabilities.networkLockType == LockType.UNSPECIFIED) {
    throw new NetworkCapabilitiesError(tag, "networkLockType is unspecified");
  }
  if (!isTLS13Suite(networkCapabilities.gatewayTlsScheme)) {
    throw new NetworkCapabilitiesError(
      tag,
      `Unsupported TLS scheme: ${networkCapabilities.gatewayTlsScheme}`,
    );
  }
}

/**
 * Validates the transfer-init claims carried by a Stage 1 proposal request.
 *
 * @param tag - Context tag for error reporting
 * @param transferClaims - The claims block from the request
 * @param logger - Logger used to report missing mandatory/optional fields
 * @returns `true` when the proposal is acceptable, `false` when it must be rejected
 * @throws {TransferInitClaimsError} When the claims block is missing
 */
export function checkTransferClaims(
  tag: string,
  transferClaims: TransferClaims | undefined,
  logger: Logger,
): boolean {
  if (transferClaims == undefined) {
    throw new TransferInitClaimsError(tag);
  }
  if (transferClaims.digitalAssetId == "") {
    logger.error(`${tag}, digitalAssetId is missing`);
  }
  if (transferClaims.assetProfileId == "") {
    logger.error(`${tag}, assetProfileId is missing`);
  }
  if (transferClaims.verifiedOriginatorEntityId == "") {
    logger.error(`${tag}, verifiedOriginatorEntityId is missing`);
  }
  if (transferClaims.verifiedBeneficiaryEntityId == "") {
    logger.error(`${tag}, verifiedBeneficiaryEntityId is missing`);
  }
  if (transferClaims.senderGatewayNetworkId != "") {
    logger.info(`${tag}, optional variable senderGatewayNetworkId loaded`);
  }
  if (transferClaims.recipientGatewayNetworkId != "") {
    logger.info(`${tag}, optional variable recipientGatewayNetworkId loaded`);
  }
  if (transferClaims.senderGatewaySignaturePublicKey == "") {
    logger.error(`${tag}, senderGatewaySignaturePublicKey is missing`);
    return false;
  }
  if (transferClaims.receiverGatewaySignaturePublicKey == "") {
    logger.error(`${tag}, receiverGatewaySignaturePublicKey is missing`);
    return false;
  }
  if (transferClaims.senderGatewayOwnerId != "") {
    logger.info(`${tag}, optional variable senderGatewayOwnerId loaded`);
  }
  if (transferClaims.receiverGatewayOwnerId != "") {
    logger.info(`${tag}, optional variable receiverGatewayOwnerId loaded`);
  }
  return true;
}

/**
 * Full Stage 1 server verification of an incoming `TransferProposalRequest`.
 *
 * It runs the bespoke capability/claims/DLT checks, populates the server
 * session data from the request, then delegates the common message checks
 * (session state, common body, signature) to {@link verifyMessage}.
 *
 * @returns The resolved session data and whether the proposal was rejected.
 *   When `rejected` is `true` the session state is set to {@link State.REJECTED}
 *   and the caller should stop processing.
 * @throws {SessionError} When the session is undefined
 * @throws {NetworkCapabilitiesError} When capabilities are invalid
 * @throws {TransferInitClaimsError} When mandatory claims/session assets are missing
 * @throws {DLTNotSupportedError} When the receiver ledger is not supported
 */
export function verifyTransferProposalRequestMessage(
  tag: string,
  signer: JsObjectSigner,
  request: TransferProposalRequest,
  session: SATPSession | undefined,
  supportedDLTs: NetworkId[],
  logger: Logger,
): { sessionData: SessionData; rejected: boolean } {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  const sessionData = session.getServerSessionData();

  checkNetworkCapabilities(tag, request.networkCapabilities);

  if (checkTransferClaims(tag, request.transferInitClaims, logger)) {
    logger.info(`${tag}, TransferProposalRequest was accepted...`);
  } else {
    logger.info(`${tag}, TransferProposalRequest was rejected...`);
    sessionData.state = State.REJECTED;
    return { sessionData, rejected: true };
  }

  if (sessionData.receiverAsset == undefined) {
    throw new TransferInitClaimsError(tag);
  }
  if (sessionData.receiverAsset?.networkId == undefined) {
    throw new TransferInitClaimsError(tag);
  }

  const receiverId = sessionData.receiverAsset?.networkId?.id;

  if (!supportedDLTs.map((id) => id.id).includes(receiverId)) {
    throw new DLTNotSupportedError(tag, receiverId);
  }

  sessionData.version = request.common!.version;
  sessionData.digitalAssetId = request.transferInitClaims!.digitalAssetId;
  sessionData.senderGatewayNetworkId =
    request.transferInitClaims!.senderGatewayNetworkId;
  sessionData.recipientGatewayNetworkId =
    request.transferInitClaims!.recipientGatewayNetworkId;
  sessionData.clientGatewayPubkey =
    request.transferInitClaims!.senderGatewaySignaturePublicKey;
  sessionData.serverGatewayPubkey =
    request.transferInitClaims!.receiverGatewaySignaturePublicKey;
  sessionData.receiverGatewayOwnerId =
    request.transferInitClaims!.receiverGatewayOwnerId;
  sessionData.senderGatewayOwnerId =
    request.transferInitClaims!.senderGatewayOwnerId;
  sessionData.signatureAlgorithm =
    request.networkCapabilities!.gatewayDefaultSignatureAlgorithm;
  sessionData.lockType = request.networkCapabilities!.networkLockType;
  sessionData.lockExpirationTime =
    request.networkCapabilities!.networkLockExpirationTime;
  sessionData.gatewayTlsScheme = request.networkCapabilities!.gatewayTlsScheme;

  // INIT_PROPOSAL is the first Stage 1 message, so there is no hash chain yet.
  verifyMessage(
    tag,
    signer,
    request,
    session,
    SessionType.SERVER,
    MessageType.INIT_PROPOSAL,
    { checkHashPrevMessage: false },
  );

  saveHash(sessionData, MessageType.INIT_PROPOSAL, getHash(request));
  saveTimestamp(sessionData, MessageType.INIT_PROPOSAL, TimestampType.RECEIVED);

  return { sessionData, rejected: false };
}

/**
 * Full Stage 1 server verification of an incoming `TransferCommenceRequest`.
 *
 * Delegates the common checks to {@link verifyMessage} (including the
 * `hashPrevMessage` link back to `INIT_RECEIPT`), then validates the
 * transfer-init-claims hash before advancing the session.
 *
 * @returns The resolved server session data.
 * @throws {TransferInitClaimsHashError} When the claims hash is empty or mismatched
 */
export function verifyTransferCommenceRequestMessage(
  tag: string,
  signer: JsObjectSigner,
  request: TransferCommenceRequest,
  session: SATPSession | undefined,
): SessionData {
  const sessionData = verifyMessage(
    tag,
    signer,
    request,
    session,
    SessionType.SERVER,
    MessageType.TRANSFER_COMMENCE_REQUEST,
    {
      hashPrevMessage: request.hashPrevMessage,
      previousMessageType: MessageType.INIT_RECEIPT,
      hashTransferInitClaims: request.hashTransferInitClaims,
    },
  );

  saveHash(
    sessionData,
    MessageType.TRANSFER_COMMENCE_REQUEST,
    getHash(request),
  );
  saveTimestamp(
    sessionData,
    MessageType.TRANSFER_COMMENCE_REQUEST,
    TimestampType.RECEIVED,
  );

  sessionData.state = State.ONGOING;

  return sessionData;
}
