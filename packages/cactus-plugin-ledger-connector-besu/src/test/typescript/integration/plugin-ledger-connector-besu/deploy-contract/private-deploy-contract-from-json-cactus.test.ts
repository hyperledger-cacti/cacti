import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import Web3JsQuorum, { IPrivateTransactionReceipt } from "web3js-quorum";
import { BesuMpTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialType,
} from "../../../../../main/typescript";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

describe("PluginLedgerConnectorBesu", () => {
  const containerImageName =
    "ghcr.io/hyperledger/cactus-besu-all-in-one-multi-party";
  const containerImageTag = "2023-08-08-pr-2596";
  const testCase = "Executes private transactions on Hyperledger Besu";
  const logLevel: LogLevelDesc = "INFO";

  const doctorCactusHex =
    "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000d446f63746f722043616374757300000000000000000000000000000000000000";

  // WARNING: the keys here are demo purposes ONLY. Please use a tool like Orchestrate or EthSigner for production, rather than hard coding private keys
  const keysStatic = {
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
    besu: {
      member1: {
        url: "http://127.0.0.1:20000",
        wsUrl: "ws://127.0.0.1:20001",
        privateKey:
          "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
      },
      member2: {
        url: "http://127.0.0.1:20002",
        wsUrl: "ws://127.0.0.1:20003",
        privateKey:
          "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
      },
      member3: {
        url: "http://127.0.0.1:20004",
        wsUrl: "ws://127.0.0.1:20005",
        privateKey:
          "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
      },
      ethsignerProxy: {
        url: "http://127.0.0.1:18545",
        accountAddress: "9b790656b9ec0db1936ed84b3bea605873558198",
      },
    },
  };

  const infrastructureElements: Array<{ stop: () => Promise<unknown> }> = [];
  afterAll(async () => {
    for (let index = 0; index < infrastructureElements.length; index++) {
      const aStoppable = infrastructureElements[index];
      await aStoppable.stop();
    }
  });

  test(testCase, async () => {
    // At development time one can specify this environment variable if there is
    // a multi-party network already running, which is doable with something like
    // this on the terminal:
    // docker run   --rm   --privileged   --publish 2222:22   --publish 3000:3000   --publish 8545:8545   --publish 8546:8546   --publish 9001:9001   --publish 9081:9081   --publish 9082:9082   --publish 9083:9083   --publish 9090:9090   --publish 18545:18545   --publish 20000:20000   --publish 20001:20001   --publish 20002:20002   --publish 20003:20003   --publish 20004:20004   --publish 20005:20005   --publish 25000:25000   petermetz/cactus-besu-multi-party-all-in-one:0.1.2
    //
    // The upside of this approach is that a new container is not launched from
    // scratch for every test execution which enables faster iteration.
    const preWarmedLedger =
      process.env.CACTUS_TEST_PRE_WARMED_LEDGER === "true";

    let keys: any;
    if (preWarmedLedger) {
      keys = keysStatic;
    } else {
      const ledger = new BesuMpTestLedger({
        logLevel,
        imageName: containerImageName,
        imageTag: containerImageTag,
        emitContainerLogs: false,
      });
      infrastructureElements.push(ledger);
      await ledger.start();
      keys = await ledger.getKeys();
    }

    const rpcApiHttpHostMember1 = keys.besu.member1.url;
    const rpcApiHttpHostMember2 = keys.besu.member2.url;
    const rpcApiHttpHostMember3 = keys.besu.member3.url;

    const rpcApiWsHostMember1 = keys.besu.member1.wsUrl;
    const rpcApiWsHostMember2 = keys.besu.member2.wsUrl;
    const rpcApiWsHostMember3 = keys.besu.member3.wsUrl;

    const web3Member1 = new Web3(rpcApiHttpHostMember1);
    const web3Member2 = new Web3(rpcApiHttpHostMember2);
    const web3Member3 = new Web3(rpcApiHttpHostMember3);

    const pluginRegistry1 = new PluginRegistry();
    const pluginRegistry2 = new PluginRegistry();
    const pluginRegistry3 = new PluginRegistry();

    const pluginFactoryLedgerConnector = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const connectorInstanceId1 = "besu1_" + uuidv4();
    const connectorInstanceId2 = "besu2_" + uuidv4();
    const connectorInstanceId3 = "besu3_" + uuidv4();

    const keychainInstanceId1 = "keychain_instance1_" + uuidv4();
    const keychainId1 = "keychain1_" + uuidv4();
    const keychain1 = new PluginKeychainMemory({
      instanceId: keychainInstanceId1,
      keychainId: keychainId1,
      logLevel,
    });
    expect(keychain1).toBeTruthy();
    keychain1.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    pluginRegistry1.add(keychain1);

    const keychainInstanceId2 = "keychain_instance2_" + uuidv4();
    const keychainId2 = "keychain2_" + uuidv4();
    const keychain2 = new PluginKeychainMemory({
      instanceId: keychainInstanceId2,
      keychainId: keychainId2,
      logLevel,
    });
    expect(keychain2).toBeTruthy();
    keychain2.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    pluginRegistry2.add(keychain2);

    const keychainInstanceId3 = "keychain_instance3_" + uuidv4();
    const keychainId3 = "keychain3_" + uuidv4();
    const keychain3 = new PluginKeychainMemory({
      instanceId: keychainInstanceId3,
      keychainId: keychainId3,
      logLevel,
    });
    expect(keychain3).toBeTruthy();
    keychain3.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    pluginRegistry3.add(keychain3);

    const connector1 = await pluginFactoryLedgerConnector.create({
      instanceId: connectorInstanceId1,
      pluginRegistry: pluginRegistry1,
      rpcApiHttpHost: rpcApiHttpHostMember1,
      rpcApiWsHost: rpcApiWsHostMember1,
      logLevel,
    });
    expect(connector1).toBeTruthy();
    infrastructureElements.push({ stop: () => connector1.shutdown() });
    pluginRegistry1.add(connector1);

    const connector2 = await pluginFactoryLedgerConnector.create({
      instanceId: connectorInstanceId2,
      pluginRegistry: pluginRegistry2,
      rpcApiHttpHost: rpcApiHttpHostMember2,
      rpcApiWsHost: rpcApiWsHostMember2,
      logLevel,
    });
    expect(connector2).toBeTruthy();
    infrastructureElements.push({ stop: () => connector2.shutdown() });
    pluginRegistry2.add(connector2);

    const connector3 = await pluginFactoryLedgerConnector.create({
      instanceId: connectorInstanceId3,
      pluginRegistry: pluginRegistry3,
      rpcApiHttpHost: rpcApiHttpHostMember3,
      rpcApiWsHost: rpcApiWsHostMember3,
      logLevel,
    });
    expect(connector3).toBeTruthy();
    infrastructureElements.push({ stop: () => connector3.shutdown() });
    pluginRegistry3.add(connector3);

    await connector1.onPluginInit();
    await connector2.onPluginInit();
    await connector3.onPluginInit();

    const web3QuorumMember1 = Web3JsQuorum(web3Member1);
    expect(web3QuorumMember1).toBeTruthy();

    const web3QuorumMember2 = Web3JsQuorum(web3Member2);
    expect(web3QuorumMember2).toBeTruthy();

    const web3QuorumMember3 = Web3JsQuorum(web3Member3);
    expect(web3QuorumMember3).toBeTruthy();

    const deployOut = await connector1.deployContract({
      bytecode: HelloWorldContractJson.bytecode,
      contractAbi: HelloWorldContractJson.abi,
      contractName: HelloWorldContractJson.contractName,
      constructorArgs: [],
      privateTransactionConfig: {
        privateFrom: keys.tessera.member1.publicKey,
        privateFor: [
          keys.tessera.member1.publicKey,
          keys.tessera.member2.publicKey,
        ],
      },
      web3SigningCredential: {
        secret: keys.besu.member1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: keychain1.getKeychainId(),
      gas: 3000000,
    });

    expect(deployOut).toBeTruthy();
    expect(deployOut).toBeObject();

    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeObject();

    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeString();

    expect(deployOut.transactionReceipt.commitmentHash).toBeTruthy();
    expect(deployOut.transactionReceipt.commitmentHash).toBeString();

    // t.ok(deployRes.status, "deployRes.status truthy OK");
    // t.equal(deployRes.status, 200, "deployRes.status === 200 OK");
    // t.ok(deployRes.data, "deployRes.data truthy OK");
    // t.ok(
    //   deployRes.data.transactionReceipt,
    //   "deployRes.data.transactionReceipt truthy OK",
    // );

    // t.ok(privacyMarkerTxHash, "privacyMarkerTxHash truthy OK");

    const contractDeployReceipt =
      (await web3QuorumMember1.priv.waitForTransactionReceipt(
        deployOut.transactionReceipt.commitmentHash,
      )) as IPrivateTransactionReceipt;

    expect(contractDeployReceipt).toBeTruthy();
    const receipt = contractDeployReceipt as IPrivateTransactionReceipt;

    const { contractAddress } = receipt;
    expect(contractAddress).toBeTruthy();
    expect(contractAddress).toBeString();
    expect(contractAddress).not.toBeEmpty();

    // Check that the third node does not see the transaction of the contract
    // deployment that was sent to node 1 and 2 only, not 3.
    const txReceiptNever =
      await web3QuorumMember3.priv.waitForTransactionReceipt(
        deployOut.transactionReceipt.commitmentHash,
      );
    expect(txReceiptNever).toBeFalsy();

    // Check that node 1 and 2 can indeed see the transaction for the contract
    // deployment that was sent to them and them only (node 3 was left out)

    // Note that changing this to use web3QuorumMember3 breaks it and I'm suspecting
    // that this is what's plaguing the tests that are based on the connector
    // which is instantiated with a single web3+web3 Quorum client.
    // What I will try next is to have 3 connectors each with a web3 Quorum client
    // that points to one of the 3 nodes and see if that makes it work.
    const txReceiptAlways1 =
      await web3QuorumMember1.priv.waitForTransactionReceipt(
        deployOut.transactionReceipt.commitmentHash,
      );
    expect(txReceiptAlways1).toBeTruthy();

    const txReceiptAlways2 =
      await web3QuorumMember2.priv.waitForTransactionReceipt(
        deployOut.transactionReceipt.commitmentHash,
      );
    expect(txReceiptAlways2).toBeTruthy();

    const contract = new web3Member1.eth.Contract(
      HelloWorldContractJson.abi as never,
    );

    {
      const data = contract.methods.setName("ProfessorCactus - #1").encodeABI();
      const functionParams = {
        to: contractDeployReceipt.contractAddress,
        data,
        privateFrom: keys.tessera.member1.publicKey,
        privateFor: [keys.tessera.member2.publicKey],
        privateKey: keys.besu.member1.privateKey,
      };
      const transactionHash =
        await web3QuorumMember1.priv.generateAndSendRawTransaction(
          functionParams,
        );
      expect(transactionHash).toBeTruthy();
      expect(transactionHash).not.toBeEmpty();
      expect(transactionHash).toBeString();

      const result =
        await web3QuorumMember1.priv.waitForTransactionReceipt(transactionHash);
      expect(result).toBeTruthy();
    }

    {
      const data = contract.methods.getName().encodeABI();
      const fnParams = {
        to: contractDeployReceipt.contractAddress,
        data,
        privateFrom: keys.tessera.member1.publicKey,
        privateFor: [keys.tessera.member2.publicKey],
        privateKey: keys.besu.member1.privateKey,
      };

      const privacyGroupId =
        web3QuorumMember1.utils.generatePrivacyGroup(fnParams);
      const callOutput = await web3QuorumMember1.priv.call(privacyGroupId, {
        to: contractDeployReceipt.contractAddress,
        data: contract.methods.getName().encodeABI(),
      });
      expect(callOutput).toBeTruthy();
      const name = web3Member1.eth.abi.decodeParameter("string", callOutput);
      expect(name).toEqual("ProfessorCactus - #1");
    }

    {
      // Member 3 cannot see into the privacy group of 1 and 2 so the getName
      // will not return the value that was set earlier in that privacy group.
      const data = contract.methods.getName().encodeABI();
      const fnParams = {
        to: contractDeployReceipt.contractAddress,
        data,
        privateFrom: keys.tessera.member1.publicKey,
        privateFor: [keys.tessera.member2.publicKey],
        privateKey: keys.besu.member3.privateKey,
      };

      const privacyGroupId =
        web3QuorumMember3.utils.generatePrivacyGroup(fnParams);
      const callOutput = await web3QuorumMember3.priv.call(privacyGroupId, {
        to: contractDeployReceipt.contractAddress,
        data,
      });
      expect(callOutput).toEqual("0x");
    }

    {
      const data = contract.methods.setName("ProfessorCactus - #2").encodeABI();
      const functionParams = {
        to: contractDeployReceipt.contractAddress,
        data,
        privateFrom: keys.tessera.member2.publicKey,
        privateFor: [keys.tessera.member2.publicKey],
        privateKey: keys.besu.member2.privateKey,
      };
      const transactionHash =
        await web3QuorumMember2.priv.generateAndSendRawTransaction(
          functionParams,
        );
      expect(transactionHash).toBeTruthy();

      const result =
        await web3QuorumMember2.priv.waitForTransactionReceipt(transactionHash);
      expect(result).toBeTruthy();
    }

    {
      const data = contract.methods.setName("ProfessorCactus - #3").encodeABI();
      const functionParams = {
        to: contractDeployReceipt.contractAddress,
        data,
        privateFrom: keys.tessera.member3.publicKey,
        privateKey: keys.besu.member3.privateKey,
        privateFor: [keys.tessera.member2.publicKey],
      };
      const transactionHash =
        await web3QuorumMember3.priv.generateAndSendRawTransaction(
          functionParams,
        );
      expect(transactionHash).toBeTruthy();

      const result =
        await web3QuorumMember3.priv.waitForTransactionReceipt(transactionHash);
      expect(result).toBeTruthy();
    }

    {
      const contractInvocationNoPrivTxConfig = connector1.invokeContract({
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress: contractDeployReceipt.contractAddress,
        invocationType: EthContractInvocationType.Call,
        gas: 3000000,
        methodName: "getName",
        params: [],
        signingCredential: {
          secret: "incorrect-secret",
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });
      // try {
      //   await contractInvocationNoPrivTxConfig;
      // } catch (ex) {
      //   console.log(ex);
      // }
      const wrongSecretErrorMsgPattern =
        /Returned values aren't valid, did it run Out of Gas\? You might also see this error if you are not using the correct ABI for the contract you are retrieving data from, requesting data from a block number that does not exist, or querying a node which is not fully synced\./;

      await expect(contractInvocationNoPrivTxConfig).rejects.toHaveProperty(
        "message",
        expect.stringMatching(wrongSecretErrorMsgPattern),
      );
    }

    {
      const res = await connector1.invokeContract({
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress: contractDeployReceipt.contractAddress,
        invocationType: EthContractInvocationType.Send,
        gas: 3000000,
        methodName: "setName",
        params: ["Doctor Cactus"],
        privateTransactionConfig: {
          privateFrom: keys.tessera.member1.publicKey,
          privateFor: [keys.tessera.member2.publicKey],
        },
        signingCredential: {
          secret: keys.besu.member1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });

      expect(res.success).toEqual("0x1");
    }

    {
      const res = await connector1.invokeContract({
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress: contractDeployReceipt.contractAddress,
        invocationType: EthContractInvocationType.Call,
        gas: 3000000,
        methodName: "getName",
        params: [],
        privateTransactionConfig: {
          privateFrom: keys.tessera.member1.publicKey,
          privateFor: [keys.tessera.member2.publicKey],
        },
        signingCredential: {
          secret: keys.besu.member1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });

      expect(res.callOutput).toEqual(doctorCactusHex);
    }

    {
      const res = await connector2.invokeContract({
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress: contractDeployReceipt.contractAddress,
        invocationType: EthContractInvocationType.Call,
        gas: 3000000,
        methodName: "getName",
        params: [],
        privateTransactionConfig: {
          privateFrom: keys.tessera.member1.publicKey,
          privateFor: [keys.tessera.member2.publicKey],
        },
        signingCredential: {
          secret: keys.besu.member1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });

      expect(res.callOutput).toEqual(doctorCactusHex);
    }

    {
      const res = await connector3.invokeContract({
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress: contractDeployReceipt.contractAddress,
        invocationType: EthContractInvocationType.Call,
        gas: 3000000,
        methodName: "getName",
        params: [],
        privateTransactionConfig: {
          privateFrom: keys.tessera.member1.publicKey,
          privateFor: [keys.tessera.member2.publicKey],
        },
        signingCredential: {
          secret: keys.besu.member3.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });

      expect(res.callOutput).toEqual("0x");
    }
  });
});
