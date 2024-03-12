import { AddressInfo } from "net";
import http from "http";
import fs from "fs-extra";
import path from "path";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import {
  Containers,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  DeployContractV1Request,
  FabricContractInvocationType,
  FileBase64,
  PluginLedgerConnectorFabric,
  RunTransactionRequest,
} from "../../../../main/typescript/public-api";
import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";
import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Configuration } from "@hyperledger/cactus-core-api";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import OAS from "../../../../main/json/openapi.json";

const testCase = "deploys Fabric V2.5.6 contract from typescript source";
const logLevel: LogLevelDesc = "INFO";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const channelId = "mychannel";
  const channelName = channelId;

  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
    imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
    envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
    logLevel,
  });
  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);
  await ledger.start({ omitPull: false });

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const enrollAdminOut = await ledger.enrollAdmin();
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
  const keychainEntryValue = JSON.stringify(userIdentity);

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: keychainInstanceId,
    keychainId,
    logLevel,
    backend: new Map([
      [keychainEntryKey, keychainEntryValue],
      ["some-other-entry-key", "some-other-entry-value"],
    ]),
  });

  const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

  const discoveryOptions: DiscoveryOptions = {
    enabled: true,
    asLocalhost: true,
  };

  const pluginOptions: IPluginLedgerConnectorFabricOptions = {
    instanceId: uuidv4(),
    dockerBinary: "/usr/local/bin/docker",
    peerBinary: "/fabric-samples/bin/peer",
    goBinary: "/usr/local/go/bin/go",
    pluginRegistry,
    cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
    sshConfig,
    logLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
      commitTimeout: 300,
    },
  };
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { port } = addressInfo;
  test.onFinish(async () => await Servers.shutdown(server));

  await installOpenapiValidationMiddleware({
    logLevel,
    app: expressApp,
    apiSpec: OAS,
  });

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);
  const apiUrl = `http://127.0.0.1:${port}`;

  const config = new Configuration({ basePath: apiUrl });

  const apiClient = new FabricApi(config);

  const contractName = "basic-asset-transfer-2";

  const contractRelPath =
    "../../fixtures/go/basic-asset-transfer/chaincode-typescript";
  const contractDir = path.join(__dirname, contractRelPath);

  // ├── package.json
  // ├── src
  // │   ├── assetTransfer.ts
  // │   ├── asset.ts
  // │   └── index.ts
  // ├── tsconfig.json
  // └── tslint.json
  const sourceFiles: FileBase64[] = [];
  {
    const filename = "./tslint.json";
    const relativePath = "./";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./tsconfig.json";
    const relativePath = "./";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./package.json";
    const relativePath = "./";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./index.ts";
    const relativePath = "./src/";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./asset.ts";
    const relativePath = "./src/";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./assetTransfer.ts";
    const relativePath = "./src/";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }

  const fDeploy = "deployContractV1";
  const fRun = "runTransactionV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: contractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    };

    const res = await apiClient.deployContractV1(parameters);

    t2.equal(
      res.status,
      200,
      `Endpoint ${fDeploy}: response.status === 200 OK`,
    );
    t2.true(res.data.success, "res.data.success === true");

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: contractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    };

    try {
      await apiClient.deployContractV1(
        parameters as unknown as DeployContractV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDeploy} without required channelId: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      t2.ok(
        fields.includes("channelId"),
        "Rejected because channelId is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: contractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      fake: 4,
    };

    try {
      await apiClient.deployContractV1(parameters as DeployContractV1Request);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDeploy} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cOk}`, async (t2: Test) => {
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const assetId = uuidv4();
    const assetOwner = uuidv4();

    const parameters = {
      contractName,
      channelName,
      params: [assetId, "Green", "19", assetOwner, "9999"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    };
    const res = await apiClient.runTransactionV1(parameters);
    t2.ok(res, "res truthy OK");
    t2.equal(res.status, 200, `Endpoint ${fRun}: response.status === 200 OK`);

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cWithoutParams}`, async (t2: Test) => {
    const assetId = uuidv4();
    const assetOwner = uuidv4();

    const parameters = {
      // contractName,
      channelName,
      params: [assetId, "Green", "19", assetOwner, "9999"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    };

    try {
      await apiClient.runTransactionV1(parameters as RunTransactionRequest);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fRun} without required contractName: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      t2.ok(
        fields.includes("contractName"),
        "Rejected because contractName is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cInvalidParams}`, async (t2: Test) => {
    const assetId = uuidv4();
    const assetOwner = uuidv4();

    const parameters = {
      contractName,
      channelName,
      params: [assetId, "Green", "19", assetOwner, "9999"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
      fake: 4,
    };

    try {
      await apiClient.runTransactionV1(parameters as RunTransactionRequest);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fRun} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
