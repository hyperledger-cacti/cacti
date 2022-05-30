import path from "path";
import fs from "fs";
import "jest-extended";
import Web3 from "web3";
import { v4 as uuidV4 } from "uuid";

import { AbiItem } from "web3-utils";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";

import Web3JsQuorum, { IWeb3Quorum } from "web3js-quorum";

const keyStatic = {
  tessera: {
    member1: {
      publicKey: "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=",
    },
    member2: {
      publicKey: "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=",
    },
    member3: {
      publicKey: "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=",
    },
  },
  quorum: {
    member1: {
      name: "member1",
      url: "http://127.0.0.1:20000",
      wsUrl: "ws://127.0.0.1:20001",
      privateUrl: "http://127.0.0.1:9081",
      privateKey:
        "b9a4bd1539c15bcc83fa9078fe89200b6e9e802ae992f13cd83c853f16e8bed4",
      accountAddress: "f0e2db6c8dc6c681bb5d6ad121a107f300e9b2b5",
    },
    member2: {
      name: "member2",
      url: `http://127.0.0.1:20002`,
      wsUrl: `http://127.0.0.1:20003`,
      privateUrl: "http://127.0.0.1:9082",
      privateKey:
        "f18166704e19b895c1e2698ebc82b4e007e6d2933f4b31be23662dd0ec602570",
      accountAddress: "ca843569e3427144cead5e4d5999a3d0ccf92b8e",
    },
    member3: {
      name: "member3",
      url: `http://127.0.0.1:20004`,
      wsUrl: `http://127.0.0.1:20005`,
      privateUrl: "http://127.0.0.1:9083",
      privateKey:
        "4107f0b6bf67a3bc679a15fe36f640415cf4da6a4820affaac89c8b280dfd1b3",
      accountAddress: "0fbdc686b912d7722dc86510934589e0aaf3b55a",
    },
  },
};

import { QuorumMultiPartyTestLedger } from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "../../../../../main/typescript/public-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";

const logLevel: LogLevelDesc = "INFO";

describe("PluginLedgerConnectorQuorum", () => {
  const preWarmedLedger = process.env.CACTUS_TEST_PRE_WARMED_LEDGER === "true";
  const keychainId1 = "keychain1_" + uuidV4();
  const keychainId2 = "keychain2_" + uuidV4();

  let keys: typeof keyStatic;
  let signingAccount;
  let webQJsMember1: IWeb3Quorum;
  let webQJsMember2: IWeb3Quorum;
  let webQJsMember3: IWeb3Quorum;
  let ledger: QuorumMultiPartyTestLedger;
  let connector1: PluginLedgerConnectorQuorum;
  let connector2: PluginLedgerConnectorQuorum;
  let connector3: PluginLedgerConnectorQuorum;

  afterAll(async () => {
    if (!preWarmedLedger) {
      await ledger.stop();
    }
  });

  afterAll(async () => {
    await connector1.shutdown();
  });

  afterAll(async () => {
    await connector2.shutdown();
  });

  afterAll(async () => {
    await connector3.shutdown();
  });

  beforeAll(async () => {
    ledger = new QuorumMultiPartyTestLedger({ logLevel });

    if (preWarmedLedger) {
      keys = keyStatic;
    } else {
      await ledger.start();
      keys = (await ledger.getKeys()) as typeof keyStatic;
    }

    const rpcApiHttpHostMember1 = keys.quorum.member1.url;
    const rpcApiHttpHostMember2 = keys.quorum.member2.url;
    const rpcApiHttpHostMember3 = keys.quorum.member3.url;
    const web3Member1 = new Web3(rpcApiHttpHostMember1);
    const web3Member2 = new Web3(rpcApiHttpHostMember2);
    const web3Member3 = new Web3(rpcApiHttpHostMember3);

    webQJsMember1 = Web3JsQuorum(
      web3Member1,
      { privateUrl: keys.quorum.member1.privateUrl },
      true,
    );
    expect(webQJsMember1).toBeTruthy();

    webQJsMember2 = Web3JsQuorum(
      web3Member2,
      { privateUrl: keys.quorum.member2.privateUrl },
      true,
    );
    expect(webQJsMember2).toBeTruthy();

    webQJsMember3 = Web3JsQuorum(
      web3Member3,
      { privateUrl: keys.quorum.member3.privateUrl },
      true,
    );
    expect(webQJsMember3).toBeTruthy();

    const pluginRegistry1 = new PluginRegistry();
    const pluginRegistry2 = new PluginRegistry();
    const pluginRegistry3 = new PluginRegistry();

    const pluginFactoryLedgerConnector = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const keychainInstanceId1 = "keychain_instance1_" + uuidV4();

    const keychain1 = new PluginKeychainMemory({
      instanceId: keychainInstanceId1,
      keychainId: keychainId1,
      logLevel,
    });

    expect(keychain1).toBeTruthy();

    await keychain1.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    pluginRegistry1.add(keychain1);

    const keychainInstanceId2 = "keychain_instance2_" + uuidV4();
    const keychain2 = new PluginKeychainMemory({
      instanceId: keychainInstanceId2,
      keychainId: keychainId2,
      logLevel,
    });

    expect(keychain2).toBeTruthy();

    await keychain2.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );

    pluginRegistry2.add(keychain2);

    const keychainInstanceId3 = "keychain_instance3_" + uuidV4();
    const keychainId3 = "keychain3_" + uuidV4();
    const keychain3 = new PluginKeychainMemory({
      instanceId: keychainInstanceId3,
      keychainId: keychainId3,
      logLevel,
    });

    expect(keychain3).toBeTruthy();

    await keychain3.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    pluginRegistry3.add(keychain3);

    const connectorInstanceId1 = "quorum1_" + uuidV4();
    const connectorInstanceId2 = "quorum2_" + uuidV4();
    const connectorInstanceId3 = "quorum3_" + uuidV4();

    connector1 = await pluginFactoryLedgerConnector.create({
      instanceId: connectorInstanceId1,
      pluginRegistry: pluginRegistry1,
      rpcApiHttpHost: rpcApiHttpHostMember1,
      privateUrl: keys.quorum.member1.privateUrl,
      logLevel,
    });
    expect(connector1).toBeTruthy();
    pluginRegistry1.add(connector1);

    connector2 = await pluginFactoryLedgerConnector.create({
      instanceId: connectorInstanceId2,
      pluginRegistry: pluginRegistry2,
      rpcApiHttpHost: rpcApiHttpHostMember2,
      privateUrl: keys.quorum.member3.privateUrl,
      logLevel,
    });
    expect(connector2).toBeTruthy();
    pluginRegistry2.add(connector2);

    connector3 = await pluginFactoryLedgerConnector.create({
      instanceId: connectorInstanceId3,
      pluginRegistry: pluginRegistry3,
      rpcApiHttpHost: rpcApiHttpHostMember3,
      privateUrl: keys.quorum.member3.privateUrl,
      logLevel,
    });
    expect(connector3).toBeTruthy();
    pluginRegistry3.add(connector3);

    await connector1.onPluginInit();
    await connector2.onPluginInit();
    await connector3.onPluginInit();
  });

  it("Can run private transactions", async () => {
    if (preWarmedLedger) {
      const accountKeyPath = path.resolve(
        __dirname,
        "../../../../resources/network-files/member1",
        "accountkey",
      );
      const accountKey = JSON.parse(fs.readFileSync(accountKeyPath, "utf8"));
      signingAccount = webQJsMember1.eth.accounts.decrypt(accountKey, "");
    } else {
      const accountKey = JSON.parse(
        await ledger.pullFile(
          "/quorum-dev-quickstart/config/quorum/networkFiles/member1/accountkey",
        ),
      );
      signingAccount = webQJsMember1.eth.accounts.decrypt(accountKey, "");
    }

    const accountAddress = keys.quorum.member1.accountAddress;
    const txCount = await webQJsMember1.eth.getTransactionCount(accountAddress);

    const deployRes = await connector1.deployContract({
      contractName: HelloWorldContractJson.contractName,
      privateTransactionConfig: {
        privateFrom: keys.tessera.member1.publicKey,
        privateFor: [
          keys.tessera.member1.publicKey,
          keys.tessera.member2.publicKey,
        ],
        isPrivate: true,
        gasLimit: 10000000,
        gasPrice: 0,
      },
      web3SigningCredential: {
        secret: keys.quorum.member1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
        ethAccount: signingAccount.address,
      },
      keychainId: keychainId1,
      gas: 3000000,
      gasPrice: 0,
      nonce: txCount,
      value: 0,
    });

    const contractDeployReceipt = await webQJsMember1.eth.getTransactionReceipt(
      deployRes.transactionReceipt.transactionHash,
    );

    expect(contractDeployReceipt).toBeTruthy();
    const receipt = contractDeployReceipt;
    const { contractAddress } = receipt;
    expect(contractAddress).toBeTruthy();

    const member1Contract = new webQJsMember1.eth.Contract(
      HelloWorldContractJson.abi as AbiItem[],
      contractAddress,
    );
    const mem1Response = await member1Contract.methods.getName().call();
    expect(mem1Response).toStrictEqual("CaptainCactus");

    const member2Contract = new webQJsMember2.eth.Contract(
      HelloWorldContractJson.abi as AbiItem[],
      contractAddress,
    );
    const mem2Response = await member2Contract.methods.getName().call();
    expect(mem2Response).toStrictEqual("CaptainCactus");

    const member3Contract = new webQJsMember3.eth.Contract(
      HelloWorldContractJson.abi as AbiItem[],
      contractAddress,
    );

    await expect(member3Contract.methods.getName().call()).rejects.toThrow();
  });
});
