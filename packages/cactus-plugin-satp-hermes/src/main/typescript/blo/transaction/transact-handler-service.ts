import { Logger } from "@hyperledger/cactus-common";
import {
  TransactRequest,
  TransactResponse,
  Transact200ResponseStatusResponseOriginChain,
  StatusResponse,
} from "../../public-api";
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

// todo
export async function ExecuteTransact(
  logger: Logger,
  req: TransactRequest,
  manager: SATPManager,
  gol: GatewayOrchestrator,
): Promise<TransactResponse> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fn = "BLO#transact-handler-service#ExecuteTransact";

  //TODO check input for valid strings...
  const ourGateway: GatewayIdentity = gol.ourGateway;
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
    req.destinyAsset.contractAddress,
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
    req.destinyAsset.ontology,
    req.fromAmount,
    req.toAmount,
    req.sourceAsset.mspId ? req.sourceAsset.mspId : "",
    req.sourceAsset.channelName ? req.sourceAsset.channelName : "",
    req.destinyAsset.mspId ? req.destinyAsset.mspId : "",
    req.destinyAsset.channelName ? req.destinyAsset.channelName : "",
    req.sourceAsset.contractName,
    req.destinyAsset.contractName,
    req.sourceAsset.owner,
    req.destinyAsset.owner,
  );
  await manager.initiateTransfer(session);

  //mock
  const originChain: Transact200ResponseStatusResponseOriginChain = {
    dltProtocol: "besu",
    dltSubnetworkID: "v24.4.0-RC1",
  };

  const destinationChain: Transact200ResponseStatusResponseOriginChain = {
    dltProtocol: "besu",
    dltSubnetworkID: "v24.4.0-RC1",
  };

  const mock: StatusResponse = {
    status: "DONE",
    substatus: "COMPLETED",
    stage: "STAGE3",
    step: "transfer-complete-message",
    startTime: "2023-03-14T16:50:06.662Z",
    originChain: originChain,
    destinationChain: destinationChain,
  };

  logger.info(req);
  // logger.error("GetStatusService not implemented");
  // throw new GetStatusError(req.sessionID, "GetStatusService not implemented");

  return {
    sessionID: session.getSessionId(),
    statusResponse: mock,
  };
}
