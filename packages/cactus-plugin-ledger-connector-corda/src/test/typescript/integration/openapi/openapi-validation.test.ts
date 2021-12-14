import test, { Test } from "tape-promise/tape";
import { v4 as internalIpV4 } from "internal-ip";

import {
  Containers,
  CordaTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  SampleCordappEnum,
  CordaConnectorContainer,
} from "@hyperledger/cactus-test-tooling";

import {
  CordappDeploymentConfig,
  DefaultApi as CordaApi,
  DeployContractJarsV1Request,
  DiagnoseNodeV1Request,
  FlowInvocationType,
  InvokeContractV1Request,
  JvmTypeKind,
  ListFlowsV1Request,
  PublicKey,
} from "../../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "openapi validation on corda JVM implementation";
const logLevel: LogLevelDesc = "TRACE";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const ledger = new CordaTestLedger({
    imageName: "ghcr.io/hyperledger/cactus-corda-4-8-all-in-one-obligation",
    imageVersion: "2021-08-31--feat-889",
    logLevel,
  });
  t.ok(ledger, "CordaTestLedger instantaited OK");

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
  const ledgerContainer = await ledger.start();
  t.ok(ledgerContainer, "CordaTestLedger container truthy post-start() OK");

  await ledger.logDebugPorts();
  const partyARpcPort = await ledger.getRpcAPublicPort();

  const cordappDeploymentConfigs: CordappDeploymentConfig[] = [];
  const jarFiles = await ledger.pullCordappJars(
    SampleCordappEnum.ADVANCED_OBLIGATION,
  );
  t.comment(`Fetched ${jarFiles.length} cordapp jars OK`);

  const internalIpOrUndefined = await internalIpV4();
  t.ok(internalIpOrUndefined, "Determined LAN IPv4 address successfully OK");
  const internalIp = internalIpOrUndefined as string;
  t.comment(`Internal IP (based on default gateway): ${internalIp}`);

  const springAppConfig = {
    logging: {
      level: {
        root: "INFO",
        "org.hyperledger.cactus": "DEBUG",
      },
    },
    cactus: {
      corda: {
        node: { host: internalIp },
        // TODO: parse the gradle build files to extract the credentials?
        rpc: { port: partyARpcPort, username: "user1", password: "password" },
      },
    },
  };
  const springApplicationJson = JSON.stringify(springAppConfig);
  const envVarSpringAppJson = `SPRING_APPLICATION_JSON=${springApplicationJson}`;
  t.comment(envVarSpringAppJson);

  const connector = new CordaConnectorContainer({
    logLevel,
    imageName: "ghcr.io/hyperledger/cactus-connector-corda-server",
    imageVersion: "2021-11-23--feat-1493",
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
  const fInvoke = "invokeContractV1";
  const fDiagnose = "diagnoseNodeV1";
  const fFlows = "listFlowsV1";
  const fNetwork = "networkMapV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const depReq: DeployContractJarsV1Request = {
      jarFiles,
      cordappDeploymentConfigs,
    };
    const depRes = await apiClient.deployContractJarsV1(depReq);
    t2.ok(depRes, "Jar deployment response truthy OK");
    t2.ok(depRes.status === 200, "Jar deployment status code === 200 OK");
    t2.ok(depRes.data, "Jar deployment response body truthy OK");
    t2.ok(
      depRes.data?.deployedJarFiles,
      "Jar deployment body deployedJarFiles OK",
    );
    t2.equal(
      depRes.data?.deployedJarFiles?.length,
      jarFiles.length,
      "Deployed jar file count equals count in request OK",
    );
    t2.end();
  });

  test(`${testCase} - ${fFlows} - ${cOk}`, async (t2: Test) => {
    const flowsRes = await apiClient.listFlowsV1();
    t2.ok(flowsRes.status === 200, "flowsRes.status === 200 OK");
    t2.ok(flowsRes.data, "flowsRes.data truthy OK");
    t2.ok(flowsRes.data.flowNames, "flowsRes.data.flowNames truthy OK");
    t2.comment(`apiClient.listFlowsV1() => ${JSON.stringify(flowsRes.data)}`);
    t2.end();
  });

  test(`${testCase} - ${fDiagnose} - ${cOk}`, async (t2: Test) => {
    const diagRes = await apiClient.diagnoseNodeV1();
    t2.ok(diagRes.status === 200, "diagRes.status === 200 OK");
    t2.ok(diagRes.data, "diagRes.data truthy OK");
    t2.ok(diagRes.data.nodeDiagnosticInfo, "nodeDiagnosticInfo truthy OK");
    t2.end();
  });

  let partyAPublicKey: PublicKey | undefined;
  let partyBPublicKey: PublicKey | undefined;

  test(`${testCase} - ${fNetwork} - ${cOk}`, async (t2: Test) => {
    const networkMapRes = await apiClient.networkMapV1();
    t2.ok(networkMapRes.status === 200, "networkMapRes.status === 200 OK");
    const partyA = networkMapRes.data.find((it) =>
      it.legalIdentities.some(
        (it2) => it2.name.organisation === "ParticipantA",
      ),
    );
    partyAPublicKey = partyA?.legalIdentities[0].owningKey;

    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some(
        (it2) => it2.name.organisation === "ParticipantB",
      ),
    );
    partyBPublicKey = partyB?.legalIdentities[0].owningKey;
    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cOk}`, async (t2: Test) => {
    const req: InvokeContractV1Request = ({
      flowFullClassName: "net.corda.samples.obligation.flows.IOUIssueFlow",
      flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
      params: [
        {
          jvmTypeKind: JvmTypeKind.Reference,
          jvmType: {
            fqClassName: "net.corda.samples.obligation.states.IOUState",
          },

          jvmCtorArgs: [
            {
              jvmTypeKind: JvmTypeKind.Reference,
              jvmType: {
                fqClassName: "net.corda.core.contracts.Amount",
              },

              jvmCtorArgs: [
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "long",
                  },
                  primitiveValue: 42,
                },
                {
                  jvmTypeKind: JvmTypeKind.Reference,
                  jvmType: {
                    fqClassName: "java.util.Currency",
                    constructorName: "getInstance",
                  },

                  jvmCtorArgs: [
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "USD",
                    },
                  ],
                },
              ],
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
                      primitiveValue: "ParticipantA",
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "London",
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "GB",
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
                      primitiveValue: partyAPublicKey?.algorithm,
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: partyAPublicKey?.format,
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: partyAPublicKey?.encoded,
                    },
                  ],
                },
              ],
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
            {
              jvmTypeKind: JvmTypeKind.Reference,
              jvmType: {
                fqClassName: "net.corda.core.contracts.Amount",
              },

              jvmCtorArgs: [
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "long",
                  },
                  primitiveValue: 1,
                },
                {
                  jvmTypeKind: JvmTypeKind.Reference,
                  jvmType: {
                    fqClassName: "java.util.Currency",
                    constructorName: "getInstance",
                  },

                  jvmCtorArgs: [
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "USD",
                    },
                  ],
                },
              ],
            },
            {
              jvmTypeKind: JvmTypeKind.Reference,
              jvmType: {
                fqClassName: "net.corda.core.contracts.UniqueIdentifier",
              },

              jvmCtorArgs: [
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "java.lang.String",
                  },
                  primitiveValue: "7fc2161e-f8d0-4c86-a596-08326bdafd56",
                },
              ],
            },
          ],
        },
      ],
      timeoutMs: 60000,
    } as unknown) as InvokeContractV1Request;

    const res = await apiClient.invokeContractV1(req);
    t2.ok(res, "InvokeContractV1Request truthy OK");
    t2.ok(res.status === 200, "InvokeContractV1Request status code === 200 OK");
    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const depReq = ({
        jarFiles,
      } as unknown) as DeployContractJarsV1Request;
      await apiClient.deployContractJarsV1(depReq);
      t2.fail(`${fDeploy} - ${cWithoutParams}: should fail`);
    } catch (e) {
      t2.equal(
        e.response?.data?.status,
        400,
        "Deploy contract response status code === 400 OK",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const req = ({
        flowFullClassName: "net.corda.samples.obligation.flows.IOUIssueFlow",
        flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
        timeoutMs: 60000,
      } as unknown) as InvokeContractV1Request;
      await apiClient.invokeContractV1(req);
      t2.fail(`${fInvoke} - ${cWithoutParams}: should fail`);
    } catch (e) {
      t2.equal(
        e.response?.data?.status,
        400,
        "Invoke contract response status code === 400 OK",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const depReq = {
        jarFiles,
        cordappDeploymentConfigs,
        fake: 4,
      };
      await apiClient.deployContractJarsV1(depReq);
      t2.fail(`${fDeploy} - ${cInvalidParams}: should fail`);
    } catch (e) {
      t2.equal(
        e.response?.data?.status,
        400,
        "Deploy contract response status code === 400 OK",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fFlows} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const req = { fake: 4 } as ListFlowsV1Request;
      await apiClient.listFlowsV1(req);
      t2.fail(`${fFlows} - ${cInvalidParams}: should fail`);
    } catch (e) {
      t2.equal(
        e.response?.data?.status,
        400,
        "List flows response status code === 400 OK",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDiagnose} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const req = ({ fake: 4 } as unknown) as DiagnoseNodeV1Request;
      await apiClient.diagnoseNodeV1(req);
      t2.fail(`${fDiagnose} - ${cInvalidParams}: should fail`);
    } catch (e) {
      t2.equal(
        e.response?.data?.status,
        400,
        "Diagnose node response status code === 400 OK",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    const req: InvokeContractV1Request = ({
      flowFullClassName: "net.corda.samples.obligation.flows.IOUIssueFlow",
      flowInvocationType: FlowInvocationType.TrackedFlowDynamic,
      params: [
        {
          jvmTypeKind: JvmTypeKind.Reference,
          jvmType: {
            fqClassName: "net.corda.samples.obligation.states.IOUState",
          },

          jvmCtorArgs: [
            {
              jvmTypeKind: JvmTypeKind.Reference,
              jvmType: {
                fqClassName: "net.corda.core.contracts.Amount",
              },

              jvmCtorArgs: [
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "long",
                  },
                  primitiveValue: 42,
                },
                {
                  jvmTypeKind: JvmTypeKind.Reference,
                  jvmType: {
                    fqClassName: "java.util.Currency",
                    constructorName: "getInstance",
                  },

                  jvmCtorArgs: [
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "USD",
                    },
                  ],
                },
              ],
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
                      primitiveValue: "ParticipantA",
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "London",
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "GB",
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
                      primitiveValue: partyAPublicKey?.algorithm,
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: partyAPublicKey?.format,
                    },
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: partyAPublicKey?.encoded,
                    },
                  ],
                },
              ],
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
            {
              jvmTypeKind: JvmTypeKind.Reference,
              jvmType: {
                fqClassName: "net.corda.core.contracts.Amount",
              },

              jvmCtorArgs: [
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "long",
                  },
                  primitiveValue: 1,
                },
                {
                  jvmTypeKind: JvmTypeKind.Reference,
                  jvmType: {
                    fqClassName: "java.util.Currency",
                    constructorName: "getInstance",
                  },

                  jvmCtorArgs: [
                    {
                      jvmTypeKind: JvmTypeKind.Primitive,
                      jvmType: {
                        fqClassName: "java.lang.String",
                      },
                      primitiveValue: "USD",
                    },
                  ],
                },
              ],
            },
            {
              jvmTypeKind: JvmTypeKind.Reference,
              jvmType: {
                fqClassName: "net.corda.core.contracts.UniqueIdentifier",
              },

              jvmCtorArgs: [
                {
                  jvmTypeKind: JvmTypeKind.Primitive,
                  jvmType: {
                    fqClassName: "java.lang.String",
                  },
                  primitiveValue: "7fc2161e-f8d0-4c86-a596-08326bdafd56",
                },
              ],
            },
          ],
        },
      ],
      timeoutMs: 60000,
      fake: 4,
    } as unknown) as InvokeContractV1Request;

    try {
      await apiClient.invokeContractV1(req);
      t2.fail(`${fInvoke} - ${cInvalidParams}: should fail`);
    } catch (e) {
      t2.equal(
        e.response?.data?.status,
        400,
        "Invoke contract response status code === 400 OK",
      );
    }
    t2.end();
  });

  t.end();
});
