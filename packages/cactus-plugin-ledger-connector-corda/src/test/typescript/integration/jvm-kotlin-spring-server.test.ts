import "jest-extended";
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
  FlowInvocationType,
  InvokeContractV1Request,
  JvmTypeKind,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "Tests are passing on the JVM side";
const logLevel: LogLevelDesc = "TRACE";

describe(testCase, () => {
  let connector: any;

  const ledger = new CordaTestLedger({
    imageName: "ghcr.io/hyperledger/cactus-corda-4-6-all-in-one-obligation",
    imageVersion: "2021-03-19-feat-686",
    logLevel,
  });

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await Containers.logDiagnostics({ logLevel }); //this was in the onFailure
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
    try {
      await connector.stop();
    } finally {
      await connector.destroy();
    }
  });

  test(testCase, async () => {
    expect(ledger).toBeTruthy();
    const ledgerContainer = await ledger.start();
    expect(ledgerContainer).toBeTruthy();

    await ledger.logDebugPorts();
    const partyARpcPort = await ledger.getRpcAPublicPort();

    const jarFiles = await ledger.pullCordappJars(
      SampleCordappEnum.ADVANCED_OBLIGATION,
    );
    console.log(`Fetched ${jarFiles.length} cordapp jars OK`);

    const internalIpOrUndefined = await internalIpV4();
    expect(internalIpOrUndefined).toBeTruthy();
    const internalIp = internalIpOrUndefined as string;
    console.log(`Internal IP (based on default gateway): ${internalIp}`);

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
    console.log(envVarSpringAppJson);

    connector = new CordaConnectorContainer({
      logLevel,
      imageName: "ghcr.io/hyperledger/cactus-connector-corda-server",
      imageVersion: "2021-11-23--feat-1493",
      envVars: [envVarSpringAppJson],
    });
    expect(CordaConnectorContainer).toBeTruthy();
    const connectorContainer = await connector.start();
    expect(connectorContainer).toBeTruthy();

    await connector.logDebugPorts();
    const apiUrl = await connector.getApiLocalhostUrl();
    const config = new Configuration({ basePath: apiUrl });
    const apiClient = new CordaApi(config);

    const flowsRes = await apiClient.listFlowsV1();
    expect(flowsRes.status).toEqual(200);
    expect(flowsRes.data).toBeTruthy();
    expect(flowsRes.data.flowNames).toBeTruthy();
    console.log(`apiClient.listFlowsV1() => ${JSON.stringify(flowsRes.data)}`);

    const diagRes = await apiClient.diagnoseNodeV1();
    expect(diagRes.status).toEqual(200);
    expect(diagRes.data).toBeTruthy();
    expect(diagRes.data.nodeDiagnosticInfo).toBeTruthy();
    const ndi = diagRes.data.nodeDiagnosticInfo;
    expect(ndi.cordapps).toBeTruthy();
    expect(Array.isArray(ndi.cordapps)).toBeTruthy();
    expect((ndi.cordapps as []).length > 0).toBeTrue();
    expect(ndi.vendor).toBeTruthy();
    expect(ndi.version).toBeTruthy();
    expect(ndi.revision).toBeTruthy();
    expect(ndi.platformVersion).toBeTruthy();

    console.log(
      `apiClient.diagnoseNodeV1() => ${JSON.stringify(diagRes.data)}`,
    );

    const cordappDeploymentConfigs: CordappDeploymentConfig[] = [];
    const depReq: DeployContractJarsV1Request = {
      jarFiles,
      cordappDeploymentConfigs,
    };
    const depRes = await apiClient.deployContractJarsV1(depReq);
    expect(depRes).toBeTruthy();
    expect(depRes.status).toEqual(200);
    expect(depRes.data).toBeTruthy();
    expect(depRes.data.deployedJarFiles).toBeTruthy();
    expect(depRes.data.deployedJarFiles.length).toEqual(jarFiles.length);

    const networkMapRes = await apiClient.networkMapV1();
    const partyA = networkMapRes.data.find((it) =>
      it.legalIdentities.some(
        (it2) => it2.name.organisation === "ParticipantA",
      ),
    );
    const partyAPublicKey = partyA?.legalIdentities[0].owningKey;

    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some(
        (it2) => it2.name.organisation === "ParticipantB",
      ),
    );
    const partyBPublicKey = partyB?.legalIdentities[0].owningKey;

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
    expect(res).toBeTruthy();
    expect(res.status).toEqual(200);
  });
});
