import { Logger } from "@hyperledger/cactus-common";
import { TransactRequest, TransactResponse } from "../../public-api";
import { SATPManager } from "../../gol/satp-manager";
import { populateClientSessionData } from "../../core/session-utils";
import {
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { GatewayOrchestrator } from "../../gol/gateway-orchestrator";
import { GatewayIdentity } from "../../core/types";
import { SATP_VERSION } from "../../core/constants";
import { GetStatusService } from "../admin/get-status-handler-service";

// todo
export async function ExecuteTransact(
  logger: Logger,
  req: TransactRequest,
  manager: SATPManager,
  orchestrator: GatewayOrchestrator,
): Promise<TransactResponse> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fn = "BLO#transact-handler-service#ExecuteTransact";

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
  session = populateClientSessionData(
    session,
    SATP_VERSION,
    req.sourceAsset.contractAddress,
    req.receiverAsset.contractAddress,
    req.originatorPubkey,
    req.beneficiaryPubkey,
    req.fromDLTNetworkID,
    req.toDLTNetworkID,
    manager.pubKey,
    serverGatewayPubkey,
    receiverGatewayOwnerId,
    senderGatewayOwnerId,
    signatureAlgorithm,
    lockType,
    lockExpirationTime,
    credentialProfile,
    loggingProfile ? loggingProfile : "",
    accessControlProfile,
    req.sourceAsset.ontology,
    req.receiverAsset.ontology,
    req.fromAmount,
    req.toAmount,
    req.sourceAsset.mspId ? req.sourceAsset.mspId : "",
    req.sourceAsset.channelName ? req.sourceAsset.channelName : "",
    req.receiverAsset.mspId ? req.receiverAsset.mspId : "",
    req.receiverAsset.channelName ? req.receiverAsset.channelName : "",
    req.sourceAsset.contractName,
    req.receiverAsset.contractName,
    req.sourceAsset.owner,
    req.receiverAsset.owner,
  );
  await manager.initiateTransfer(session);

  logger.info(req);
  // logger.error("GetStatusService not implemented");
  // throw new GetStatusError(req.sessionID, "GetStatusService not implemented");

  return {
    sessionID: session.getSessionId(),
    statusResponse: await GetStatusService(
      logger,
      { sessionID: session.getSessionId() },
      manager,
    ),
  };
}
