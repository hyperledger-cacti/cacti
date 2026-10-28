/**
 * Unit tests for BesuLeaf.getReceipt and EthereumLeaf.getReceipt.
 *
 * Regression coverage for cacti issue #4760: both EVM leafs used to return
 * the signed transaction (web3 getTransaction) instead of the mined receipt,
 * so the evidence stored in the assertion claims could not prove on-chain
 * inclusion or outcome (status, block number, gas used, logs).
 */
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import { Web3SigningCredentialType as BesuWeb3SigningCredentialType } from "@hyperledger-cacti/cactus-plugin-ledger-connector-besu";
import {
  Web3SigningCredentialType as EthereumWeb3SigningCredentialType,
  Web3StringReturnFormat,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum";
import { BesuLeaf } from "../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { EthereumLeaf } from "../../../main/typescript/cross-chain-mechanisms/bridge/leafs/ethereum-leaf";
import { OntologyManager } from "../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { TransactionReceiptError } from "../../../main/typescript/cross-chain-mechanisms/common/errors";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";

const TX_HASH =
  "0x8f5a4b6b8e0c4c7f8a1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

const MINED_RECEIPT = {
  transactionHash: TX_HASH,
  transactionIndex: 0,
  blockHash:
    "0x1b4e28ba2a4a2f4a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
  blockNumber: 42,
  from: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
  to: "0xf12b5dd4ead5f743c6baa640b0216200e89b60da",
  gasUsed: 51234,
  cumulativeGasUsed: 51234,
  contractAddress: null,
  status: true,
  logs: [
    {
      address: "0xf12b5dd4ead5f743c6baa640b0216200e89b60da",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      ],
      data: "0x01",
    },
  ],
};

const SIGNED_TRANSACTION = {
  hash: TX_HASH,
  nonce: 7,
  blockHash: MINED_RECEIPT.blockHash,
  blockNumber: MINED_RECEIPT.blockNumber,
  from: MINED_RECEIPT.from,
  to: MINED_RECEIPT.to,
  gas: 6000000,
  gasPrice: "0",
  input: "0xdeadbeef",
  value: "0",
};

const mockBesuConnector = {
  getTransaction: jest.fn(),
  getTransactionReceipt: jest.fn(),
};

const mockEthereumConnector = {
  invokeRawWeb3EthMethod: jest.fn(),
};

jest.mock("@hyperledger-cacti/cactus-plugin-ledger-connector-besu", () => {
  const actual = jest.requireActual(
    "@hyperledger-cacti/cactus-plugin-ledger-connector-besu",
  );
  return {
    ...actual,
    PluginLedgerConnectorBesu: jest
      .fn()
      .mockImplementation(() => mockBesuConnector),
  };
});

jest.mock("@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum", () => {
  const actual = jest.requireActual(
    "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum",
  );
  return {
    ...actual,
    PluginLedgerConnectorEthereum: jest
      .fn()
      .mockImplementation(() => mockEthereumConnector),
  };
});

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const ontologyManager = new OntologyManager(
  { logLevel: "ERROR" },
  monitorService,
);

const SIGNER_ETH_ACCOUNT = MINED_RECEIPT.from;
const SIGNER_SECRET = "0x" + "11".repeat(32);

function makeBesuLeaf(): BesuLeaf {
  return new BesuLeaf(
    {
      networkIdentification: {
        id: "BesuLedgerTestNetwork",
        ledgerType: LedgerType.Besu2X,
      },
      leafId: "test-besu-leaf",
      signingCredential: {
        ethAccount: SIGNER_ETH_ACCOUNT,
        secret: SIGNER_SECRET,
        type: BesuWeb3SigningCredentialType.PrivateKeyHex,
      },
      connectorOptions: {
        instanceId: "besu-connector-test",
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        rpcApiHttpHost: "http://127.0.0.1:8545",
        rpcApiWsHost: "ws://127.0.0.1:8546",
        logLevel: "ERROR",
      },
      wrapperContractName: "SATPWrapperContract",
      wrapperContractAddress: MINED_RECEIPT.to,
      logLevel: "ERROR",
    },
    ontologyManager,
    monitorService,
  );
}

function makeEthereumLeaf(): EthereumLeaf {
  return new EthereumLeaf(
    {
      networkIdentification: {
        id: "EthereumLedgerTestNetwork",
        ledgerType: LedgerType.Ethereum,
      },
      leafId: "test-ethereum-leaf",
      signingCredential: {
        ethAccount: SIGNER_ETH_ACCOUNT,
        secret: SIGNER_SECRET,
        type: EthereumWeb3SigningCredentialType.PrivateKeyHex,
      },
      connectorOptions: {
        instanceId: "ethereum-connector-test",
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        rpcApiHttpHost: "http://127.0.0.1:8545",
        logLevel: "ERROR",
      },
      wrapperContractName: "SATPWrapperContract",
      wrapperContractAddress: MINED_RECEIPT.to,
      logLevel: "ERROR",
    },
    ontologyManager,
    monitorService,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BesuLeaf.getReceipt", () => {
  it("returns the mined receipt, not the signed transaction", async () => {
    mockBesuConnector.getTransaction.mockResolvedValue({
      transaction: SIGNED_TRANSACTION,
    });
    mockBesuConnector.getTransactionReceipt.mockResolvedValue(MINED_RECEIPT);

    const receipt = await makeBesuLeaf().getReceipt(TX_HASH);

    expect(receipt).toBe(safeStableStringify(MINED_RECEIPT));
    expect(mockBesuConnector.getTransactionReceipt).toHaveBeenCalledWith(
      TX_HASH,
    );
    expect(mockBesuConnector.getTransaction).not.toHaveBeenCalled();

    const parsed = JSON.parse(receipt);
    expect(parsed.status).toBe(true);
    expect(parsed.blockNumber).toBe(MINED_RECEIPT.blockNumber);
    expect(parsed.gasUsed).toBe(MINED_RECEIPT.gasUsed);
    expect(parsed.logs).toHaveLength(1);
    expect(parsed).not.toHaveProperty("input");
  });

  it("fails when the transaction has not been mined", async () => {
    mockBesuConnector.getTransactionReceipt.mockResolvedValue(null);

    await expect(makeBesuLeaf().getReceipt(TX_HASH)).rejects.toThrow(
      TransactionReceiptError,
    );
  });
});

describe("EthereumLeaf.getReceipt", () => {
  it("returns the mined receipt, not the signed transaction", async () => {
    mockEthereumConnector.invokeRawWeb3EthMethod.mockImplementation(
      async (req: { methodName: string }) => {
        switch (req.methodName) {
          case "getTransaction":
            return SIGNED_TRANSACTION;
          case "getTransactionReceipt":
            return MINED_RECEIPT;
          default:
            throw new Error(`unexpected web3.eth method ${req.methodName}`);
        }
      },
    );

    const receipt = await makeEthereumLeaf().getReceipt(TX_HASH);

    expect(receipt).toBe(safeStableStringify(MINED_RECEIPT));
    expect(mockEthereumConnector.invokeRawWeb3EthMethod).toHaveBeenCalledTimes(
      1,
    );
    expect(mockEthereumConnector.invokeRawWeb3EthMethod).toHaveBeenCalledWith({
      methodName: "getTransactionReceipt",
      params: [TX_HASH, Web3StringReturnFormat],
    });

    const parsed = JSON.parse(receipt);
    expect(parsed.status).toBe(true);
    expect(parsed.blockNumber).toBe(MINED_RECEIPT.blockNumber);
    expect(parsed.gasUsed).toBe(MINED_RECEIPT.gasUsed);
    expect(parsed.logs).toHaveLength(1);
    expect(parsed).not.toHaveProperty("input");
  });

  it("fails when the transaction has not been mined", async () => {
    mockEthereumConnector.invokeRawWeb3EthMethod.mockResolvedValue(undefined);

    await expect(makeEthereumLeaf().getReceipt(TX_HASH)).rejects.toThrow(
      TransactionReceiptError,
    );
  });
});
