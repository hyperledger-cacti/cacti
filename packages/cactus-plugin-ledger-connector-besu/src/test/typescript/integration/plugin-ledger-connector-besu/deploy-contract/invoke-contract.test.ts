import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";

const testCase = "deploys contract via .json file";

describe(testCase, () => {
  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const logLevel: LogLevelDesc = "TRACE";
  const besuTestLedger = new BesuTestLedger();

  test(testCase, async () => {
    await besuTestLedger.start();

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    /**
     * Constant defining the standard 'dev' Besu genesis.json contents.
     *
     * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
     */
    const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
    const besuKeyPair = {
      privateKey: besuTestLedger.getGenesisAccountPrivKey(),
    };
    const contractName = "HelloWorld";

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
      JSON.stringify(HelloWorldContractJson),
    );
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });
    const connector: PluginLedgerConnectorBesu = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    await connector.onPluginInit();

    await connector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: testEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toEqual(10e9);

    let contractAddress: string;

    {
      const deployOut = await connector.deployContract({
        keychainId: keychainPlugin.getKeychainId(),
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        constructorArgs: [],
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: besuKeyPair.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        bytecode: HelloWorldContractJson.bytecode,
        gas: 1000000,
      });
      expect(deployOut).toBeTruthy();
      expect(deployOut.transactionReceipt).toBeTruthy();
      expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

      contractAddress = deployOut.transactionReceipt.contractAddress as string;
      expect(typeof contractAddress === "string").toBeTrue();

      const { callOutput: helloMsg } = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        signingCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: besuKeyPair.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });
      expect(helloMsg).toBeTruthy();
      expect(typeof helloMsg === "string").toBeTrue();
    }

    {
      const testEthAccount2 = web3.eth.accounts.create(uuidv4());

      const { rawTransaction } = await web3.eth.accounts.signTransaction(
        {
          from: testEthAccount.address,
          to: testEthAccount2.address,
          value: 10e6,
          gas: 1000000,
        },
        testEthAccount.privateKey,
      );

      await connector.transact({
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
        consistencyStrategy: {
          blockConfirmations: 0,
          receiptType: ReceiptType.NodeTxPoolAck,
        },
        transactionConfig: {
          rawTransaction,
        },
      });

      const balance2 = await web3.eth.getBalance(testEthAccount2.address);
      expect(balance2).toBeTruthy();
      expect(parseInt(balance2, 10)).toEqual(10e6);
    }

    {
      const newName = `DrCactus${uuidv4()}`;
      const setNameOut = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        signingCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        nonce: 1,
      });
      expect(setNameOut).toBeTruthy();

      await expect(
        connector.invokeContract({
          contractName,
          keychainId: keychainPlugin.getKeychainId(),
          invocationType: EthContractInvocationType.Send,
          methodName: "setName",
          params: [newName],
          gas: 1000000,
          signingCredential: {
            ethAccount: testEthAccount.address,
            secret: testEthAccount.privateKey,
            type: Web3SigningCredentialType.PrivateKeyHex,
          },
          nonce: 1,
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          message: expect.stringContaining("Nonce too low"),
        }),
      );

      const { callOutput: getNameOut } = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "getName",
        params: [],
        gas: 1000000,
        signingCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });
      expect(getNameOut).toEqual(newName);

      const getNameOut2 = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "getName",
        params: [],
        gas: 1000000,
        signingCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });
      expect(getNameOut2).toBeTruthy();

      const response = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "deposit",
        params: [],
        gas: 1000000,
        signingCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        value: 10,
      });
      expect(response).toBeTruthy();

      const { callOutput } = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "getNameByIndex",
        params: [0],
        gas: 1000000,
        signingCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });
      expect(callOutput).toEqual(newName);
    }

    {
      const newName = `DrCactus${uuidv4()}`;
      const signingCredential: Web3SigningCredentialCactusKeychainRef = {
        ethAccount: testEthAccount.address,
        keychainEntryKey,
        keychainId: keychainPlugin.getKeychainId(),
        type: Web3SigningCredentialType.CactusKeychainRef,
      };

      const setNameOut = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        signingCredential,
        nonce: 4,
      });
      expect(setNameOut).toBeTruthy();

      await expect(
        connector.invokeContract({
          contractName,
          keychainId: keychainPlugin.getKeychainId(),
          invocationType: EthContractInvocationType.Send,
          methodName: "setName",
          params: [newName],
          gas: 1000000,
          signingCredential,
          nonce: 4,
        }),
      ).rejects.toThrow("Nonce too low");

      const { callOutput: getNameOut } = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "getName",
        params: [],
        gas: 1000000,
        signingCredential,
      });
      expect(getNameOut).toEqual(newName);

      const getNameOut2 = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "getName",
        params: [],
        gas: 1000000,
        signingCredential,
      });
      expect(getNameOut2).toBeTruthy();

      const response = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "deposit",
        params: [],
        gas: 1000000,
        signingCredential,
        value: 10,
      });
      expect(response).toBeTruthy();

      const { callOutput: callOut } = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "getNameByIndex",
        params: [1],
        gas: 1000000,
        signingCredential,
      });
      expect(callOut).toEqual(newName);
    }
  });
});
