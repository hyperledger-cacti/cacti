// import test, { Test } from "tape-promise/tape";
// import { v4 as uuidv4 } from "uuid";
// import { PluginRegistry } from "@hyperledger/cactus-core";
// import {
//   Web3SigningCredentialType,
//   PluginLedgerConnectorBesu,
//   PluginFactoryLedgerConnector,
// } from "../../../../../main/typescript/public-api";
// import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
// import {
//   LogLevelDesc,
//   IListenOptions,
//   Servers,
// } from "@hyperledger/cactus-common";
// import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
// import Web3 from "web3";
// import { PluginImportType } from "@hyperledger/cactus-core-api";
// import express from "express";
// import bodyParser from "body-parser";
// import http from "http";
// import { AddressInfo } from "net";

// const testCase = "deploys contract via .json file";
// const logLevel: LogLevelDesc = "TRACE";

// //orion public key - receiving node
// const privateFor = ["Ko2bVqD+nNlNYL5EE7y3IdOnviftjiizpjRt+HTuFBs="];

// //orion public key - sending node
// const privateFrom = "A1aVtMxLCUHmBVHXoZzzBgPbW/wj5axDpW9X8l91SGo=";
// const privateKey = "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63";

// test(testCase, async (t: Test) => {

//   const rpcApiHttpHost = "http://localhost:20000";

//   /**
//    * Constant defining the standard 'dev' Besu genesis.json contents.
//    *
//    * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
//    */

//   const web3 = new Web3(rpcApiHttpHost);
//   const testEthAccount = web3.eth.accounts.create(uuidv4());

//   const keychainEntryKey = uuidv4();
//   const keychainEntryValue = testEthAccount.privateKey;
//   const keychainPlugin = new PluginKeychainMemory({
//     instanceId: uuidv4(),
//     keychainId: uuidv4(),
//     // pre-provision keychain with mock backend holding the private key of the
//     // test account that we'll reference while sending requests with the
//     // signing credential pointing to this keychain entry.
//     backend: new Map([[keychainEntryKey, keychainEntryValue]]),
//     logLevel,
//   });
//   keychainPlugin.set(
//     HelloWorldContractJson.contractName,
//     HelloWorldContractJson,
//   );
//   const factory = new PluginFactoryLedgerConnector({
//     pluginImportType: PluginImportType.Local,
//   });
//   const connector: PluginLedgerConnectorBesu = await factory.create({
//     rpcApiHttpHost,
//     logLevel,
//     instanceId: uuidv4(),
//     pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
//   });

//   const expressApp = express();
//   expressApp.use(bodyParser.json({ limit: "250mb" }));
//   const server = http.createServer(expressApp);
//   const listenOptions: IListenOptions = {
//     hostname: "0.0.0.0",
//     port: 0,
//     server,
//   };
//   const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
//   test.onFinish(async () => await Servers.shutdown(server));
//   const { address, port } = addressInfo;
//   const apiHost = `http://${address}:${port}`;
//   t.comment(
//     `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
//   );
//   await connector.getOrCreateWebServices();
//   await connector.registerWebServices(expressApp);

//   let contractAddress: string;

//   test("deploys contract via .json file", async (t2: Test) => {
//     const deployOut = await connector.deployContract({
//       keychainId: keychainPlugin.getKeychainId(),
//       contractName: HelloWorldContractJson.contractName,
//       contractAbi: HelloWorldContractJson.abi,
//       constructorArgs: [],
//       web3SigningCredential: {
//         secret: privateKey,
//         type: Web3SigningCredentialType.PrivateKeyHex,
//       },
//       bytecode: HelloWorldContractJson.bytecode,
//       gas: 1000000,
//       privateTransactionConfig: {
//         privateFor: [privateFor],
//         privateFrom: privateFrom,
//       },
//     });
//     t2.ok(deployOut, "deployContract() output is truthy OK");
//     t2.ok(
//       deployOut.transactionReceipt,
//       "deployContract() output.transactionReceipt is truthy OK",
//     );
//     t2.ok(
//       deployOut.transactionReceipt.contractAddress,
//       "deployContract() output.transactionReceipt.contractAddress is truthy OK",
//     );

//     contractAddress = deployOut.transactionReceipt.contractAddress as string;
//     t2.ok(
//       typeof contractAddress === "string",
//       "contractAddress typeof string OK",
//     );
//   });

//   t.end();
// });
