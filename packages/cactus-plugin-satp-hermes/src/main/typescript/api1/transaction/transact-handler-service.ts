import { TransactRequest, TransactResponse } from "../../public-api";
import { SATPManager, SATPSession } from "../../services/gateway/satp-manager";
import { populateClientSessionData } from "../../core/session-utils";
import {
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { GatewayOrchestrator } from "../../services/gateway/gateway-orchestrator";
import { GatewayIdentity } from "../../core/types";
import { SATP_VERSION } from "../../core/constants";
import { getStatusService } from "../admin/get-status-handler-service";

/**
 * Populates a new or existing session with all necessary
 * client-side transaction data from the request and gateway configuration.
 * This function encapsulates all data setup logic, making the main execution
 * function cleaner.
 *
 * @param {LogLevelDesc} logLevel The desired log level for the function.
 * @param {TransactRequest} req The incoming transaction request.
 * @param {SATPManager} manager The SATP manager instance.
 * @param {GatewayOrchestrator} orchestrator The Gateway Orchestrator instance.
 * @returns {Promise<SATPSession>} A promise that resolves with the fully populated session object.
 */
export async function populateSession(
  logLevel: LogLevelDesc,
  req: TransactRequest,
  manager: SATPManager,
  orchestrator: GatewayOrchestrator,
): Promise<SATPSession> {
  const fnTag = `populateSession()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, populating session data`);

  //TODO check input for valid strings...
  const ourGateway: GatewayIdentity = orchestrator.ourGateway;
  const senderGatewayOwnerId: string = ourGateway.id;

  //This data is set in satpManager GOL
  const serverGatewayPubkey: string = "";
  const receiverGatewayOwnerId: string = "";

  //Default, make it configurable by injecting sign function
  const signatureAlgorithm: SignatureAlgorithm = SignatureAlgorithm.ECDSA;

  //Default, TODO
  const lockType: LockType = LockType.DESTROYBURN;
  //In milliseconds (5min)
  const lockExpirationTime: bigint = BigInt(1000 * 60 * 5);

  const credentialProfile: CredentialProfile = CredentialProfile.UNSPECIFIED;
  const loggingProfile: string = "MOCK_LOGGING_PROFILE";
  const accessControlProfile: string = "MOCK_ACCESS_CONTROL_PROFILE";

  //todo verify ontologies signatures, validation, etc.

  let session = manager.getOrCreateSession(undefined, req.contextID);

  // Populate the session with all required parameters
  session = populateClientSessionData(
    session,
    SATP_VERSION,
    req.sourceAsset.contractAddress,
    req.receiverAsset.contractAddress,
    manager.pubKey,
    serverGatewayPubkey,
    receiverGatewayOwnerId,
    senderGatewayOwnerId,
    signatureAlgorithm,
    lockType,
    lockExpirationTime,
    credentialProfile,
    loggingProfile,
    accessControlProfile,
    req.sourceAsset.amount,
    req.receiverAsset.amount,
    req.sourceAsset.mspId ? req.sourceAsset.mspId : "",
    req.sourceAsset.channelName ? req.sourceAsset.channelName : "",
    req.receiverAsset.mspId ? req.receiverAsset.mspId : "",
    req.receiverAsset.channelName ? req.receiverAsset.channelName : "",
    req.sourceAsset.contractName,
    req.receiverAsset.contractName,
    req.sourceAsset.owner,
    req.receiverAsset.owner,
    req.sourceAsset.networkId.id,
    req.sourceAsset.referenceId,
    req.sourceAsset.networkId.ledgerType,
    req.sourceAsset.tokenType,
    req.receiverAsset.networkId.id,
    req.receiverAsset.referenceId,
    req.receiverAsset.networkId.ledgerType,
    req.receiverAsset.tokenType,
  );

  return session;
}

/**
 * Executes the core transaction logic and retrieves the final status.
 * This part handles the business operations after the session has been
 * fully initialized and populated.
 *
 * @param {LogLevelDesc} logLevel The desired log level.
 * @param {TransactRequest} req The original transaction request.
 * @param {SATPManager} manager The SATP manager instance.
 * @param {SATPSession} session The previously initialized and populated session.
 * @returns {Promise<TransactResponse>} A promise that resolves with the final transaction response.
 */
export async function executeTransactCore(
  logLevel: LogLevelDesc,
  req: TransactRequest,
  manager: SATPManager,
  session: SATPSession,
): Promise<TransactResponse> {
  const fnTag = `executeTransactCore()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, executing transaction and retrieving status`);

  // Execute the transfer operation
  await manager.transfer(session);

  // Retrieve the status of the transaction
  const statusResponse = await getStatusService(
    logLevel,
    { sessionID: session.getSessionId() },
    manager,
  );

  logger.info(`${fnTag}, ${req}`);

  return {
    sessionID: session.getSessionId(),
    statusResponse: statusResponse,
  };
}

/**
 * The main orchestrator function for the `Transact` endpoint.
 * It coordinates the data population and the core execution logic.
 *
 * @param {LogLevelDesc} logLevel The desired log level.
 * @param {TransactRequest} req The incoming transaction request.
 * @param {SATPManager} manager The SATP manager instance.
 * @param {GatewayOrchestrator} orchestrator The Gateway Orchestrator instance.
 * @returns {Promise<TransactResponse>} A promise that resolves with the final transaction response.
 */
export async function executeTransact(
  logLevel: LogLevelDesc,
  req: TransactRequest,
  manager: SATPManager,
  orchestrator: GatewayOrchestrator,
): Promise<TransactResponse> {
  const fnTag = `executeTransact()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, starting transact orchestration`);

  // Step 1: Initialize and populate the session data
  const session = await populateSession(logLevel, req, manager, orchestrator);

  // Step 2: Execute the core transaction logic
  return executeTransactCore(logLevel, req, manager, session);
}
