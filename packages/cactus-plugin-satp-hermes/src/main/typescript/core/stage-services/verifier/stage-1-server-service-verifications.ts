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
import { State } from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import type { SATPSession } from "../../satp-session";
import type { SATPLogger as Logger } from "../../satp-logger";
import { SessionType } from "../../session-utils";
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
 * Per draft-ietf-satp-core-13, every field checked here is REQUIRED: a
 * proposal with any of them missing must be rejected, not merely logged.
 * Optional fields are accepted when empty and only logged.
 *
 * @param tag - Context tag for error reporting
 * @param transferClaims - The claims block from the request
 * @param logger - Logger used to report missing optional fields
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
    return false;
  }
  if (transferClaims.assetProfileId == "") {
    logger.error(`${tag}, assetProfileId is missing`);
    return false;
  }
  if (transferClaims.verifiedOriginatorEntityId == "") {
    logger.error(`${tag}, verifiedOriginatorEntityId is missing`);
    return false;
  }
  if (transferClaims.verifiedBeneficiaryEntityId == "") {
    logger.error(`${tag}, verifiedBeneficiaryEntityId is missing`);
    return false;
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
 * Stage 1 server validation of an incoming `TransferProposalRequest`.
 *
 * Runs the bespoke capability/claims/DLT checks and reports whether the
 * proposal must be rejected. Populating the session from the request and
 * validating the common body/signature are performed separately by the caller
 * (see {@link verifyTransferProposalRequestSignature}), because the signature
 * check relies on the gateway public keys the caller writes to the session.
 *
 * @returns `true` when the proposal must be rejected.
 * @throws {SessionError} When the session is undefined
 * @throws {NetworkCapabilitiesError} When capabilities are invalid
 * @throws {TransferInitClaimsError} When mandatory claims/session assets are missing
 * @throws {DLTNotSupportedError} When the receiver ledger is not supported
 */
export function verifyTransferProposalRequestMessage(
  tag: string,
  request: TransferProposalRequest,
  session: SATPSession | undefined,
  supportedDLTs: NetworkId[],
  logger: Logger,
): boolean {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  const sessionData = session.getServerSessionData();

  checkNetworkCapabilities(tag, request.networkCapabilities);

  if (checkTransferClaims(tag, request.transferInitClaims, logger)) {
    logger.info(`${tag}, TransferProposalRequest was accepted...`);
  } else {
    logger.info(`${tag}, TransferProposalRequest was rejected...`);
    return true;
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

  return false;
}

/**
 * Validates the common body and signature of a `TransferProposalRequest`.
 *
 * Must run after the caller has populated the session from the request, since
 * the signature check relies on the gateway public keys stored on the session.
 *
 * @throws {SessionError} When the session is undefined
 */
export function verifyTransferProposalRequestSignature(
  tag: string,
  signer: JsObjectSigner,
  request: TransferProposalRequest,
  session: SATPSession | undefined,
): void {
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
}

export function verifyTransferProposalResponse(
  tag: string,
  session: SATPSession | undefined,
): void {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  const sessionData = session.getServerSessionData();
  session.verify(tag, SessionType.SERVER, sessionData.state == State.REJECTED);
}

export function verifyTransferCommenceResponse(
  tag: string,
  session: SATPSession | undefined,
): void {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  session.verify(tag, SessionType.SERVER);
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
): void {
  verifyMessage(
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
}
