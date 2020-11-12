import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
} from "../../../../../main/typescript/public-api";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";

test("deploys contract via .json file", async (t: Test) => {
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const besuKeyPair = await besuTestLedger.getBesuKeyPair();

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
  });

  const { transactionReceipt } = await connector.deployContract({
    bytecode: HelloWorldContractJson.bytecode,
    web3SigningCredential: {
      ethAccount: "",
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
    },
    gas: 1000000,
  });
  t.ok(transactionReceipt, "TX Receipt truthy OK");

  const { contractAddress } = transactionReceipt;
  t.ok(contractAddress, "TX Receipt Contract Address truthy OK");

  const { callOutput } = await connector.invokeContract({
    contractAbi: HelloWorldContractJson.abi,
    contractAddress: contractAddress as string,
    invocationType: EthContractInvocationType.CALL,
    methodName: "sayHello",
    params: [],
    web3SigningCredential: {
      type: Web3SigningCredentialType.NONE,
    },
  });

  t.ok(callOutput, "sayHello() call output truthy OK");
  t.equal(callOutput, "Hello World!", "sayHello() says Hello World! OK");

  t.end();
});
