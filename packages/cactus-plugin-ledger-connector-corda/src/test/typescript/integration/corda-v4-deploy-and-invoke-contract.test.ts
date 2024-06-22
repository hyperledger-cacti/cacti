import "jest-extended";

import { BAD_REQUEST, OK } from "http-errors-enhanced-cjs";
import { v4 as internalIpV4 } from "internal-ip";

import { Configuration } from "@hyperledger/cactus-core-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  buildImageConnectorCordaServer,
  buildImageCordaAllInOneV412,
  Containers,
  CordaTestLedger,
  pruneDockerAllIfGithubAction,
  SAMPLE_CORDAPP_DATA,
} from "@hyperledger/cactus-test-tooling";
import {
  SampleCordappEnum,
  CordaConnectorContainer,
} from "@hyperledger/cactus-test-tooling";

import {
  CordappDeploymentConfig,
  DefaultApi as CordaApi,
  DeployContractJarsV1Request,
  FlowInvocationType,
  InvokeContractV1Request,
  DiagnoseNodeV1Request,
  ListFlowsV1Request,
  JvmTypeKind,
  CordaRpcCredentials,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";

import { createJvmBoolean } from "../../../main/typescript/jvm/serde/factory/create-jvm-boolean";
import { createJvmLong } from "../../../main/typescript/jvm/serde/factory/create-jvm-long";
import { createJvmCordaIdentityParty } from "../../../main/typescript/jvm/serde/factory/create-jvm-corda-identity-party";
import {
  createJvmCordaAmount,
  createJvmCordaUniqueIdentifier,
} from "../../../main/typescript";

describe("Corda V4 Connector", () => {
  const logLevel: LogLevelDesc = "INFO";
  const logLevelJvmApp: LogLevelDesc = "INFO";
  const logLevelJvmRoot: LogLevelDesc = "WARN";

  const cInvalidParams = "sending invalid parameters";
  const fDiagnose = "diagnoseNodeV1";
  const fDeploy = "deployContractJarsV1";
  const fInvoke = "invokeContractV1";
  const fFlows = "listFlowsV1";
  const cWithoutParams = "not sending all required parameters";

  const REG_EXP_UUID = new RegExp(
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
  );

  const log = LoggerProvider.getOrCreate({
    label: "corda-v4-deploy-and-invoke-contract.test.ts",
    level: logLevel,
  });

  let apiClient: CordaApi;
  let ledger: CordaTestLedger;
  let connector: CordaConnectorContainer;
  let testAppearsSuccessful = false;
  let partyARpcPort: number;
  let partyBRpcPort: number;
  let publicSshPort: number;
  let lanIp: string;
  let rpcCredentialsA: CordaRpcCredentials;
  let rpcCredentialsB: CordaRpcCredentials;

  afterAll(async () => {
    if (testAppearsSuccessful !== true) {
      log.error("Test appears to have failed. Logging container diagnostics");
      await Containers.logDiagnostics({ logLevel });
    }
  });

  beforeAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  beforeAll(async () => {
    const imgLedger = await buildImageCordaAllInOneV412({ logLevel });
    const imgConnectorJvm = await buildImageConnectorCordaServer({
      logLevel,
    });

    ledger = new CordaTestLedger({
      imageName: imgLedger.imageName,
      imageVersion: imgLedger.imageVersion,
      logLevel,
      sshPort: 2222,
      rpcPortNotary: 10003,
      rpcPortA: 10006,
      rpcPortB: 10009,
    });
    expect(ledger).toBeTruthy();

    const ledgerContainer = await ledger.start(true);
    expect(ledgerContainer).toBeTruthy();

    await ledger.logDebugPorts();
    partyARpcPort = await ledger.getRpcAPublicPort();
    partyBRpcPort = await ledger.getRpcBPublicPort();
    log.info("Ledger container partyARpcPort: %d", partyARpcPort);
    log.info("Ledger container partyBRpcPort: %d", partyBRpcPort);

    publicSshPort = await ledger.getSSHPublicPort();
    log.info("Ledger container publicSshPort: %d", publicSshPort);

    const internalIpOrUndefined = await internalIpV4();
    expect(internalIpOrUndefined).toBeTruthy();

    lanIp = internalIpOrUndefined as string;
    log.info(`Internal/LAN IP (based on default gateway): ${lanIp}`);

    rpcCredentialsA = {
      hostname: lanIp,
      port: partyARpcPort,
      username: "user1",
      password: "test",
    };

    rpcCredentialsB = {
      hostname: lanIp,
      port: partyBRpcPort,
      username: "user1",
      password: "test",
    };

    const springAppConfig = {
      logging: {
        level: {
          root: logLevelJvmRoot,
          "org.hyperledger.cactus": logLevelJvmApp,
        },
      },
      cactus: {
        corda: {
          node: { host: lanIp },
          // TODO: parse the gradle build files to extract the credentials?
          rpc: { port: partyARpcPort, username: "user1", password: "test" },
        },
      },
    };
    const springApplicationJson = JSON.stringify(springAppConfig);
    const envVarSpringAppJson = `SPRING_APPLICATION_JSON=${springApplicationJson}`;
    log.debug("Spring App Config Env Var: ", envVarSpringAppJson);

    connector = new CordaConnectorContainer({
      logLevel,
      imageName: imgConnectorJvm.imageName,
      imageVersion: imgConnectorJvm.imageVersion,
      envVars: [envVarSpringAppJson],
    });
    // Set to true if you are testing an image that you've built locally and have not
    // yet uploaded to the container registry where it would be publicly available.
    // Do not forget to set it back to `false` afterwards!
    const skipContainerImagePull = true;
    expect(CordaConnectorContainer).toBeTruthy();

    const connectorContainer = await connector.start(skipContainerImagePull);
    expect(connectorContainer).toBeTruthy();

    await connector.logDebugPorts();
    const apiUrl = await connector.getApiLocalhostUrl();
    const config = new Configuration({ basePath: apiUrl });
    apiClient = new CordaApi(config);
  });

  afterAll(async () => {
    if (!ledger) {
      log.info("Ledger container falsy, skipping stop & destroy.");
      return;
    }
    try {
      await ledger.stop();
    } finally {
      await ledger.destroy();
    }
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  afterAll(async () => {
    if (!connector) {
      log.info("Connector container falsy, skipping stop & destroy.");
      return;
    }
    try {
      await connector.stop();
    } finally {
      await connector.destroy();
    }
  });

  it("Runs listFlowsV1()", async () => {
    const flowsRes = await apiClient.listFlowsV1();
    expect(flowsRes.status).toEqual(200);
    expect(flowsRes.data).toBeTruthy();
    expect(flowsRes.data.flowNames).toBeTruthy();
    log.debug(`apiClient.listFlowsV1() => ${JSON.stringify(flowsRes.data)}`);
  });

  it("Runs diagnoseNodeV1()", async () => {
    const diagRes = await apiClient.diagnoseNodeV1();
    expect(diagRes.status).toEqual(200);
    expect(diagRes.data).toBeTruthy();
    expect(diagRes.data.nodeDiagnosticInfo).toBeTruthy();

    const ndi = diagRes.data.nodeDiagnosticInfo;
    expect(ndi.cordapps).toBeTruthy();
    expect(ndi.cordapps).toBeArray();
    expect(ndi.cordapps).not.toBeEmpty();
    expect(Array.isArray(ndi.cordapps)).toBeTrue();
    expect(ndi.cordapps.length > 0).toBeTrue();

    expect(ndi.vendor).toBeTruthy();
    expect(ndi.version).toBeTruthy();
    expect(ndi.revision).toBeTruthy();
    expect(ndi.platformVersion).toBeTruthy();

    log.debug(`apiClient.diagnoseNodeV1() => ${JSON.stringify(diagRes.data)}`);
  });

  it(`Runs deployContractJarsV1() - ${SampleCordappEnum.ADVANCED_NEGOTIATION}`, async () => {
    const cordappDeploymentConfigs: CordappDeploymentConfig[] = [];

    cordappDeploymentConfigs.push({
      cordappDir:
        SAMPLE_CORDAPP_DATA[SampleCordappEnum.ADVANCED_NEGOTIATION]
          .cordappDirPartyA,
      cordaNodeStartCmd: "supervisorctl start corda-a",

      cordaJarPath: SAMPLE_CORDAPP_DATA[
        SampleCordappEnum.ADVANCED_NEGOTIATION
      ].cordappDirPartyA.replace("cordapps", "corda.jar"),

      nodeBaseDirPath: SAMPLE_CORDAPP_DATA[
        SampleCordappEnum.ADVANCED_NEGOTIATION
      ].cordappDirPartyA.replace("cordapps", ""),

      rpcCredentials: rpcCredentialsA,

      sshCredentials: {
        hostKeyEntry: "not-used-right-now-so-this-does-not-matter... ;-(",
        hostname: lanIp,
        password: "root",
        port: publicSshPort,
        username: "root",
      },
    });

    cordappDeploymentConfigs.push({
      cordappDir:
        SAMPLE_CORDAPP_DATA[SampleCordappEnum.ADVANCED_NEGOTIATION]
          .cordappDirPartyB,
      cordaNodeStartCmd: "supervisorctl start corda-b",

      cordaJarPath: SAMPLE_CORDAPP_DATA[
        SampleCordappEnum.ADVANCED_NEGOTIATION
      ].cordappDirPartyB.replace("cordapps", "corda.jar"),

      nodeBaseDirPath: SAMPLE_CORDAPP_DATA[
        SampleCordappEnum.ADVANCED_NEGOTIATION
      ].cordappDirPartyB.replace("cordapps", ""),

      rpcCredentials: rpcCredentialsB,

      sshCredentials: {
        hostKeyEntry: "not-used-right-now-so-this-does-not-matter... ;-(",
        hostname: lanIp,
        password: "root",
        port: publicSshPort,
        username: "root",
      },
    });

    const jarFiles = await ledger.pullCordappJars(
      SampleCordappEnum.ADVANCED_NEGOTIATION,
    );

    await ledger.cleanCordapp(SampleCordappEnum.ADVANCED_NEGOTIATION);

    const req: DeployContractJarsV1Request = {
      jarFiles,
      cordappDeploymentConfigs,
    };
    const res = await apiClient.deployContractJarsV1(req);
    expect(res).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data).toBeTruthy();
    expect(res.data.deployedJarFiles).toBeTruthy();
    expect(res.data.deployedJarFiles.length).toEqual(jarFiles.length);
  });

  it(`Validates Requests: - ${fDeploy} - ${cWithoutParams}`, async () => {
    const req = {
      cordappDeploymentConfigs: [],
    } as unknown as DeployContractJarsV1Request;
    const contractDeployment = apiClient.deployContractJarsV1(req);
    await expect(contractDeployment).rejects.toMatchObject({
      response: { data: { status: BAD_REQUEST } },
    });
  });

  it(`Validates Requests: - ${fDiagnose} - ${cInvalidParams}`, async () => {
    const req = { fake: 4 } as unknown as DiagnoseNodeV1Request;
    const diagnoseNodeRequest = apiClient.diagnoseNodeV1(req);

    await expect(diagnoseNodeRequest).rejects.toMatchObject({
      response: { data: { status: BAD_REQUEST } },
    });
  });

  it(`Validates Requests: - ${fInvoke} - ${cWithoutParams}`, async () => {
    const req = {
      flowFullClassName: "net.corda.samples.obligation.flows.IOUIssueFlow",
      flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
      timeoutMs: 60000,
    } as InvokeContractV1Request;
    const contractInvocation = apiClient.invokeContractV1(req);
    await expect(contractInvocation).rejects.toMatchObject({
      response: {
        data: {
          status: BAD_REQUEST,
        },
      },
    });
  });

  it(`Validates Requests: - ${fDeploy} - ${cInvalidParams} - rpcCredentials`, async () => {
    const req = {
      jarFiles: [],
      cordappDeploymentConfigs: [
        {
          sshCredentials: {
            hostKeyEntry: "fake",
            username: "fake",
            password: "fake",
            hostname: "localhost",
            port: -1,
          },
          // omitting the rpcCredentials property
          cordaNodeStartCmd: null as unknown as string,
          cordappDir: "/does/not/exist/diretory",
          cordaJarPath: "/does/not/exist/",
          nodeBaseDirPath: "/does/not/exist/",
        } as CordappDeploymentConfig,
      ],
      fake: 4,
    };
    const contractDeployment = apiClient.deployContractJarsV1(req);
    await expect(contractDeployment).rejects.toMatchObject({
      response: { data: { status: BAD_REQUEST } },
    });
  });

  it(`Validates Requests: - ${fDeploy} - ${cInvalidParams} - sshCredentials`, async () => {
    const req = {
      jarFiles: [],
      cordappDeploymentConfigs: [
        {
          // omitting the sshCredentials property
          rpcCredentials: {
            hostname: "-",
            port: -1,
            username: "-",
            password: "-",
          },
          cordaNodeStartCmd: null as unknown as string,
          cordappDir: "/does/not/exist/diretory",
          cordaJarPath: "/does/not/exist/",
          nodeBaseDirPath: "/does/not/exist/",
        } as CordappDeploymentConfig,
      ],
      fake: 4,
    };
    const contractDeployment = apiClient.deployContractJarsV1(req);
    await expect(contractDeployment).rejects.toMatchObject({
      response: { data: { status: BAD_REQUEST } },
    });
  });

  it(`Validates Requests: - ${fFlows} - ${cInvalidParams}`, async () => {
    const req = { fake: 4 } as ListFlowsV1Request;
    const flowListRequest = apiClient.listFlowsV1(req);
    await expect(flowListRequest).rejects.toMatchObject({
      response: { data: { status: BAD_REQUEST } },
    });
  });

  it(`Validates Requests: - ${fInvoke} - ${cInvalidParams}`, async () => {
    const req: InvokeContractV1Request = {
      flowFullClassName: "net.corda.samples.obligation.flows.IOUIssueFlow",
      flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
      params: [{}],
      timeoutMs: 60000,
      fake: 4,
    } as unknown as InvokeContractV1Request;

    const contractInvocation = apiClient.invokeContractV1(req);
    await expect(contractInvocation).rejects.toMatchObject({
      response: { data: { status: BAD_REQUEST } },
    });
  });

  it("Runs invokeContractV1() - net.corda.samples.negotiation.flows.ProposalFlow$Initiator", async () => {
    const networkMapRes = await apiClient.networkMapV1({});

    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some((it2) => it2.name.organisation === "PartyB"),
    );

    if (process.env.VERBOSE === "true") {
      const networkMapJson = JSON.stringify(networkMapRes.data, null, 4);
      console.log("Corda Network Map Snapshot JSON:", networkMapJson);
    }

    if (!partyB) {
      throw new Error("PartyB was falsy. Cannot continue the test.");
    }

    if (!partyB.legalIdentities[0]) {
      throw new Error(
        "PartyB had no legalIdentities. Cannot continue the test.",
      );
    }

    const req: InvokeContractV1Request = {
      flowFullClassName:
        "net.corda.samples.negotiation.flows.ProposalFlow$Initiator",
      flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
      params: [
        createJvmBoolean(true),
        createJvmLong(42),
        createJvmCordaIdentityParty({ party: partyB.legalIdentities[0] }),
      ],
      timeoutMs: 60000,
    };

    const contractInvocation = apiClient.invokeContractV1(req);
    await expect(contractInvocation).resolves.toMatchObject({
      status: OK,
      data: {
        success: true,
        callOutput: expect.toBeString(),
        flowId: expect.stringMatching(REG_EXP_UUID),
        progress: expect.toBeArray(),
      },
    });
  });

  it(`Runs deployContractJarsV1() - ${SampleCordappEnum.ADVANCED_OBLIGATION}`, async () => {
    // Using the ADVANCED_NEGOTIATION sample app data here because that's the
    // one that has the node up and running within the ledger container so
    // even though we are deploying an obligation cordapp, we need to use the
    // deployment config associated with the negotiation one.
    const sampleAppNegotiation = SampleCordappEnum.ADVANCED_NEGOTIATION;
    const sampleAppObligation = SampleCordappEnum.ADVANCED_OBLIGATION;
    const sampleAppData = SAMPLE_CORDAPP_DATA[sampleAppNegotiation];

    const cordappDeploymentConfigs: CordappDeploymentConfig[] = [];

    cordappDeploymentConfigs.push({
      cordappDir: sampleAppData.cordappDirPartyA,
      cordaNodeStartCmd: "supervisorctl start corda-a",

      cordaJarPath: sampleAppData.cordappDirPartyA.replace(
        "cordapps",
        "corda.jar",
      ),

      nodeBaseDirPath: sampleAppData.cordappDirPartyA.replace("cordapps", ""),

      rpcCredentials: rpcCredentialsA,

      sshCredentials: {
        hostKeyEntry: "FIXME_this_does_not_yet_get_verified",
        hostname: lanIp,
        password: "root",
        port: publicSshPort,
        username: "root",
      },
    });

    cordappDeploymentConfigs.push({
      cordappDir: sampleAppData.cordappDirPartyB,
      cordaNodeStartCmd: "supervisorctl start corda-b",

      cordaJarPath: sampleAppData.cordappDirPartyB.replace(
        "cordapps",
        "corda.jar",
      ),

      nodeBaseDirPath: sampleAppData.cordappDirPartyB.replace("cordapps", ""),

      rpcCredentials: rpcCredentialsB,

      sshCredentials: {
        hostKeyEntry: "FIXME_this_does_not_yet_get_verified",
        hostname: lanIp,
        password: "root",
        port: publicSshPort,
        username: "root",
      },
    });

    const jarFiles = await ledger.pullCordappJars(sampleAppObligation);

    const req: DeployContractJarsV1Request = {
      jarFiles,
      cordappDeploymentConfigs,
    };
    const res = await apiClient.deployContractJarsV1(req);
    expect(res).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data).toBeTruthy();
    expect(res.data.deployedJarFiles).toBeTruthy();
    expect(res.data.deployedJarFiles.length).toEqual(jarFiles.length);
  });

  /**
   * FIXME: Need to fix this test case. For now it hangs with the ledger logging the mesage below.
   * If you list the flows available, it shows that the flows we are invoking in this test case is
   * available on the corda node so it is not yet know what is the actual problem since the .jar files
   * are installed by the previous test case but it claims that they are not there...
   *
   * W 00:15:38 190 SingleThreadedStateMachineManager. - Unable to initiate flow from O=PartyA, L=London, C=GB
   * (appName=ADVANCED_OBLIGATION_workflows-1.0 flowVersion=1), sending to the flow hospital
   *
   * net.corda.node.services.statemachine.SessionRejectException$UnknownClass: Don't know net.corda.samples.obligation.flows.IOUIssueFlow
   *   at net.corda.node.services.statemachine.SingleThreadedStateMachineManager.getInitiatedFlowFactory(SingleThreadedStateMachineManager.kt:899) ~[corda-node-4.12-SNAPSHOT.jar:?]
   *   at net.corda.node.services.statemachine.SingleThreadedStateMachineManager.onSessionInit(SingleThreadedStateMachineManager.kt:863) ~[corda-node-4.12-SNAPSHOT.jar:?]
   *   at net.corda.node.services.statemachine.SingleThreadedStateMachineManager.onSessionMessage(SingleThreadedStateMachineManager.kt:817) ~[corda-node-4.12-SNAPSHOT.jar:?]
   *   at net.corda.node.services.statemachine.SingleThreadedStateMachineManager.deliverExternalEvent(SingleThreadedStateMachineManager.kt:786) ~[corda-node-4.12-SNAPSHOT.jar:?]
   *   at net.corda.node.services.statemachine.SingleThreadedStateMachineManager$start$7$1.invoke$lambda$0(SingleThreadedStateMachineManager.kt:236) ~[corda-node-4.12-SNAPSHOT.jar:?]
   *   at java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:539) ~[?:?]
   *   at java.util.concurrent.FutureTask.run(FutureTask.java:264) ~[?:?]
   *   at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:304) ~[?:?]
   *   at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136) ~[?:?]
   *   at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635) ~[?:?]
   *   at net.corda.node.utilities.AffinityExecutor$ServiceAffinityExecutor$1$thread$1.run(AffinityExecutor.kt:63) ~[corda-node-4.12-SNAPSHOT.jar:?]
   *
   * W 00:15:38 190 StaffedFlowHospital. - O=PartyA, L=London, C=GB has sent a flow request for an unknown flow net.corda.samples.obligation.flows.IOUIssueFlow. Install the missing CorDapp this flow belongs to and restart.
   * W 00:15:38 190 StaffedFlowHospital. - If you know it's safe to ignore this flow request then it can be deleted permanently using the killFlow RPC and the UUID [a0078a26-15ae-4328-9cbe-afe321194177] (from the node shell you can run 'flow kill [a0078a26-15ae-4328-9cbe-afe321194177]').
   * BE VERY CAUTIOUS OF THIS SECOND APPROACH AS THE REQUEST MAY CONTAIN A NOTARISED TRANSACTION THAT NEEDS TO BE RECORDED IN YOUR VAULT.
   *
   * W 00:16:32 110 StaffedFlowHospital. - There are 1 erroneous session initiations kept for overnight observation. Erroneous session initiation ids: [a0078a26-15ae-4328-9cbe-afe321194177]
   *
   */
  it("Runs invokeContractV1() - net.corda.samples.obligation.flows.IOUIssueFlow", async () => {
    const { data: netMap } = await apiClient.networkMapV1();
    const pNameA = "PartyA";
    const pNameB = "PartyB";

    const partyA = netMap.find((it) =>
      it.legalIdentities.some((it2) => it2.name.organisation === pNameA),
    );
    if (!partyA) {
      throw new TypeError(`No Party with name ${pNameA} found in Network Map`);
    }

    const partyB = netMap.find((it) =>
      it.legalIdentities.some((it2) => it2.name.organisation === pNameB),
    );
    if (!partyB) {
      throw new TypeError(`No Party with name ${pNameB} found in Network Map`);
    }

    const flowsRes = await apiClient.listFlowsV1();
    log.debug("flowRes.data", flowsRes.data);

    const req: InvokeContractV1Request = {
      flowFullClassName: "net.corda.samples.obligation.flows.IOUIssueFlow",
      flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
      params: [
        {
          jvmTypeKind: JvmTypeKind.Reference,
          jvmType: {
            fqClassName: "net.corda.samples.obligation.states.IOUState",
          },

          jvmCtorArgs: [
            createJvmCordaAmount({ amount: 42, currencyCode: "USD" }),
            createJvmCordaIdentityParty({ party: partyA.legalIdentities[0] }),
            createJvmCordaIdentityParty({ party: partyB.legalIdentities[0] }),
            createJvmCordaAmount({ amount: 1, currencyCode: "USD" }),
            createJvmCordaUniqueIdentifier({
              uniqueidentifier: "7fc2161e-f8d0-4c86-a596-08326bdafd56",
            }),
          ],
        },
      ],
      timeoutMs: 60000,
    };

    const contractInvocation = apiClient.invokeContractV1(req);

    await expect(contractInvocation).resolves.toMatchObject({
      status: OK,
      data: {
        success: true,
        callOutput: {
          id: expect.toBeString(),
          inputs: expect.toBeArray(),
          networkParametersHash: expect.toBeString(),
          notary: expect.not.toBeEmpty(),
          sigs: expect.toBeArray(),
          tx: expect.toBeObject(),
        },
        flowId: expect.stringMatching(REG_EXP_UUID),
        progress: expect.toBeArray(),
      },
    });

    testAppearsSuccessful = true;
    log.debug("The test appears to be successfully finished.");
  });
});
