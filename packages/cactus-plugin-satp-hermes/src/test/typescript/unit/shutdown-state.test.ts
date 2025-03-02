import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  SATPGateway,
  SATPGatewayConfig,
} from "../../../main/typescript/plugin-satp-hermes-gateway";
import { PluginFactorySATPGateway } from "../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import { 
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import {
  knexClientConnection,
  knexSourceRemoteConnection,
} from "../knex.config";
import { SATPSession } from "../../../main/typescript/core/satp-session";
import { 
  TransactRequest,
  TransactRequestSourceAsset
 } from "../../../main/typescript";

const logLevel: LogLevelDesc = "DEBUG";
const logger = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "satp-gateway-orchestrator-init-test",
});
const factoryOptions: IPluginFactoryOptions = {
  pluginImportType: PluginImportType.Local,
};
const factory = new PluginFactorySATPGateway(factoryOptions);

let mockSession: SATPSession;
const sessionIDs: string[] = [];

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  mockSession = new SATPSession({
      contextID: "MOCK_CONTEXT_ID",
      server: false,
      client: true,
    });
  
  sessionIDs.push(mockSession.getSessionId());
});

describe("Shutdown Verify State Tests", () => {
  test("Gateway waits to verify the sessions state before shutdown", async () => {
    const options: SATPGatewayConfig = {
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        connectedDLTs: [],
        proofID: "mockProofID10",
        gatewayServerPort: 3014,
        gatewayClientPort: 3015,
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
  
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
  
    const verifySessionsStateSpy = jest.spyOn(gateway as any, "verifySessionsState");
  
    const shutdownBLOServerSpy = jest.spyOn(gateway as any, "shutdownBLOServer");

    await gateway.startup();
    await gateway.shutdown();
 
    expect(verifySessionsStateSpy).toHaveBeenCalled();

    expect(shutdownBLOServerSpy).toHaveBeenCalled();

    verifySessionsStateSpy.mockRestore();
    shutdownBLOServerSpy.mockRestore();
  });

  test("Gateway waits for pending sessions to complete before shutdown", async () => {
    const options: SATPGatewayConfig = {
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        connectedDLTs: [],
        proofID: "mockProofID10",
        gatewayServerPort: 3014,
        gatewayClientPort: 3015,
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
  
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
  
    const satpManager = (gateway as any).BLODispatcher.manager;

    let sessionState = false;
    satpManager.getSessions().set(mockSession.getSessionId(), mockSession);

    await gateway.startup();

    const shutdownPromise = gateway.shutdown();

    const initialSessionState = await satpManager.getSATPSessionState();
    expect(initialSessionState).toBe(false);
  
    const getSATPSessionStateSpy = jest
      .spyOn(satpManager, "getSATPSessionState")
      .mockImplementation(async () => {
        if (!sessionState) {
          await new Promise((resolve) => setTimeout(resolve, 20000)); 
          sessionState = true;
        }
        return sessionState;
      });
    
    await shutdownPromise;

    const finalSessionState = await satpManager.getSATPSessionState();
    expect(finalSessionState).toBe(true); 

    getSATPSessionStateSpy.mockRestore();
    
  });

  test("Gateway does not allow new transactions after shutdown is initiated", async () => {
    const options: SATPGatewayConfig = {
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        connectedDLTs: [],
        proofID: "mockProofID10",
        gatewayServerPort: 3014,
        gatewayClientPort: 3015,
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
  
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
  
    await gateway.startup();
  
    const shutdownPromise = gateway.shutdown();

    const transactRequestSourceAsset: TransactRequestSourceAsset = {
      owner: "mockOwner",
      ontology: "mockOntology",
      contractName: "mockContractName",
    };
  
    const transactRequest: TransactRequest = {
      contextID: "mockContextID",
      fromDLTNetworkID: "mockFromDLTNetworkID",
      toDLTNetworkID: "mockToDLTNetworkID",
      fromAmount: "100",
      toAmount: "100",
      beneficiaryPubkey: "mockBeneficiaryPubkey",
      originatorPubkey: "mockOriginatorPubkey",
      sourceAsset: transactRequestSourceAsset,
      receiverAsset: transactRequestSourceAsset,
    };
  
    await expect(gateway.BLODispatcherInstance?.Transact(transactRequest)).rejects.toThrow("BLODispatcher#transact(), shutdown initiated not receiving new requests");
  
    await shutdownPromise;
  });
});

