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
  FlowInvocationType,
  InvokeContractV1Request,
  JvmTypeKind,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "Tests are passing on the JVM side";
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
    imageName: "ghcr.io/hyperledger/cactus-corda-4-8-all-in-one-flowdb",
    imageVersion: "2021-11-23--feat-1493",
    logLevel,
  });
  t.ok(ledger, "CordaTestLedger v4.8 instantaited OK");

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
  const ledgerContainer = await ledger.start();
  t.ok(
    ledgerContainer,
    "CordaTestLedger v4.8 container truthy post-start() OK",
  );

  await ledger.logDebugPorts();
  const partyARpcPort = await ledger.getRpcAPublicPort();

  const jarFiles = await ledger.pullCordappJars(SampleCordappEnum.BASIC_FLOW);
  t.comment(`Fetched ${jarFiles.length} cordapp jars OK`);

  const internalIpOrUndefined = await internalIpV4();
  t.ok(internalIpOrUndefined, "Determined LAN IPv4 address successfully OK");
  const internalIp = internalIpOrUndefined as string;
  t.comment(`Internal IP (based on default gateway): ${internalIp}`);

  const partyARpcUsername = "user1";
  const partyARpcPassword = "password";
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

  const flowsRes = await apiClient.listFlowsV1();
  t.ok(flowsRes.status === 200, "flowsRes.status === 200 OK");
  t.ok(flowsRes.data, "flowsRes.data truthy OK");
  t.ok(flowsRes.data.flowNames, "flowsRes.data.flowNames truthy OK");
  t.comment(`apiClient.listFlowsV1() => ${JSON.stringify(flowsRes.data)}`);

  const cordappDeploymentConfigs: CordappDeploymentConfig[] = [];
  const depReq: DeployContractJarsV1Request = {
    jarFiles,
    cordappDeploymentConfigs,
  };
  const depRes = await apiClient.deployContractJarsV1(depReq);
  t.ok(depRes, "Jar deployment response truthy OK");
  t.equal(depRes.status, 200, "Jar deployment status code === 200 OK");
  t.ok(depRes.data, "Jar deployment response body truthy OK");
  t.ok(depRes.data.deployedJarFiles, "Jar deployment body deployedJarFiles OK");
  t.equal(
    depRes.data.deployedJarFiles.length,
    jarFiles.length,
    "Deployed jar file count equals count in request OK",
  );

  const myToken = "myToken";
  const initialValue = 42;
  const finalValue = 11;

  // add a new token value
  const reqAdd: InvokeContractV1Request = ({
    timeoutMs: 60000,
    flowFullClassName: "net.corda.samples.flowdb.AddTokenValueFlow",
    flowInvocationType: FlowInvocationType.FlowDynamic,
    params: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.String",
        },
        primitiveValue: myToken,
      },
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.Integer",
        },
        primitiveValue: initialValue,
      },
    ],
  } as unknown) as InvokeContractV1Request;

  const resAdd = await apiClient.invokeContractV1(reqAdd);
  t.ok(resAdd, "InvokeContractV1Request truthy OK");
  t.equal(resAdd.status, 200, "InvokeContractV1Request status code === 200 OK");

  // query a token value
  const reqQuery: InvokeContractV1Request = ({
    timeoutMs: 60000,
    flowFullClassName: "net.corda.samples.flowdb.QueryTokenValueFlow",
    flowInvocationType: FlowInvocationType.FlowDynamic,
    params: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.String",
        },
        primitiveValue: myToken,
      },
    ],
  } as unknown) as InvokeContractV1Request;

  const resQuery = await apiClient.invokeContractV1(reqQuery);
  t.ok(resQuery, "InvokeContractV1Request truthy OK");
  t.equal(
    resQuery.status,
    200,
    "InvokeContractV1Request status code === 200 OK",
  );
  t.equal(
    resQuery.data.callOutput,
    initialValue.toString(),
    "token value is equal to initialValue OK",
  );

  // update a token value
  const reqUpd: InvokeContractV1Request = ({
    timeoutMs: 60000,
    flowFullClassName: "net.corda.samples.flowdb.UpdateTokenValueFlow",
    flowInvocationType: FlowInvocationType.FlowDynamic,
    params: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.String",
        },
        primitiveValue: myToken,
      },
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.Integer",
        },
        primitiveValue: finalValue,
      },
    ],
  } as unknown) as InvokeContractV1Request;

  const resUpd = await apiClient.invokeContractV1(reqUpd);
  t.ok(resUpd, "InvokeContractV1Request truthy OK");
  t.equal(resUpd.status, 200, "InvokeContractV1Request status code === 200 OK");

  // query a token value
  const resQueryFinal = await apiClient.invokeContractV1(reqQuery);
  t.ok(resQueryFinal, "InvokeContractV1Request truthy OK");
  t.equal(
    resQueryFinal.status,
    200,
    "InvokeContractV1Request status code === 200 OK",
  );
  t.equal(
    resQueryFinal.data.callOutput,
    finalValue.toString(),
    "token value is equal to finalValue OK",
  );

  t.end();
});
