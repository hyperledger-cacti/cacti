import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  PluginLedgerConnectorFabric,
  FabricContractInvocationType,
} from "../../../main/typescript/public-api";
import { Gateway } from "fabric-network";
import * as querySystemChainCodeModule from "../../../main/typescript/common/query-system-chain-code";
import * as getTxReceiptModule from "../../../main/typescript/common/get-transaction-receipt-by-tx-id";

describe("PluginLedgerConnectorFabric Gateway Disconnection Tests", () => {
  let connector: PluginLedgerConnectorFabric;
  let mockDisconnect: jest.Mock;
  let mockGateway: Gateway;

  beforeEach(() => {
    mockDisconnect = jest.fn();
    mockGateway = {
      disconnect: mockDisconnect,
      getNetwork: jest.fn(),
    } as unknown as Gateway;

    const pluginRegistry = new PluginRegistry();
    connector = new PluginLedgerConnectorFabric({
      instanceId: uuidv4(),
      pluginRegistry,
      connectionProfile: {
        name: "test-network",
        version: "1.0.0",
        organizations: {},
        peers: {},
      } as any,
      logLevel: "SILENT",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("transact()", () => {
    it("disconnects gateway when transact() encounters an error", async () => {
      jest
        .spyOn(connector as any, "createGateway")
        .mockResolvedValue(mockGateway);

      (mockGateway.getNetwork as jest.Mock).mockRejectedValue(
        new Error("Network connection failed"),
      );

      const req: any = {
        channelName: "mychannel",
        contractName: "basic",
        invocationType: FabricContractInvocationType.Call,
        methodName: "ReadAsset",
        params: ["asset1"],
      };

      await expect(connector.transact(req)).rejects.toThrow(
        "Unable to run transaction: Network connection failed",
      );

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("disconnects gateway on successful transact() call", async () => {
      const mockContract = {
        createTransaction: jest.fn().mockReturnValue({
          setEndorsingPeers: jest.fn().mockReturnThis(),
          evaluate: jest.fn().mockResolvedValue(Buffer.from("asset-data")),
        }),
      };
      const mockChannel = {
        getEndorsers: jest.fn().mockReturnValue([]),
      };
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue(mockContract),
        getChannel: jest.fn().mockReturnValue(mockChannel),
      };

      (mockGateway.getNetwork as jest.Mock).mockResolvedValue(mockNetwork);
      jest
        .spyOn(connector as any, "createGateway")
        .mockResolvedValue(mockGateway);

      const req: any = {
        channelName: "mychannel",
        contractName: "basic",
        invocationType: FabricContractInvocationType.Call,
        methodName: "ReadAsset",
        params: ["asset1"],
      };

      const res = await connector.transact(req);
      expect(res).toBeDefined();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTransactionReceiptByTxID()", () => {
    it("disconnects gateway on success", async () => {
      jest
        .spyOn(connector as any, "createGateway")
        .mockResolvedValue(mockGateway);
      jest
        .spyOn(getTxReceiptModule, "getTransactionReceiptByTxID")
        .mockResolvedValue({ blockNumber: 10 } as any);

      const req: any = {
        channelName: "mychannel",
        params: ["mychannel", "tx123"],
      };

      const res = await connector.getTransactionReceiptByTxID(req);
      expect(res).toEqual({ blockNumber: 10 });
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("disconnects gateway when getTransactionReceiptByTxID throws", async () => {
      jest
        .spyOn(connector as any, "createGateway")
        .mockResolvedValue(mockGateway);
      jest
        .spyOn(getTxReceiptModule, "getTransactionReceiptByTxID")
        .mockRejectedValue(new Error("Failed to query block"));

      const req: any = {
        channelName: "mychannel",
        params: ["mychannel", "tx123"],
      };

      await expect(connector.getTransactionReceiptByTxID(req)).rejects.toThrow(
        "Failed to query block",
      );
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("getBlock()", () => {
    it("disconnects gateway when query throws", async () => {
      jest
        .spyOn(connector as any, "createGatewayWithOptions")
        .mockResolvedValue(mockGateway);
      jest
        .spyOn(querySystemChainCodeModule, "querySystemChainCode")
        .mockRejectedValue(new Error("Peer query failed"));

      const req: any = {
        channelName: "mychannel",
        gatewayOptions: {},
        query: { blockNumber: 1 },
      };

      await expect(connector.getBlock(req)).rejects.toThrow(
        "Peer query failed",
      );
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("getChainInfo()", () => {
    it("disconnects gateway when query throws", async () => {
      jest
        .spyOn(connector as any, "createGatewayWithOptions")
        .mockResolvedValue(mockGateway);
      jest
        .spyOn(querySystemChainCodeModule, "querySystemChainCode")
        .mockRejectedValue(new Error("QSCC failed"));

      const req: any = {
        channelName: "mychannel",
        gatewayOptions: {},
      };

      await expect(connector.getChainInfo(req)).rejects.toThrow("QSCC failed");
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("getDiscoveryResults()", () => {
    it("disconnects gateway when discovery throws", async () => {
      jest
        .spyOn(connector as any, "createGatewayWithOptions")
        .mockResolvedValue(mockGateway);
      (mockGateway.getNetwork as jest.Mock).mockRejectedValue(
        new Error("Discovery failed"),
      );

      const req: any = {
        channelName: "mychannel",
        gatewayOptions: { discovery: { enabled: true } },
      };

      await expect(connector.getDiscoveryResults(req)).rejects.toThrow(
        "Discovery failed",
      );
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("createFabricListener()", () => {
    it("disconnects gateway if network or contract lookup throws during setup", async () => {
      jest
        .spyOn(connector as any, "createGateway")
        .mockResolvedValue(mockGateway);
      (mockGateway.getNetwork as jest.Mock).mockRejectedValue(
        new Error("Channel does not exist"),
      );

      const req: any = {
        channelName: "badchannel",
        contractName: "basic",
      };

      await expect(
        connector.createFabricListener(req, async () => {}),
      ).rejects.toThrow("Channel does not exist");

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("disconnects gateway when removeListener callback is invoked", async () => {
      const mockContract = {
        addContractListener: jest.fn().mockResolvedValue({} as any),
        removeContractListener: jest.fn(),
      };
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue(mockContract),
      };
      (mockGateway.getNetwork as jest.Mock).mockResolvedValue(mockNetwork);

      jest
        .spyOn(connector as any, "createGateway")
        .mockResolvedValue(mockGateway);

      const req: any = {
        channelName: "mychannel",
        contractName: "basic",
      };

      const handle = await connector.createFabricListener(req, async () => {});
      expect(mockDisconnect).not.toHaveBeenCalled();

      handle.removeListener();
      expect(mockContract.removeContractListener).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
