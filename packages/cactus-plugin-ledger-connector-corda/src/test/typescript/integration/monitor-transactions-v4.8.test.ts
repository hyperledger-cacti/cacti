/**
 * Test state change monitoring interface in Kotlin Corda v4 connector component.
 */

// Contants: Log Levels
const testLogLevel: LogLevelDesc = "debug";
const sutLogLevel: LogLevelDesc = "info";

// Contants: Test ledger
const ledgerImageName =
  "ghcr.io/hyperledger/cactus-corda-4-8-all-in-one-obligation";
const ledgerImageVersion = "2022-03-31-28f0cbf--1956";
const partyARpcUsername = "user1";
const partyARpcPassword = "password";
const partyBRpcUsername = partyARpcUsername;
const partyBRpcPassword = partyARpcPassword;
const stateToMonitor = "net.corda.samples.example.states.IOUState";
const flowToInvoke = "net.corda.samples.example.flows.ExampleFlow$Initiator";
const testAppId = "monitor-transactions-test-app";

// Contants: Kotlin connector server
const kotlinServerImageName =
  "ghcr.io/hyperledger/cactus-connector-corda-server";
const kotlinServerImageVersion = "2022-05-26-0ff7407--pr-2021";

import "jest-extended";
import { v4 as internalIpV4 } from "internal-ip";

import {
  CordaTestLedger,
  SampleCordappEnum,
  CordaConnectorContainer,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  CordappDeploymentConfig,
  FlowInvocationType,
  InvokeContractV1Request,
  JvmTypeKind,
  PublicKey,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { CordaApiClient } from "../../../main/typescript/api-client/corda-api-client";
import { Configuration } from "@hyperledger/cactus-core-api";
import { Subscription } from "rxjs";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "kotlin-server-monitor-transactions-v4.8.test",
  level: testLogLevel,
});

//////////////////////////////////
// Helper Functions
//////////////////////////////////

async function deployContract(
  apiClient: CordaApiClient,
  ledger: CordaTestLedger,
  rpcPort: number,
  internalIp: string,
) {
  log.info("deployContract() called...");

  const sshConfig = await ledger.getSshConfig();
  const corDappsDirPartyA = await ledger.getCorDappsDirPartyA();

  const cdcA: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyA,
    cordaNodeStartCmd: "supervisorctl start corda-a",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/",
    rpcCredentials: {
      hostname: internalIp,
      port: rpcPort,
      username: partyARpcUsername,
      password: partyARpcPassword,
    },
    sshCredentials: {
      hostKeyEntry: "foo",
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const partyBRpcPort = await ledger.getRpcBPublicPort();
  const corDappsDirPartyB = await ledger.getCorDappsDirPartyB();

  const cdcB: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyB,
    cordaNodeStartCmd: "supervisorctl start corda-b",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/",
    rpcCredentials: {
      hostname: internalIp,
      port: partyBRpcPort,
      username: partyBRpcUsername,
      password: partyBRpcPassword,
    },
    sshCredentials: {
      hostKeyEntry: "foo",
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const cordappDeploymentConfigs: CordappDeploymentConfig[] = [cdcA, cdcB];
  log.debug("cordappDeploymentConfigs:", cordappDeploymentConfigs);

  const jarFiles = await ledger.pullCordappJars(
    SampleCordappEnum.BASIC_CORDAPP,
  );
  expect(jarFiles).toBeTruthy();

  const deployRes = await apiClient.deployContractJarsV1({
    jarFiles,
    cordappDeploymentConfigs,
  });
  expect(deployRes.data.deployedJarFiles.length).toBeGreaterThan(0);

  const flowsRes = await apiClient.listFlowsV1();
  expect(flowsRes.data.flowNames).toContain(flowToInvoke);
}

async function invokeContract(apiClient: CordaApiClient, publicKey: PublicKey) {
  const req: InvokeContractV1Request = {
    timeoutMs: 60000,
    flowFullClassName: flowToInvoke,
    flowInvocationType: FlowInvocationType.FlowDynamic,
    params: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.Integer",
        },
        primitiveValue: 42,
      },
      {
        jvmTypeKind: JvmTypeKind.Reference,
        jvmType: {
          fqClassName: "net.corda.core.identity.Party",
        },
        jvmCtorArgs: [
          {
            jvmTypeKind: JvmTypeKind.Reference,
            jvmType: {
              fqClassName: "net.corda.core.identity.CordaX500Name",
            },
            jvmCtorArgs: [
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "ParticipantB",
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "New York",
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "US",
              },
            ],
          },
          {
            jvmTypeKind: JvmTypeKind.Reference,
            jvmType: {
              fqClassName:
                "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl",
            },
            jvmCtorArgs: [
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: publicKey?.algorithm,
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: publicKey?.format,
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: publicKey?.encoded,
              },
            ],
          },
        ],
      },
    ],
  } as unknown as InvokeContractV1Request;

  const res = await apiClient.invokeContractV1(req);
  expect(res).toBeTruthy();
  expect(res.status).toBe(200);
  expect(res.data.success).toBeTrue();
}

//////////////////////////////////
// Monitor Tests
//////////////////////////////////

describe("Monitor Tests", () => {
  let ledger: CordaTestLedger;
  let connector: CordaConnectorContainer;
  let apiClient: CordaApiClient;
  let partyBPublicKey: PublicKey;

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    ledger = new CordaTestLedger({
      imageName: ledgerImageName,
      imageVersion: ledgerImageVersion,
      logLevel: testLogLevel,
    });

    const ledgerContainer = await ledger.start();
    expect(ledgerContainer).toBeTruthy();
    log.debug("Corda ledger started...");

    await ledger.logDebugPorts();
    const partyARpcPort = await ledger.getRpcAPublicPort();

    const internalIp = (await internalIpV4()) as string;
    expect(internalIp).toBeTruthy();
    log.info("Internal IP (based on default gateway):", internalIp);

    const springAppConfig = {
      logging: {
        level: {
          root: "info",
          "net.corda": "info",
          "org.hyperledger.cactus": sutLogLevel,
        },
      },
      cactus: {
        threadCount: 2,
        sessionExpireMinutes: 10,
        corda: {
          node: { host: internalIp },
          rpc: {
            port: partyARpcPort,
            username: partyARpcUsername,
            password: partyARpcPassword,
          },
        },
      },
    };
    const springApplicationJson = JSON.stringify(springAppConfig);
    const envVarSpringAppJson = `SPRING_APPLICATION_JSON=${springApplicationJson}`;
    log.debug(envVarSpringAppJson);

    connector = new CordaConnectorContainer({
      logLevel: sutLogLevel,
      imageName: kotlinServerImageName,
      imageVersion: kotlinServerImageVersion,
      envVars: [envVarSpringAppJson],
    });
    expect(connector).toBeTruthy();

    await connector.start();
    await connector.logDebugPorts();
    const apiUrl = await connector.getApiLocalhostUrl();

    const config = new Configuration({ basePath: apiUrl });
    apiClient = new CordaApiClient(config);
    expect(apiClient).toBeTruthy();

    await deployContract(apiClient, ledger, partyARpcPort, internalIp);

    log.info("Fetching network map for Corda network...");
    const networkMapRes = await apiClient.networkMapV1();
    expect(networkMapRes.data).toBeTruthy();

    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some((li) => li.name.organisation === "ParticipantB"),
    );
    partyBPublicKey = partyB?.legalIdentities[0].owningKey as PublicKey;
    expect(partyBPublicKey).toBeTruthy();
  });

  afterAll(async () => {
    if (ledger) {
      await ledger.stop();
      await ledger.destroy();
    }

    if (connector) {
      await connector.stop();
      await connector.destroy();
    }
  });

  describe("Low-level StartMonitor and StopMonitor tests", () => {
    afterEach(async () => {
      // Stop monitor
      await apiClient.stopMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
    });

    test("Transactions can be read repeatedly until cleared or monitoring stop", async () => {
      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Get transactions before invoke - should be 0
      const resGetTxPre = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxPre.status).toBe(200);
      expect(resGetTxPre.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPre.data.tx?.length).toBe(0);

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions after invoke
      const resGetTxPost = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxPost.status).toBe(200);
      expect(resGetTxPost.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPost.data.tx?.length).toBe(transactionCount);
      const seenIndexes = new Set<string>();
      resGetTxPost.data.tx?.forEach((tx) => {
        expect(tx.index).toBeTruthy();
        // Expect indexes to be unique
        expect(seenIndexes).not.toContain(tx.index);
        seenIndexes.add(tx.index as string);
        expect(tx.data).toBeTruthy();
      });

      // Get transactions after already reading all current ones - should be the same as before
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostRead.data.tx).toEqual(resGetTxPost.data.tx);
    });

    test("Received transactions can be cleared so they can't be read anymore", async () => {
      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions after invoke
      const resGetTx = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTx.status).toBe(200);
      expect(resGetTx.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTx.data.tx?.length).toBe(transactionCount);

      // Clear seen transactions
      const readTxIdx = resGetTx.data.tx?.map((tx) => tx.index);
      const resClearTx = await apiClient.clearMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
        txIndexes: readTxIdx as string[],
      });
      expect(resClearTx.status).toBe(200);
      expect(resClearTx.data.success).toBeTrue();

      // Get transactions after clear - should be 0
      const resGetTxPostClear = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxPostClear.status).toBe(200);
      expect(resGetTxPostClear.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostClear.data.tx?.length).toBe(0);
    });

    test("Sending startMonitor repeatedly doesn't affect monitor results", async () => {
      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke first transactions
      const firstTransactionCount = 3;
      for (let i = 0; i < firstTransactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Start monitor once again
      const resMonitorAgain = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitorAgain.status).toBe(200);
      expect(resMonitorAgain.data.success).toBeTrue();

      // Invoke second transactions
      const secondTransactionCount = 3;
      for (let i = 0; i < secondTransactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get final transactions
      const resGetTx = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTx.status).toBe(200);
      expect(resGetTx.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTx.data.tx?.length).toEqual(
        firstTransactionCount + secondTransactionCount,
      );
    });

    test("Monitoring restart after previous stop works", async () => {
      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Stop Monitor
      const resStopMonitor = await apiClient.stopMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resStopMonitor.status).toBe(200);
      expect(resStopMonitor.data.success).toBeTrue();

      // Restart Monitor
      const resMonitorRestart = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitorRestart.status).toBe(200);
      expect(resMonitorRestart.data.success).toBeTrue();

      // Invoke transactions after restart
      const transactionCountAfterRestart = 2;
      for (let i = 0; i < transactionCountAfterRestart; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions should return only new transactions
      const resGetTxPostRestart = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxPostRestart.status).toBe(200);
      expect(resGetTxPostRestart.data.stateFullClassName).toEqual(
        stateToMonitor,
      );
      expect(resGetTxPostRestart.data.tx?.length).toBe(
        transactionCountAfterRestart,
      );
    });

    test("Monitor returns only transactions after monitor was started, not previous ones", async () => {
      // Invoke initial transactions
      const transactionCountFirst = 5;
      for (let i = 0; i < transactionCountFirst; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions after start
      const transactionCountAfterStart = 2;
      for (let i = 0; i < transactionCountAfterStart; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions
      const resGetTx = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTx.status).toBe(200);
      expect(resGetTx.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTx.data.tx?.length).toBe(transactionCountAfterStart);
    });

    test("Start monitoring with unknown state returns error", async () => {
      const unknownState = "foo.bar.non.existent";

      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: unknownState,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeFalse();
      expect(resMonitor.data.msg).toContain(unknownState);
    });

    test("Stop monitoring with unknown state does nothing and returns success", async () => {
      // Stop monitor
      const resStopMon = await apiClient.stopMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: "foo.bar.non.existent",
      });
      expect(resStopMon.status).toBe(200);
      expect(resStopMon.data.success).toBeTrue();
    });

    test("Reading / clearing transactions without monitor running returns an error", async () => {
      // Get transactions before start monitor
      const resGet = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGet.status).toBe(200);
      expect(resGet.data.success).toBeFalse();
      expect(resGet.data.msg).toBeTruthy();
      expect(resGet.data.stateFullClassName).toBeFalsy();
      expect(resGet.data.tx).toBeFalsy();

      // Clear transactions before start monitor
      const resClear = await apiClient.clearMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
        txIndexes: ["1", "2"],
      });
      expect(resClear.status).toBe(200);
      expect(resClear.data.success).toBeFalse();
      expect(resClear.data.msg).toBeTruthy();
    });

    test("Reading / clearing unknown state returns an error", async () => {
      // Start monitor
      const resMonitor = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Get transactions of unknown state
      const resGet = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: "foo.bar.non.existent",
      });
      expect(resGet.status).toBe(200);
      expect(resGet.data.success).toBeFalse();
      expect(resGet.data.msg).toBeTruthy();
      expect(resGet.data.stateFullClassName).toBeFalsy();
      expect(resGet.data.tx).toBeFalsy();

      // Clear transactions of unknown state
      const resClear = await apiClient.clearMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: "foo.bar.non.existent",
        txIndexes: ["1", "2"],
      });
      expect(resClear.status).toBe(200);
      expect(resClear.data.msg).toBeTruthy();
      expect(resClear.data.success).toBeFalse();
    });
  });

  describe("Multiple clients tests", () => {
    const anotherAppId = "anotherTestApp";

    afterEach(async () => {
      // Stop Monitors
      await apiClient.stopMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });

      await apiClient.stopMonitorV1({
        clientAppId: anotherAppId,
        stateFullClassName: stateToMonitor,
      });
    });

    test("State change can be read by all listening clients separately", async () => {
      // Start monitor for first client
      const resMonitorFirst = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitorFirst.status).toBe(200);
      expect(resMonitorFirst.data.success).toBeTrue();

      // Start monitor for second client
      const resMonitorAnother = await apiClient.startMonitorV1({
        clientAppId: anotherAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitorAnother.status).toBe(200);
      expect(resMonitorAnother.data.success).toBeTrue();

      // Invoke transactions
      const transactionCountAfterStart = 3;
      for (let i = 0; i < transactionCountAfterStart; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions for first client
      const resGetTxFirstClient = await apiClient.getMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxFirstClient.status).toBe(200);
      expect(resGetTxFirstClient.data.stateFullClassName).toEqual(
        stateToMonitor,
      );
      expect(resGetTxFirstClient.data.tx?.length).toBe(
        transactionCountAfterStart,
      );

      // Clear transactions seen by the first client
      const readTxIdx = resGetTxFirstClient.data.tx?.map((tx) => tx.index);
      const resClearTx = await apiClient.clearMonitorTransactionsV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
        txIndexes: readTxIdx as string[],
      });
      expect(resClearTx.status).toBe(200);
      expect(resClearTx.data.success).toBeTrue();

      // Get transactions for second client - should have all transactions available
      const resGetTxSecondClient = await apiClient.getMonitorTransactionsV1({
        clientAppId: anotherAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxSecondClient.status).toBe(200);
      expect(resGetTxSecondClient.data.stateFullClassName).toEqual(
        stateToMonitor,
      );
      expect(resGetTxSecondClient.data.tx?.length).toBe(
        transactionCountAfterStart,
      );
    });

    test("State change unsubscribe doesn't affect other client monitors", async () => {
      // Start monitor for first client
      const resMonitorFirst = await apiClient.startMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitorFirst.status).toBe(200);
      expect(resMonitorFirst.data.success).toBeTrue();

      // Start monitor for second client
      const resMonitorAnother = await apiClient.startMonitorV1({
        clientAppId: anotherAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resMonitorAnother.status).toBe(200);
      expect(resMonitorAnother.data.success).toBeTrue();

      // Invoke transactions
      const transactionCountAfterStart = 3;
      for (let i = 0; i < transactionCountAfterStart; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Stop first client monitoring
      await apiClient.stopMonitorV1({
        clientAppId: testAppId,
        stateFullClassName: stateToMonitor,
      });

      // Invoke transactions for second client only
      const transactionCountOnlySecondClient = 4;
      for (let i = 0; i < transactionCountOnlySecondClient; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions for second client
      const resGetTxSecondClient = await apiClient.getMonitorTransactionsV1({
        clientAppId: anotherAppId,
        stateFullClassName: stateToMonitor,
      });
      expect(resGetTxSecondClient.status).toBe(200);
      expect(resGetTxSecondClient.data.stateFullClassName).toEqual(
        stateToMonitor,
      );
      expect(resGetTxSecondClient.data.tx?.length).toBe(
        transactionCountAfterStart + transactionCountOnlySecondClient,
      );
    });
  });

  describe("watchBlocks tests", () => {
    // watchBlocks tests are async, don't wait so long if something goes wrong
    const watchBlockTestTimeout = 5 * 60 * 1000; // 5 minutes

    test(
      "watchBlocksAsyncV1 reports all transactions",
      async () => {
        const transactionCount = 10;

        const observable = await apiClient.watchBlocksAsyncV1({
          clientAppId: testAppId,
          stateFullClassName: stateToMonitor,
          pollRate: 1000,
        });

        let sub: Subscription | undefined;
        const monitor = new Promise<void>((resolve, reject) => {
          let transactionsReceived = 0;

          sub = observable.subscribe({
            next(tx) {
              let error: string | undefined;

              log.debug("Received transaction from monitor:", tx);

              if (tx.index === undefined || !tx.data) {
                error = `Wrong transaction format - idx ${tx.index} data ${tx.data}`;
              }

              transactionsReceived++;

              if (error) {
                log.error(error);
                reject(error);
              }

              if (transactionsReceived === transactionCount) {
                log.info(`Read all ${transactionCount} transactions - OK`);
                resolve();
              }
            },
            error(err) {
              log.error("watchBlocksAsyncV1 failed:", err);
              reject(err);
            },
          });
        }).finally(() => sub?.unsubscribe());

        // Invoke transactions
        for (let i = 0; i < transactionCount; i++) {
          invokeContract(apiClient, partyBPublicKey);
        }

        await monitor;
      },
      watchBlockTestTimeout,
    );

    test(
      "Running watchBlocksAsyncV1 with unknown state report an error on rxjs subject",
      async () => {
        const observable = await apiClient.watchBlocksAsyncV1({
          clientAppId: testAppId,
          stateFullClassName: "foo.bar.unknown",
        });

        let sub: Subscription | undefined;
        await new Promise<void>((resolve, reject) => {
          sub = observable.subscribe({
            next() {
              reject("Monitor reported new transaction when it should fail.");
            },
            error(err) {
              log.info("watchBlocksAsyncV1 error reported as expected:", err);
              resolve();
            },
          });
        }).finally(() => sub?.unsubscribe());
      },
      watchBlockTestTimeout,
    );
  });
});
