import http from "http";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import Web3 from "web3";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import {
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialType,
  EthContractInvocationType,
  DefaultApi as BesuApi,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import {
  PluginHtlcEthBesu,
  DefaultApi as HtlcEthBesuApi,
} from "../../../main/typescript/public-api";

import HashTimeLockJson from "../../../../contracts/build/contracts/HashTimeLock.json";
import { AddressInfo } from "net";

test("cross-ledger atomic swap with ETH HTLC", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";

  // BEGIN - simulate the cmd-api-server package ApiServer class
  const expressAppA = express();
  expressAppA.use(bodyParser.json({ limit: "250mb" }));
  const serverA = http.createServer(expressAppA);
  const listenOptionsA: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server: serverA,
  };
  const addressInfoA = (await Servers.listen(listenOptionsA)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(serverA));
  const { address: addressA, port: portA } = addressInfoA;
  const apiHostA = `http://${addressA}:${portA}`;

  const expressAppB = express();
  expressAppB.use(bodyParser.json({ limit: "250mb" }));
  const serverB = http.createServer(expressAppB);
  const listenOptionsB: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server: serverB,
  };
  const addressInfoB = (await Servers.listen(listenOptionsB)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(serverB));
  const { address: addressB, port: portB } = addressInfoB;
  const apiHostB = `http://${addressB}:${portB}`;
  // END - simulate the cmd-api-server package's ApiServer class

  const ledgerA = new BesuTestLedger();
  await ledgerA.start();

  test.onFinish(async () => {
    await ledgerA.stop();
    await ledgerA.destroy();
  });
  const rpcApiHttpHostA = await ledgerA.getRpcApiHttpHost();

  const ledgerB = new BesuTestLedger();
  await ledgerB.start();

  test.onFinish(async () => {
    await ledgerB.stop();
    await ledgerB.destroy();
  });
  const rpcApiHttpHostB = await ledgerB.getRpcApiHttpHost();

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  const firstHighNetWorthAccount = "627306090abaB3A6e1400e9345bC60c78a8BEf57";

  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.LOCAL,
  });

  const besuKeyPair = {
    privateKey:
      "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
  };

  const web3A = new Web3(rpcApiHttpHostA);
  const web3B = new Web3(rpcApiHttpHostB);
  const testEthAccountA = web3A.eth.accounts.create(uuidv4());
  const testEthAccountB = web3B.eth.accounts.create(uuidv4());

  const keychainEntryKeyA = uuidv4();
  const keychainEntryValueA = testEthAccountA.privateKey;
  const keychainPluginA = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKeyA, keychainEntryValueA]]),
    logLevel,
  });

  const keychainEntryKeyB = uuidv4();
  const keychainEntryValueB = testEthAccountA.privateKey;
  const keychainPluginB = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKeyB, keychainEntryValueB]]),
    logLevel,
  });

  const pluginRegistryA = new PluginRegistry({ plugins: [keychainPluginA] });

  const connectorA: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost: rpcApiHttpHostA,
    instanceId: uuidv4(),
    pluginRegistry: pluginRegistryA,
  });
  pluginRegistryA.add(connectorA);

  const pluginRegistryB = new PluginRegistry({ plugins: [keychainPluginB] });

  const connectorB: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost: rpcApiHttpHostB,
    instanceId: uuidv4(),
    pluginRegistry: pluginRegistryB,
  });
  pluginRegistryB.add(connectorB);

  const htlcPluginA = new PluginHtlcEthBesu({
    instanceId: uuidv4(),
    pluginRegistry: pluginRegistryA,
    logLevel,
  });
  pluginRegistryA.add(htlcPluginA);

  const htlcPluginB = new PluginHtlcEthBesu({
    instanceId: uuidv4(),
    pluginRegistry: pluginRegistryB,
    logLevel,
  });
  pluginRegistryB.add(htlcPluginB);

  await connectorA.installWebServices(expressAppA);
  await connectorB.installWebServices(expressAppB);
  await htlcPluginA.installWebServices(expressAppA);
  await htlcPluginB.installWebServices(expressAppB);

  // send play money to the test account from the genesis account
  await connectorA.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccountA.address,
      value: 10e9,
      gas: 1000000,
    },
  });

  // send play money to the test account from the genesis account
  await connectorB.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccountA.address,
      value: 10e9,
      gas: 1000000,
    },
  });

  // assert that the play money has been received
  const balanceA = await web3A.eth.getBalance(testEthAccountA.address);
  t.ok(balanceA, "Retrieved balance A of test account OK");
  t.equals(parseInt(balanceA, 10), 10e9, "Balance A of test account is OK");

  // assert that the play money has been received
  const balanceB = await web3B.eth.getBalance(testEthAccountB.address);
  t.ok(balanceB, "Retrieved balance B of test account OK");
  t.equals(parseInt(balanceB, 10), 10e9, "Balance B of test account is OK");

  let contractAddressA: string;

  test("deploys contract via .json file to ledger A", async (t2: Test) => {
    const deployOut = await connectorA.deployContract({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
      bytecode: HashTimeLockJson.bytecode,
      gas: 1000000,
    });
    t2.ok(deployOut, "deployContract() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );

    contractAddressA = deployOut.transactionReceipt.contractAddress as string;
    t2.ok(
      typeof contractAddressA === "string",
      "contractAddress typeof string OK",
    );

    const { callOutput: helloMsg } = await connectorA.invokeContract({
      contractAddress: contractAddressA,
      contractAbi: HashTimeLockJson.abi,
      invocationType: EthContractInvocationType.CALL,
      methodName: "contractExists",
      params: [8888],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
    });
    t2.ok(helloMsg, "contractExists() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "contractExists() output is type of string",
    );
  });

  let contractAddressB;
  test("deploys contract via .json file to ledger B", async (t2: Test) => {
    const deployOut = await connectorB.deployContract({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
      bytecode: HashTimeLockJson.bytecode,
      gas: 1000000,
    });
    t2.ok(deployOut, "deployContract() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );

    contractAddressB = deployOut.transactionReceipt.contractAddress as string;
    t2.ok(
      typeof contractAddressB === "string",
      "contractAddress typeof string OK",
    );

    const { callOutput: helloMsg } = await connectorB.invokeContract({
      contractAddress: contractAddressB,
      contractAbi: HashTimeLockJson.abi,
      invocationType: EthContractInvocationType.CALL,
      methodName: "contractExists",
      params: [9999],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
    });
    t2.ok(helloMsg, "contractExists() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "contractExists() output is type of string",
    );
  });

  test("invoke HTLC Plugin to perform Atomic Swap", async (t2: Test) => {
    // this is just me throwing stuff together without much thinking, don't
    // take this part as explicit guidance on how it should be done ;-)
    const apiClientBesuA = new BesuApi({ basePath: apiHostA });
    const apiClientBesuB = new BesuApi({ basePath: apiHostB });
    const clientHtlcEthBesuA = new HtlcEthBesuApi({ basePath: apiHostA });
    const clientHtlcEthBesuB = new HtlcEthBesuApi({ basePath: apiHostB });

    {
      const { data, status } = await clientHtlcEthBesuA.newContract({});
      t2.ok(data, "clientHtlcEthBesuA.newContract().data OK");
      t2.ok(status, "clientHtlcEthBesuA.newContract().status OK");
      t2.ok(status > 199, "clientHtlcEthBesuA.newContract().status > 199 OK");
      t2.ok(status < 300, "clientHtlcEthBesuA.newContract().status < 300 OK");
    }

    {
      const { data, status } = await clientHtlcEthBesuB.newContract({});
      t2.ok(data, "clientHtlcEthBesuB.newContract().data OK");
      t2.ok(status, "clientHtlcEthBesuB.newContract().status OK");
      t2.ok(status > 199, "clientHtlcEthBesuB.newContract().status > 199 OK");
      t2.ok(status < 300, "clientHtlcEthBesuB.newContract().status < 300 OK");
    }

    t2.end();
  });

  t.end();
});
