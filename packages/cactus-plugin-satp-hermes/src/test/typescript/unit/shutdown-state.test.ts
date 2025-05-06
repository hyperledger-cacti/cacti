import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
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
import { SATPSession } from "../../../main/typescript/core/satp-session";
import {
  TransactRequest,
  TransactRequestSourceAsset,
} from "../../../main/typescript";
import { PluginRegistry } from "@hyperledger/cactus-core";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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
let gateway: SATPGateway | undefined; //added
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
  //added
  afterEach(async () => {
    if (gateway) {
      try {
        await gateway.shutdown();
      } catch (err) {
        logger.error("Error shutting down gateway in afterEach:", err);
      }
      gateway = undefined;
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test("Gateway waits to verify the sessions state before shutdown", async () => {
    const ontologiesPath = path.join(__dirname, "../../ontologies");
    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [] }),
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
      ontologyPath: ontologiesPath,
      logLevel: logLevel,
    };

    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const verifySessionsStateSpy = jest.spyOn(
      gateway as any,
      "verifySessionsState",
    );

    const shutdownBLOServerSpy = jest.spyOn(gateway as any, "shutdown");

    //const gatewayOrchestratorInstance = (gateway as any).gatewayOrchestrator; //added
    //jest.spyOn(gatewayOrchestratorInstance, "disconnectAll").mockResolvedValue();//added

    await gateway.startup();
    await gateway.shutdown();

    expect(verifySessionsStateSpy).toHaveBeenCalled();

    expect(shutdownBLOServerSpy).toHaveBeenCalled();

    verifySessionsStateSpy.mockRestore();
    shutdownBLOServerSpy.mockRestore();
  }, 20000);

  test("Gateway waits for pending sessions to complete before shutdown", async () => {
    jest.useFakeTimers();

    const ontologiesPath = path.join(__dirname, "../../ontologies");
    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [] }),
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
      ontologyPath: ontologiesPath,
      logLevel: logLevel,
    };

    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const satpManager = (gateway as any).BLODispatcher.manager;

    satpManager.getSessions().set(mockSession.getSessionId(), mockSession);

    await gateway.startup();

    let callCount = 0;
    const getSATPSessionStateSpy = jest
      .spyOn(satpManager, "getSATPSessionState")
      .mockImplementation(async () => {
        callCount++;
        // false for first 3 calls, then true
        return callCount > 3;
      });

    // Start shutdown (which waits for sessions to conclude)
    const shutdownPromise = gateway.shutdown();

    // Check initial session state (should be false)
    const initialSessionState = await satpManager.getSATPSessionState();
    expect(initialSessionState).toBe(false);

    // Advance timers and let scheduled job run enough times to return true
    for (let i = 0; i < 4; i++) {
      jest.advanceTimersByTime(20000); // 20 seconds cron interval
      await Promise.resolve(); // wait a tick so async code executes
    }

    await shutdownPromise;

    // Final session state should be true
    const finalSessionState = await satpManager.getSATPSessionState();
    expect(finalSessionState).toBe(true);

    getSATPSessionStateSpy.mockRestore();

    jest.useRealTimers();
  });

  test("Gateway does not allow new transactions after shutdown is initiated", async () => {
    const ontologiesPath = path.join(__dirname, "../../ontologies");
    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [] }),
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
      ontologyPath: ontologiesPath,
      logLevel: logLevel,
    };

    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    await gateway.startup();

    const shutdownPromise = gateway.shutdown();

    const transactRequestSourceAsset: TransactRequestSourceAsset = {
      owner: "mockOwner",
      contractName: "mockContractName",
      id: "",
      networkId: {
        id: "mockNetworkId",
        ledgerType: LedgerType.Ethereum,
      },
      tokenType: "ERC20",
      referenceId: "",
      amount: "100",
    };

    const transactRequest: TransactRequest = {
      contextID: "mockContextID",
      sourceAsset: transactRequestSourceAsset,
      receiverAsset: transactRequestSourceAsset,
    };

    await expect(
      gateway.BLODispatcherInstance?.Transact(transactRequest),
    ).rejects.toThrow(
      "BLODispatcher#transact(), shutdown initiated not receiving new requests",
    );

    await shutdownPromise;
  });
});
//added
