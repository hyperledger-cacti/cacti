import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import Web3EEAClient, { IPrivateTransactionReceipt } from "web3-eea";
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

const testCase = "Executes private transactions on Hyperledger Besu";
const logLevel: LogLevelDesc = "TRACE";

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

test(testCase, async (t: Test) => {
  // At development time one can specify this environment variable if there is
  // a multi-party network already running, which is doable with something like
  // this on the terminal:
  // docker run   --rm   --privileged   --publish 2222:22   --publish 3000:3000   --publish 8545:8545   --publish 8546:8546   --publish 9001:9001   --publish 9081:9081   --publish 9082:9082   --publish 9083:9083   --publish 9090:9090   --publish 18545:18545   --publish 20000:20000   --publish 20001:20001   --publish 20002:20002   --publish 20003:20003   --publish 20004:20004   --publish 20005:20005   --publish 25000:25000   petermetz/cactus-besu-multi-party-all-in-one:0.1.2
  //
  // The upside of this approach is that a new container is not launched from
  // scratch for every test execution which enables faster iteration.
  const preWarmedLedger = process.env.CACTUS_TEST_PRE_WARMED_LEDGER === "true";

  let keys: any;
  if (preWarmedLedger) {
    keys = keysStatic;
  } else {
    const ledger = new BesuMpTestLedger({ logLevel });
    test.onFinish(() => ledger.stop());
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
  t.ok(keychain1, "keychain1 truthy OK");
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
  t.ok(keychain2, "keychain2 truthy OK");
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
  t.ok(keychain3, "keychain3 truthy OK");
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
  t.ok(connector1, "connector1 truthy OK");
  test.onFinish(() => connector1.shutdown());
  pluginRegistry1.add(connector1);

  const connector2 = await pluginFactoryLedgerConnector.create({
    instanceId: connectorInstanceId2,
    pluginRegistry: pluginRegistry2,
    rpcApiHttpHost: rpcApiHttpHostMember2,
    rpcApiWsHost: rpcApiWsHostMember2,
    logLevel,
  });
  t.ok(connector2, "connector2 truthy OK");
  test.onFinish(() => connector2.shutdown());
  pluginRegistry2.add(connector2);

  const connector3 = await pluginFactoryLedgerConnector.create({
    instanceId: connectorInstanceId3,
    pluginRegistry: pluginRegistry3,
    rpcApiHttpHost: rpcApiHttpHostMember3,
    rpcApiWsHost: rpcApiWsHostMember3,
    logLevel,
  });
  t.ok(connector3, "connector3 truthy OK");
  test.onFinish(() => connector3.shutdown());
  pluginRegistry3.add(connector3);

  await connector1.onPluginInit();
  await connector2.onPluginInit();
  await connector3.onPluginInit();

  const chainIdMember1 = await web3Member1.eth.getChainId();
  t.comment(`chainIdMember1=${chainIdMember1}`);
  const chainIdMember2 = await web3Member2.eth.getChainId();
  t.comment(`chainIdMember2=${chainIdMember2}`);
  const chainIdMember3 = await web3Member3.eth.getChainId();
  t.comment(`chainIdMember3=${chainIdMember3}`);

  const web3EeaMember1 = Web3EEAClient(web3Member1, chainIdMember1);
  t.ok(web3EeaMember1, "web3EeaMember1 truthy OK");

  const web3EeaMember2 = Web3EEAClient(web3Member2, chainIdMember2);
  t.ok(web3EeaMember2, "web3EeaMember2 truthy OK");

  const web3EeaMember3 = Web3EEAClient(web3Member3, chainIdMember3);
  t.ok(web3EeaMember3, "web3EeaMember3 truthy OK");

  const deployRes = await connector1.deployContract({
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

  t.ok(deployRes, "deployRes truthy OK");
  t.ok(deployRes.transactionReceipt, "deployRes.transactionReceipt truthy OK");
  t.ok(
    deployRes.transactionReceipt.contractAddress,
    "deployRes.transactionReceipt.contractAddress truthy OK",
  );
  t.ok(
    deployRes.transactionReceipt.commitmentHash,
    "deployRes.transactionReceipt.commitmentHash truthy OK",
  );

  // t.ok(deployRes.status, "deployRes.status truthy OK");
  // t.equal(deployRes.status, 200, "deployRes.status === 200 OK");
  // t.ok(deployRes.data, "deployRes.data truthy OK");
  // t.ok(
  //   deployRes.data.transactionReceipt,
  //   "deployRes.data.transactionReceipt truthy OK",
  // );

  // t.ok(privacyMarkerTxHash, "privacyMarkerTxHash truthy OK");

  const contractDeployReceipt = (await web3EeaMember1.priv.getTransactionReceipt(
    deployRes.transactionReceipt.commitmentHash,
    keys.tessera.member1.publicKey,
  )) as IPrivateTransactionReceipt;

  t.ok(contractDeployReceipt, "contractDeployReceipt truthy OK");
  const receipt = contractDeployReceipt as IPrivateTransactionReceipt;

  const { contractAddress } = receipt;
  t.comment(`Private contract address: ${contractAddress}`);
  t.ok(contractAddress, "contractAddress truthy OK");

  // Check that the third node does not see the transaction of the contract
  // deployment that was sent to node 1 and 2 only, not 3.
  const txReceiptNever = await web3EeaMember3.priv.getTransactionReceipt(
    deployRes.transactionReceipt.commitmentHash,
    keys.tessera.member3.publicKey,
  );
  t.notok(txReceiptNever, "txReceiptNever falsy OK");

  // Check that node 1 and 2 can indeed see the transaction for the contract
  // deployment that was sent to them and them only (node 3 was left out)

  // Note that changing this to use web3EeaMember3 breaks it and I'm suspecting
  // that this is what's plaguing the tests that are based on the connector
  // which is instantiated with a single web3+web3 EEA client.
  // What I will try next is to have 3 connectors each with a web3 EEA client
  // that points to one of the 3 nodes and see if that makes it work.
  const txReceiptAlways1 = await web3EeaMember1.priv.getTransactionReceipt(
    deployRes.transactionReceipt.commitmentHash,
    keys.tessera.member1.publicKey,
  );
  t.ok(txReceiptAlways1, "txReceiptAlways1 truthy OK");

  const txReceiptAlways2 = await web3EeaMember2.priv.getTransactionReceipt(
    deployRes.transactionReceipt.commitmentHash,
    keys.tessera.member2.publicKey,
  );
  t.ok(txReceiptAlways2, "txReceiptAlways2 truthy OK");

  const contract = new web3Member1.eth.Contract(
    HelloWorldContractJson.abi as never,
  );

  {
    t.comment("Checking if member1 can call setName()");
    const data = contract.methods.setName("ProfessorCactus - #1").encodeABI();
    const functionParams = {
      to: contractDeployReceipt.contractAddress,
      data,
      privateFrom: keys.tessera.member1.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member1.privateKey,
    };
    const transactionHash = await web3EeaMember1.eea.sendRawTransaction(
      functionParams,
    );
    t.comment(`Transaction hash: ${transactionHash}`);
    t.ok(transactionHash, "transactionHash truthy OK");

    const result = await web3EeaMember1.priv.getTransactionReceipt(
      transactionHash,
      keys.tessera.member1.publicKey,
    );
    t.comment(`Transaction receipt for set() call: ${JSON.stringify(result)}`);
    t.ok(result, "set() result member 1 truthy OK");
  }

  {
    t.comment("Checking if member1 can see new name via getName()");
    const data = contract.methods.getName().encodeABI();
    const fnParams = {
      to: contractDeployReceipt.contractAddress,
      data,
      privateFrom: keys.tessera.member1.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member1.privateKey,
    };

    const privacyGroupId = web3EeaMember1.priv.generatePrivacyGroup(fnParams);
    const callOutput = await web3EeaMember1.priv.call({
      privacyGroupId,
      to: contractDeployReceipt.contractAddress,
      data: contract.methods.getName().encodeABI(),
      from: "LieutenantCactus",
    });
    t.comment(`getName Call output: ${JSON.stringify(callOutput)}`);
    t.ok(callOutput, "callOutput truthy OK");
    const name = web3EeaMember1.eth.abi.decodeParameter("string", callOutput);
    t.equal(name, "ProfessorCactus - #1", "getName() member 1 equals #1");
  }

  {
    // Member 3 cannot see into the privacy group of 1 and 2 so the getName
    // will not return the value that was set earlier in that privacy group.
    t.comment("Checking if member3 can see new name via getName()");
    const data = contract.methods.getName().encodeABI();
    const fnParams = {
      to: contractDeployReceipt.contractAddress,
      data,
      privateFrom: keys.tessera.member1.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member3.privateKey,
    };

    const privacyGroupId = web3EeaMember3.priv.generatePrivacyGroup(fnParams);
    const callOutput = await web3EeaMember3.priv.call({
      privacyGroupId,
      to: contractDeployReceipt.contractAddress,
      data,
      from: "LieutenantCactus",
    });
    t.comment(`getName member3 output: ${JSON.stringify(callOutput)}`);
    t.equal(callOutput, "0x", "member3 getName callOutput === 0x OK");
  }

  {
    const data = contract.methods.setName("ProfessorCactus - #2").encodeABI();
    t.comment("Checking if member2 can call setName()");
    const functionParams = {
      to: contractDeployReceipt.contractAddress,
      data,
      privateFrom: keys.tessera.member2.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member2.privateKey,
    };
    const transactionHash = await web3EeaMember2.eea.sendRawTransaction(
      functionParams,
    );
    t.comment(`Transaction hash: ${transactionHash}`);
    t.ok(transactionHash, "transactionHash truthy OK");

    const result = await web3EeaMember2.priv.getTransactionReceipt(
      transactionHash,
      keys.tessera.member1.publicKey,
    );
    t.comment(`Transaction receipt for set() call: ${JSON.stringify(result)}`);
    t.ok(result, "set() result member 2 truthy OK");
  }

  {
    const data = contract.methods.setName("ProfessorCactus - #3").encodeABI();
    t.comment("Checking if member3 can call setName()");
    const functionParams = {
      to: contractDeployReceipt.contractAddress,
      data,
      privateFrom: keys.tessera.member3.publicKey,
      privateKey: keys.besu.member3.privateKey,
      privateFor: [keys.tessera.member2.publicKey],
    };
    const transactionHash = await web3EeaMember3.eea.sendRawTransaction(
      functionParams,
    );
    t.comment(`setName tx hash for member 3: ${transactionHash}`);
    t.ok(transactionHash, "setName tx hash for member 3 truthy OK");

    const result = await web3EeaMember3.priv.getTransactionReceipt(
      transactionHash,
      keys.tessera.member1.publicKey,
    );
    t.comment(`Transaction receipt for set() call: ${JSON.stringify(result)}`);
    t.ok(result, "set() result for member 3 truthy OK");
  }

  {
    t.comment("Checking that private contract cannot be called anonymously");
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
    await t.rejects(
      contractInvocationNoPrivTxConfig,
      /Returned values aren't valid, did it run Out of Gas\? You might also see this error if you are not using the correct ABI for the contract you are retrieving data from, requesting data from a block number that does not exist, or querying a node which is not fully synced\./,
      "private contract call fails without Besu member credentials OK",
    );
  }

  {
    t.comment("Ensuring member1 can call setName() via connector");
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

    t.equal(res.success, "0x1", "member1 setName callOutput === 0x1 OK");
  }

  {
    t.comment(
      "Ensuring member1 can call getName() and receive correct value after setName call",
    );
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

    t.equals(
      res.callOutput,
      doctorCactusHex,
      "member1 getName callOutput === DoctorCactus",
    );
  }

  {
    t.comment(
      "Ensuring member2 can call getName() and receive correct value after setName call",
    );
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

    t.equals(
      res.callOutput,
      doctorCactusHex,
      "member2 getName callOutput === DoctorCactus",
    );
  }

  {
    t.comment("Checking if member3 can call getName() via connector");
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

    t.equal(res.callOutput, "0x", "member3 getName callOutput === 0x OK");
  }

  t.end();
});
