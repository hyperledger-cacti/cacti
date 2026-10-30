import "jest-extended";
import { EventEmitter } from "events";
import { Gateway } from "fabric-network";
import { Channel, IdentityContext } from "fabric-common";
import { Socket as SocketIoSocket } from "socket.io";

import { WatchBlocksV1Endpoint } from "../../../main/typescript/watch-blocks/watch-blocks-v1-endpoint";
import {
  WatchBlocksV1,
  WatchBlocksListenerTypeV1,
  WatchBlocksOptionsV1,
  WatchBlocksDelegatedSignOptionsV1,
} from "../../../main/typescript/generated/openapi/typescript-axios";
import { SignPayloadCallback } from "../../../main/typescript/plugin-ledger-connector-fabric";

class MockSocket extends EventEmitter {
  public id = "test-socket-id-123";
  public connected = true;
  public emittedEvents: { event: string; data: any }[] = [];

  public emit(event: string, ...args: any[]): boolean {
    this.emittedEvents.push({ event, data: args[0] });
    if (event === "disconnect") {
      this.connected = false;
    }
    return super.emit(event, ...args);
  }

  public disconnect(): this {
    if (this.connected) {
      this.connected = false;
      this.emit("disconnect", "io client disconnect");
    }
    return this;
  }
}

describe("WatchBlocksV1Endpoint Gateway and Resource Disconnect Tests", () => {
  let mockSocket: MockSocket;
  let endpoint: WatchBlocksV1Endpoint;

  let mockDisconnect: jest.Mock;
  let mockGetNetwork: jest.Mock;
  let mockAddBlockListener: jest.Mock;
  let mockRemoveBlockListener: jest.Mock;
  let mockNetwork: any;
  let mockGateway: Gateway;

  let mockChannelClose: jest.Mock;
  let mockClientClose: jest.Mock;
  let mockEventServiceClose: jest.Mock;
  let mockUnregisterEventListener: jest.Mock;
  let mockEventServiceSend: jest.Mock;
  let mockEventService: any;
  let mockChannel: Channel;
  let mockUserIdCtx: IdentityContext;
  let mockSignCallback: SignPayloadCallback;

  beforeEach(() => {
    mockSocket = new MockSocket();
    endpoint = new WatchBlocksV1Endpoint({
      socket: mockSocket as unknown as SocketIoSocket,
      logLevel: "SILENT",
    });

    mockDisconnect = jest.fn();
    mockAddBlockListener = jest.fn().mockResolvedValue(undefined);
    mockRemoveBlockListener = jest.fn();
    mockNetwork = {
      addBlockListener: mockAddBlockListener,
      removeBlockListener: mockRemoveBlockListener,
    };
    mockGetNetwork = jest.fn().mockResolvedValue(mockNetwork);
    mockGateway = {
      disconnect: mockDisconnect,
      getNetwork: mockGetNetwork,
    } as unknown as Gateway;

    mockChannelClose = jest.fn();
    mockClientClose = jest.fn();
    mockEventServiceClose = jest.fn();
    mockUnregisterEventListener = jest.fn();
    mockEventServiceSend = jest.fn().mockResolvedValue(undefined);

    mockEventService = {
      setTargets: jest.fn(),
      registerBlockListener: jest.fn().mockReturnValue({
        unregisterEventListener: mockUnregisterEventListener,
      }),
      build: jest.fn().mockReturnValue(Buffer.from("request")),
      sign: jest.fn(),
      send: mockEventServiceSend,
      close: mockEventServiceClose,
    };

    mockChannel = {
      close: mockChannelClose,
      client: {
        close: mockClientClose,
        newEventer: jest.fn().mockReturnValue({
          setEndpoint: jest.fn(),
        }),
      },
      getEndorsers: jest
        .fn()
        .mockReturnValue([
          { name: "peer0.org1", endpoint: { url: "grpc://localhost:7051" } },
        ]),
      newEventService: jest.fn().mockReturnValue(mockEventService),
    } as unknown as Channel;

    mockUserIdCtx = {} as IdentityContext;
    mockSignCallback = jest.fn().mockResolvedValue(Buffer.from("signature"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("subscribe()", () => {
    it("disconnects gateway when channelName is missing", async () => {
      const options = {
        channelName: "",
        type: WatchBlocksListenerTypeV1.Full,
        gatewayOptions: {} as any,
      } as WatchBlocksOptionsV1;

      await endpoint.subscribe(options, mockGateway);

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain("Missing channel name");
    });

    it("disconnects gateway when gateway.getNetwork() throws", async () => {
      mockGetNetwork.mockRejectedValue(new Error("Channel does not exist"));

      const options: WatchBlocksOptionsV1 = {
        channelName: "nonexistent-channel",
        type: WatchBlocksListenerTypeV1.Full,
        gatewayOptions: {} as any,
      };

      await endpoint.subscribe(options, mockGateway);

      expect(mockGetNetwork).toHaveBeenCalledWith("nonexistent-channel");
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain(
        "Channel does not exist",
      );
    });

    it("disconnects gateway when requested block listener type is invalid", async () => {
      const options = {
        channelName: "mychannel",
        type: "INVALID_LISTENER_TYPE" as WatchBlocksListenerTypeV1,
        gatewayOptions: {} as any,
      };

      await endpoint.subscribe(options, mockGateway);

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain(
        "Unknown block listen type",
      );
    });

    it("disconnects gateway when network.addBlockListener() throws", async () => {
      mockAddBlockListener.mockRejectedValue(
        new Error("Failed to register block listener on peer"),
      );

      const options: WatchBlocksOptionsV1 = {
        channelName: "mychannel",
        type: WatchBlocksListenerTypeV1.Full,
        gatewayOptions: {} as any,
      };

      await endpoint.subscribe(options, mockGateway);

      expect(mockAddBlockListener).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain(
        "Failed to register block listener on peer",
      );
    });

    it("disconnects gateway immediately if socket was disconnected during subscription setup", async () => {
      mockAddBlockListener.mockImplementation(async () => {
        // Simulate client abruptly disconnecting mid-operation
        mockSocket.connected = false;
      });

      const options: WatchBlocksOptionsV1 = {
        channelName: "mychannel",
        type: WatchBlocksListenerTypeV1.Full,
        gatewayOptions: {} as any,
      };

      await endpoint.subscribe(options, mockGateway);

      expect(mockRemoveBlockListener).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("does not disconnect gateway on successful subscribe(), but disconnects on socket disconnect event", async () => {
      const options: WatchBlocksOptionsV1 = {
        channelName: "mychannel",
        type: WatchBlocksListenerTypeV1.Full,
        gatewayOptions: {} as any,
      };

      await endpoint.subscribe(options, mockGateway);

      expect(mockDisconnect).not.toHaveBeenCalled();

      // Trigger socket disconnect
      mockSocket.emit("disconnect", "transport close");

      expect(mockRemoveBlockListener).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("gracefully catches and logs if gateway.disconnect() throws during error handling", async () => {
      mockGetNetwork.mockRejectedValue(new Error("Peer network unreachable"));
      mockDisconnect.mockImplementation(() => {
        throw new Error("Disconnect network error");
      });

      const options: WatchBlocksOptionsV1 = {
        channelName: "mychannel",
        type: WatchBlocksListenerTypeV1.Full,
        gatewayOptions: {} as any,
      };

      // Should not rethrow or crash
      await expect(
        endpoint.subscribe(options, mockGateway),
      ).resolves.toBeUndefined();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain(
        "Peer network unreachable",
      );
    });
  });

  describe("SubscribeDelegatedSign()", () => {
    it("closes channel and client when no peers are available for monitoring", async () => {
      (mockChannel.getEndorsers as jest.Mock).mockReturnValue([]);

      const options: WatchBlocksDelegatedSignOptionsV1 = {
        channelName: "mychannel",
        signerMspID: "Org1MSP",
        signerCertificate: "cert",
        type: WatchBlocksListenerTypeV1.Full,
      };

      await endpoint.SubscribeDelegatedSign(
        options,
        mockChannel,
        mockUserIdCtx,
        mockSignCallback,
      );

      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);
      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain(
        "No peers (eventers) available for monitoring",
      );
    });

    it("closes eventService, channel, and client when signCallback throws", async () => {
      const failingSignCallback: SignPayloadCallback = jest
        .fn()
        .mockRejectedValue(new Error("Signing rejected"));

      const options: WatchBlocksDelegatedSignOptionsV1 = {
        channelName: "mychannel",
        signerMspID: "Org1MSP",
        signerCertificate: "cert",
        type: WatchBlocksListenerTypeV1.Full,
      };

      await endpoint.SubscribeDelegatedSign(
        options,
        mockChannel,
        mockUserIdCtx,
        failingSignCallback,
      );

      expect(mockUnregisterEventListener).toHaveBeenCalledTimes(1);
      expect(mockEventServiceClose).toHaveBeenCalledTimes(1);
      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);

      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain("Signing rejected");
    });

    it("closes eventService, channel, and client when eventService.send() throws", async () => {
      mockEventServiceSend.mockRejectedValue(
        new Error("Deliver service stream connection failed"),
      );

      const options: WatchBlocksDelegatedSignOptionsV1 = {
        channelName: "mychannel",
        signerMspID: "Org1MSP",
        signerCertificate: "cert",
        type: WatchBlocksListenerTypeV1.Full,
      };

      await endpoint.SubscribeDelegatedSign(
        options,
        mockChannel,
        mockUserIdCtx,
        mockSignCallback,
      );

      expect(mockUnregisterEventListener).toHaveBeenCalledTimes(1);
      expect(mockEventServiceClose).toHaveBeenCalledTimes(1);
      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);

      const errorEvent = mockSocket.emittedEvents.find(
        (e) => e.event === WatchBlocksV1.Error,
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data?.code).toEqual(500);
      expect(errorEvent?.data?.errorMessage).toContain(
        "Deliver service stream connection failed",
      );
    });

    it("cleans up resources immediately if socket was disconnected during delegated sign setup", async () => {
      mockEventServiceSend.mockImplementation(async () => {
        mockSocket.connected = false;
      });

      const options: WatchBlocksDelegatedSignOptionsV1 = {
        channelName: "mychannel",
        signerMspID: "Org1MSP",
        signerCertificate: "cert",
        type: WatchBlocksListenerTypeV1.Full,
      };

      await endpoint.SubscribeDelegatedSign(
        options,
        mockChannel,
        mockUserIdCtx,
        mockSignCallback,
      );

      expect(mockUnregisterEventListener).toHaveBeenCalledTimes(1);
      expect(mockEventServiceClose).toHaveBeenCalledTimes(1);
      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);
    });

    it("cleans up all resources on socket disconnect event after successful subscription", async () => {
      const options: WatchBlocksDelegatedSignOptionsV1 = {
        channelName: "mychannel",
        signerMspID: "Org1MSP",
        signerCertificate: "cert",
        type: WatchBlocksListenerTypeV1.Full,
      };

      await endpoint.SubscribeDelegatedSign(
        options,
        mockChannel,
        mockUserIdCtx,
        mockSignCallback,
      );

      expect(mockChannelClose).not.toHaveBeenCalled();
      expect(mockEventServiceClose).not.toHaveBeenCalled();

      // Trigger socket disconnect
      mockSocket.emit("disconnect", "transport close");

      expect(mockUnregisterEventListener).toHaveBeenCalledTimes(1);
      expect(mockEventServiceClose).toHaveBeenCalledTimes(1);
      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);
    });

    it("gracefully catches and logs errors when channel/client close throws during cleanup", async () => {
      (mockChannel.getEndorsers as jest.Mock).mockReturnValue([]);
      mockChannelClose.mockImplementation(() => {
        throw new Error("Channel close failed");
      });
      mockClientClose.mockImplementation(() => {
        throw new Error("Client close failed");
      });

      const options: WatchBlocksDelegatedSignOptionsV1 = {
        channelName: "mychannel",
        signerMspID: "Org1MSP",
        signerCertificate: "cert",
        type: WatchBlocksListenerTypeV1.Full,
      };

      await expect(
        endpoint.SubscribeDelegatedSign(
          options,
          mockChannel,
          mockUserIdCtx,
          mockSignCallback,
        ),
      ).resolves.toBeUndefined();

      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);
    });
  });
});
