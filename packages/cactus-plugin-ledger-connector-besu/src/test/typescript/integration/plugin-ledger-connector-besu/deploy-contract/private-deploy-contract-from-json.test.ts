import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Server as SocketIoServer } from "socket.io";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  EthContractInvocationType,
  // RunTransactionResponse,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

const testCase = "deploys contract via .json file";
const logLevel: LogLevelDesc = "TRACE";

//orion public key - receiving node
// const privateFor = ["Ko2bVqD+nNlNYL5EE7y3IdOnviftjiizpjRt+HTuFBs="];

// const node3privateFor = "k2zXEin4Ip/qBGlRkJejnGWdP9cjkK+DAvKNW31L2C8=";

//orion public key - sending node
// const privateFrom = "A1aVtMxLCUHmBVHXoZzzBgPbW/wj5axDpW9X8l91SGo=";
const privateKey =
  "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63";

test(testCase, async (t: Test) => {
  const rpcApiHttpHost = "http://localhost:20000";
  const rpcApiWsHost = "ws://localhost:20001";

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidv4());

  const keychainEntryKey = uuidv4();
  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });
  keychainPlugin.set(
    HelloWorldContractJson.contractName,
    HelloWorldContractJson,
  );
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    logLevel,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const listenOptions: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;
  t.comment(
    `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
  );
  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, wsApi);

  // let contractAddress: string;

  // test("deploys contract via .json file", async (t2: Test) => {
  //   const deployOut: RunTransactionResponse = await connector.deployContract({
  //     keychainId: keychainPlugin.getKeychainId(),
  //     contractName: HelloWorldContractJson.contractName,
  //     contractAbi: HelloWorldContractJson.abi,
  //     constructorArgs: [],
  //     web3SigningCredential: {
  //       secret: privateKey,
  //       type: Web3SigningCredentialType.PrivateKeyHex,
  //     },
  //     bytecode: HelloWorldContractJson.bytecode,
  //     gas: 10000000,
  //     privateTransactionConfig: {
  //       privateFor: privateFor, // Node 2
  //       privateFrom: privateFrom, // Node 1
  //     },
  //   });

  // console.log(deployOut);
  // contractAddress = "0x978c68b8a18066416e29e372e604f2b6d45550c5";

  // const receipt = await connector.invokeContract({
  //   contractName: HelloWorldContractJson.contractName,
  //   contractAbi: HelloWorldContractJson.abi,
  //   contractAddress,
  //   keychainId: keychainPlugin.getKeychainId(),
  //   invocationType: EthContractInvocationType.Send,
  //   methodName: "setName",
  //   gas: 10000000,
  //   params: ["Travis"],
  //   signingCredential: {
  //     secret: privateKey,
  //     type: Web3SigningCredentialType.PrivateKeyHex,
  //   },
  //   privateTransactionConfig: {
  //     privateFor: privateFor,
  //     privateFrom: privateFrom,
  //   },
  // });

  // console.log(receipt);

  const getName = await connector.invokeContract({
    contractName: HelloWorldContractJson.contractName,
    keychainId: keychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Call,
    methodName: "getName",
    gas: 10000000,
    params: [],
    signingCredential: {
      secret: privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    // privateTransactionConfig: {
    //   privateFor: privateFor,
    //   privateFrom: privateFrom,
    // },
  });

  console.log(getName);

  // console.log(helloMsg);

  // t2.ok(deployOut, "deployContract() output is truthy OK");
  // t2.ok(
  //   deployOut.transactionReceipt,
  //   "deployContract() output.transactionReceipt is truthy OK",
  // );
  // t2.ok(
  //   deployOut.transactionReceipt.contractAddress,
  //   "deployContract() output.transactionReceipt.contractAddress is truthy OK",
  // );

  // contractAddress = deployOut.transactionReceipt.contractAddress as string;
  // t2.ok(
  //   typeof contractAddress === "string",
  //   "contractAddress typeof string OK",
  // );
  // console.log(contractAddress);
  // });

  t.end();
});
