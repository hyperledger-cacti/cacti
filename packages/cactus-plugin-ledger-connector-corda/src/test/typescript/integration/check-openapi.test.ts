import test, { Test } from "tape-promise/tape";
import { v4 as internalIpV4 } from "internal-ip";

import { Containers, CordaTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
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
  JvmTypeKind,
  NodeInfo,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "@hyperledger/cactus-core-api";

import { AxiosResponse } from "axios";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "cactus-plugin-ledger-connector-corda API";

test(`${testCase}`, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  const ledger = new CordaTestLedger({
    imageName: "ghcr.io/hyperledger/cactus-corda-4-6-all-in-one-obligation",
    imageVersion: "2021-03-19-feat-686",
    // imageName: "caio",
    // imageVersion: "latest",
    logLevel,
  });
  t.ok(ledger, "CordaTestLedger instantaited OK");

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
  });
  const ledgerContainer = await ledger.start();
  t.ok(ledgerContainer, "CordaTestLedger container truthy post-start() OK");

  const corDappsDirPartyA = await ledger.getCorDappsDirPartyA();
  const corDappsDirPartyB = await ledger.getCorDappsDirPartyB();
  t.comment(`corDappsDirPartyA=${corDappsDirPartyA}`);
  t.comment(`corDappsDirPartyB=${corDappsDirPartyB}`);

  await ledger.logDebugPorts();
  const partyARpcPort = await ledger.getRpcAPublicPort();
  const partyBRpcPort = await ledger.getRpcBPublicPort();

  const jarFiles = await ledger.pullCordappJars(
    SampleCordappEnum.BASIC_CORDAPP,
  );
  t.comment(`Fetched ${jarFiles.length} cordapp jars OK`);

  const internalIpOrUndefined = await internalIpV4();
  t.ok(internalIpOrUndefined, "Determined LAN IPv4 address successfully OK");
  const internalIp = internalIpOrUndefined as string;
  t.comment(`Internal IP (based on default gateway): ${internalIp}`);

  const partyARpcUsername = "user1";
  const partyARpcPassword = "password";
  const partyBRpcUsername = partyARpcUsername;
  const partyBRpcPassword = partyARpcPassword;
  const springAppConfig = {
    logging: {
      level: {
        root: "INFO",
        "net.corda": "INFO",
        "org.hyperledger.cactus": "DEBUG",
      },
    },
    cactus: {
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
  t.comment(envVarSpringAppJson);

  const connector = new CordaConnectorContainer({
    logLevel,
    imageName: "ghcr.io/hyperledger/cactus-connector-corda-server",
    imageVersion: "2021-03-25-feat-622",
    // imageName: "cccs",
    // imageVersion: "latest",
    envVars: [envVarSpringAppJson],
  });
  t.ok(CordaConnectorContainer, "CordaConnectorContainer instantiated OK");

  test.onFinish(async () => {
    try {
      await connector.stop();
    } finally {
      await connector.destroy();
    }
  });

  const connectorContainer = await connector.start();
  t.ok(connectorContainer, "CordaConnectorContainer started OK");

  await connector.logDebugPorts();
  const apiUrl = await connector.getApiLocalhostUrl();

  const config = new Configuration({ basePath: apiUrl });
  const apiClient = new CordaApi(config);

  const fDeploy = "deployContractJarsV1";
  const fDiagnose = "diagnoseNodeV1";
  const fInvoke = "invokeContractV1";
  const fList = "listFlowsV1";
  const fNetwork = "networkMapV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fList} - ${cOk}`, async (t2: Test) => {
    const flowsRes1 = await apiClient.listFlowsV1();
    t2.ok(flowsRes1.status === 200, "listFlowsV1.status === 200 OK");
    t2.end();
  });

  test(`${testCase} - ${fDiagnose} - ${cOk}`, async (t2: Test) => {
    const flowsRes1 = await apiClient.diagnoseNodeV1();
    t2.ok(flowsRes1.status === 200, "diagnoseNodeV1.status === 200 OK");
    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const sshConfig = await ledger.getSshConfig();
    const hostKeyEntry = "not-used-right-now-so-this-does-not-matter... ;-(";

    const cdcA: CordappDeploymentConfig = {
      cordappDir: corDappsDirPartyA,
      cordaNodeStartCmd: "supervisorctl start corda-a",
      cordaJarPath:
        "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/corda.jar",
      nodeBaseDirPath:
        "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/",
      rpcCredentials: {
        hostname: internalIp,
        port: partyARpcPort,
        username: partyARpcUsername,
        password: partyARpcPassword,
      },
      sshCredentials: {
        hostKeyEntry,
        hostname: internalIp,
        password: "root",
        port: sshConfig.port as number,
        username: sshConfig.username as string,
      },
    };

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
        hostKeyEntry,
        hostname: internalIp,
        password: "root",
        port: sshConfig.port as number,
        username: sshConfig.username as string,
      },
    };

    const cordappDeploymentConfigs: CordappDeploymentConfig[] = [cdcA, cdcB];
    const depReq: DeployContractJarsV1Request = {
      jarFiles,
      cordappDeploymentConfigs,
    };
    const depRes = await apiClient.deployContractJarsV1(depReq);
    t2.equal(depRes.status, 200, "Jar deployment status code === 200 OK");

    t2.end();
  });

  let networkMapRes: AxiosResponse<NodeInfo[]>;

  test(`${testCase} - ${fNetwork} - ${cOk}`, async (t2: Test) => {
    networkMapRes = await apiClient.networkMapV1();
    t2.equal(networkMapRes.status, 200, "networkMap status code === 200 OK");
    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cOk}`, async (t2: Test) => {
    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some(
        (it2) => it2.name.organisation === "ParticipantB",
      ),
    );
    const partyBPublicKey = partyB?.legalIdentities[0].owningKey;

    const req: InvokeContractV1Request = ({
      timeoutMs: 60000,
      flowFullClassName:
        "net.corda.samples.example.flows.ExampleFlow$Initiator",
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
                  primitiveValue: partyBPublicKey?.algorithm,
                },
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "java.lang.String",
                  },
                  primitiveValue: partyBPublicKey?.format,
                },
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "java.lang.String",
                  },
                  primitiveValue: partyBPublicKey?.encoded,
                },
              ],
            },
          ],
        },
      ],
    } as unknown) as InvokeContractV1Request;

    const res = await apiClient.invokeContractV1(req);
    t2.equal(res.status, 200, "InvokeContractV1Request status code === 200 OK");

    t2.end();
  });

  test(`${testCase} - ${fList} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.listFlowsV1({ fake: 5 } as any);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDiagnose} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.diagnoseNodeV1({ fake: 5 } as any);
    } catch (e) {
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    const depReq = {
      jarFiles,
      cordappDeploymentConfigs: [],
      fake: 4,
    };
    try {
      await apiClient.deployContractJarsV1(
        (depReq as any) as DeployContractJarsV1Request,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fNetwork} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.networkMapV1({ fake: 3 } as any);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some(
        (it2) => it2.name.organisation === "ParticipantB",
      ),
    );
    const partyBPublicKey = partyB?.legalIdentities[0].owningKey;
    const req = {
      fake: 4,
      timeoutMs: 60000,
      flowFullClassName:
        "net.corda.samples.example.flows.ExampleFlow$Initiator",
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
                  primitiveValue: partyBPublicKey?.algorithm,
                },
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "java.lang.String",
                  },
                  primitiveValue: partyBPublicKey?.format,
                },
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "java.lang.String",
                  },
                  primitiveValue: partyBPublicKey?.encoded,
                },
              ],
            },
          ],
        },
      ],
    };
    try {
      await apiClient.invokeContractV1((req as any) as InvokeContractV1Request);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    const depReq = {
      // jarFiles,
      cordappDeploymentConfigs: [],
    };
    try {
      await apiClient.deployContractJarsV1(
        (depReq as any) as DeployContractJarsV1Request,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
    }
    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async (t2: Test) => {
    const req = {
      timeoutMs: 60000,
      flowFullClassName:
        "net.corda.samples.example.flows.ExampleFlow$Initiator",
      flowInvocationType: FlowInvocationType.FlowDynamic,
    };
    try {
      await apiClient.invokeContractV1((req as any) as InvokeContractV1Request);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
    }
    t2.end();
  });

  t.end();
});
