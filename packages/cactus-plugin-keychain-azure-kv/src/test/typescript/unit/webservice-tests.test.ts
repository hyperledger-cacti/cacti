// import test, { Test } from "tape-promise/tape";

// import express from "express";
// import bodyParser from "body-parser";
// import http from "http";
// import { AddressInfo } from "net";

// import { IListenOptions, Servers } from "@hyperledger/cactus-common";

// import { v4 as uuidv4 } from "uuid";

// import { LogLevelDesc } from "@hyperledger/cactus-common";

// import {
//   IPluginKeychainAzureKvOptions,
//   AzureCredentialType,
//   PluginKeychainAzureKv,
// } from "../../../main/typescript/public-api";

// import {
//   DefaultApi as KeychainAzureKvApi,
//   Configuration,
// } from "../../../main/typescript/generated/openapi/typescript-axios/index";

// import fs from "fs";
// import path from "path";
// import os from "os";
// import { PluginRegistry } from "@hyperledger/cactus-core";
// import { SecretClientMock } from "../mock/plugin-keychain-azure-kv-mock";

// const logLevel: LogLevelDesc = "TRACE";

// test("get,set,has,delete alters state as expected for AzureCredentialType.InMemory", async (t: Test) => {
//   const localStackContainer: IPluginKeychainAzureKvOptions = {
//     instanceId: uuidv4(),
//     keychainId: uuidv4(),
//     logLevel: logLevel,
//     azureEndpoint: "testEndpoint",
//     backend: new SecretClientMock({
//       azureKvUrl: "testUrl",
//       logLevel: logLevel,
//     }),
//   };

//   test.onFinish(async () => {
//     await localStackContainer.stop();
//     await localStackContainer.destroy();
//   });

//   // Using awsCredentialType: AwsCredentialType.FromAwsCredentialFile
//   {
//     // Create aws credential file in a local directory
//     let tmpDirPath = "tmpDirPath";
//     tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cactus-"));
//     await fs.promises.writeFile(
//       `${tmpDirPath}/credentials`,
//       "[default]\naws_secret_access_key = test\naws_access_key_id = test",
//       "utf-8",
//     );

//     const options1: IPluginKeychainAzureKvOptions = {
//       instanceId: uuidv4(),
//       keychainId: uuidv4(),
//       pluginRegistry: new PluginRegistry({}),
//       azureEndpoint: localstackHost,
//       azureRegion: "us-east-1",
//       azureProfile: "default",
//       azureCredentialType: AzureCredentialType.LocalFile,
//       azureCredentialFilePath: `${tmpDirPath}/credentials`,
//       logLevel: logLevel,
//     };
//     const plugin1 = new PluginKeychainAzureKv(options1);

//     const expressApp = express();
//     expressApp.use(bodyParser.json({ limit: "250mb" }));
//     const server = http.createServer(expressApp);
//     const listenOptions: IListenOptions = {
//       hostname: "0.0.0.0",
//       port: 0,
//       server,
//     };
//     const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
//     test.onFinish(async () => await Servers.shutdown(server));
//     const { address, port } = addressInfo;
//     const apiHost = `http://${address}:${port}`;
//     const config = new Configuration({ basePath: apiHost });
//     const apiClient = new KeychainAwsSmApi(config);

//     await plugin1.registerWebServices(expressApp);

//     t.equal(plugin1.getKeychainId(), options1.keychainId, "Keychain ID set OK");
//     t.equal(plugin1.getInstanceId(), options1.instanceId, "Instance ID set OK");

//     const key1 = uuidv4();
//     const value1 = uuidv4();

//     const hasPrior1 = await plugin1.has(key1);

//     t.false(hasPrior1, "hasPrior1 === false OK");

//     // await plugin1.set(key1, value1);

//     await apiClient.setKeychainEntryV1({
//       key: key1,
//       value: value1,
//     });

//     await apiClient.getKeychainEntryV1({
//       key: key1,
//     });

//     await apiClient.hasKeychainEntryV1({
//       key: key1,
//     });

//     const hasAfter1 = await plugin1.has(key1);
//     t.true(hasAfter1, "hasAfter1 === true OK");

//     const valueAfter1 = await plugin1.get(key1);
//     t.ok(valueAfter1, "valueAfter1 truthy OK");
//     t.equal(valueAfter1, value1, "valueAfter1 === value OK");

//     await apiClient.deleteKeychainEntryV1({
//       key: key1,
//     });

//     const hasAfterDelete1 = await plugin1.has(key1);
//     t.false(hasAfterDelete1, "hasAfterDelete1 === false OK");

//     const valueAfterDelete1 = await plugin1.get(key1);
//     t.notok(valueAfterDelete1, "valueAfterDelete1 falsy OK");

//     await (async () => {
//       await fs.promises.unlink(`${tmpDirPath}/credentials`);
//       await fs.promises.rmdir(`${tmpDirPath}`);
//     })();
//   }

//   // Using awsCredentialType: AwsCredentialType.FromCodeVariable
//   // Test for AWS access credentials cannot be performed over Localstack, as the opensourced version of it
//   // doesn't support AWS IAM authentication.
//   {
//     const options2: IPluginKeychainAzureKvOptions = {
//       instanceId: uuidv4(),
//       keychainId: uuidv4(),
//       pluginRegistry: new PluginRegistry({}),
//       azureEndpoint: localstackHost,
//       azureRegion: "us-east-1",
//       azureProfile: "default",
//       azureCredentialType: AzureCredentialType.InMemory,
//       azureAccessKeyId: "fake",
//       azureSecretAccessKey: "fake",
//       logLevel: logLevel,
//     };
//     const plugin2 = new PluginKeychainAzureKv(options2);

//     const expressApp = express();
//     expressApp.use(bodyParser.json({ limit: "250mb" }));
//     const server = http.createServer(expressApp);
//     const listenOptions: IListenOptions = {
//       hostname: "0.0.0.0",
//       port: 0,
//       server,
//     };
//     const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
//     test.onFinish(async () => await Servers.shutdown(server));
//     const { address, port } = addressInfo;
//     const apiHost = `http://${address}:${port}`;
//     const config = new Configuration({ basePath: apiHost });
//     const apiClient = new KeychainAzureKvApi(config);

//     await plugin2.registerWebServices(expressApp);

//     t.equal(plugin2.getKeychainId(), options2.keychainId, "Keychain ID set OK");
//     t.equal(plugin2.getInstanceId(), options2.instanceId, "Instance ID set OK");

//     const key2 = uuidv4();
//     const value2 = uuidv4();

//     const hasPrior2 = await plugin2.has(key2);

//     t.false(hasPrior2, "hasPrior2 === false OK");

//     //await plugin2.set(key2, value2);
//     await apiClient.setKeychainEntryV1({
//       key: key2,
//       value: value2,
//     });

//     const hasAfter2 = await plugin2.has(key2);
//     t.true(hasAfter2, "hasAfter2 === true OK");

//     const valueAfter2 = await plugin2.get(key2);
//     t.ok(valueAfter2, "valueAfter2 truthy OK");
//     t.equal(valueAfter2, value2, "valueAfter2 === value OK");

//     //await plugin2.delete(key2);
//     await apiClient.deleteKeychainEntryV1({
//       key: key2,
//     });

//     const hasAfterDelete2 = await plugin2.has(key2);
//     t.false(hasAfterDelete2, "hasAfterDelete2 === false OK");

//     const valueAfterDelete2 = await plugin2.get(key2);
//     t.notok(valueAfterDelete2, "valueAfterDelete2 falsy OK");
//   }

//   t.end();
// });
