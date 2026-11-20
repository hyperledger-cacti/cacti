import {
  CcipTestHarness,
  CCIP_CHAIN_SELECTORS,
  CCIP_DEFAULT_ROUTER_ADDRESS,
  CCIP_DEFAULT_LINK_TOKEN_ADDRESS,
  CCIP_DEFAULT_BNM_TOKEN_ADDRESS,
  CCIP_DEFAULT_LNM_TOKEN_ADDRESS,
} from "../../../../main/typescript/ccip/ccip-test-harness";

describe("CcipTestHarness Unit Tests", () => {
  let harness: CcipTestHarness;

  afterEach(async () => {
    if (harness) {
      await harness.destroy();
    }
  });

  describe("Constructor & Configuration", () => {
    it("instantiates with default options and bidirectional lanes", async () => {
      harness = new CcipTestHarness();
      expect(harness).toBeDefined();
      expect(harness.isRunning()).toBe(false);

      await harness.start();
      expect(harness.isRunning()).toBe(true);

      const info = await harness.getConnectionInfo();
      expect(info.routerAddress).toBe(CCIP_DEFAULT_ROUTER_ADDRESS);
      expect(info.linkTokenAddress).toBe(CCIP_DEFAULT_LINK_TOKEN_ADDRESS);
      expect(info.ccipBnmTokenAddress).toBe(CCIP_DEFAULT_BNM_TOKEN_ADDRESS);
      expect(info.ccipLnmTokenAddress).toBe(CCIP_DEFAULT_LNM_TOKEN_ADDRESS);
      expect(info.sourceChainSelector).toBe(
        CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_A,
      );
      expect(info.destinationChainSelector).toBe(
        CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
      );
      expect(info.supportedLanes).toHaveLength(2);
      expect(info.autoRelay).toBe(true);
    });

    it("accepts custom chain selectors and custom lane configurations", async () => {
      harness = new CcipTestHarness({
        sourceChainSelector: CCIP_CHAIN_SELECTORS.ETHEREUM_SEPOLIA,
        destinationChainSelector: CCIP_CHAIN_SELECTORS.ARBITRUM_SEPOLIA,
        routerAddress: "0x1234567890123456789012345678901234567890",
        autoRelay: false,
        logLevel: "SILENT",
      });

      await harness.start();
      const info = await harness.getConnectionInfo();
      expect(info.sourceChainSelector).toBe(
        CCIP_CHAIN_SELECTORS.ETHEREUM_SEPOLIA,
      );
      expect(info.destinationChainSelector).toBe(
        CCIP_CHAIN_SELECTORS.ARBITRUM_SEPOLIA,
      );
      expect(info.routerAddress).toBe(
        "0x1234567890123456789012345678901234567890",
      );
      expect(info.autoRelay).toBe(false);
    });

    it("throws when querying connection info while harness is not running", async () => {
      harness = new CcipTestHarness({ logLevel: "SILENT" });
      await expect(harness.getConnectionInfo()).rejects.toThrow(
        /Harness is not running/,
      );
    });
  });

  describe("Lifecycle (start, stop, destroy)", () => {
    it("manages running state across lifecycle transitions", async () => {
      harness = new CcipTestHarness({ logLevel: "SILENT" });
      expect(harness.isRunning()).toBe(false);

      const container = await harness.start();
      expect(container).toBeDefined();
      expect(harness.isRunning()).toBe(true);

      // Repeated start returns existing container
      const container2 = await harness.start();
      expect(container2).toBe(container);

      await harness.stop();
      expect(harness.isRunning()).toBe(false);

      await harness.destroy();
      expect(harness.isRunning()).toBe(false);
    });
  });

  describe("Lane Management", () => {
    it("allows registering and retrieving custom lanes", async () => {
      harness = new CcipTestHarness({ logLevel: "SILENT" });
      await harness.start();

      const customSource = CCIP_CHAIN_SELECTORS.BASE_SEPOLIA;
      const customDest = CCIP_CHAIN_SELECTORS.OPTIMISM_SEPOLIA;

      harness.registerLane({
        sourceChainSelector: customSource,
        destinationChainSelector: customDest,
        onRampAddress: "0xOnRamp1",
        offRampAddress: "0xOffRamp1",
        rateLimitCapacity: 500,
        rateLimitRate: 50,
      });

      const lane = harness.getLane(customSource, customDest);
      expect(lane).toBeDefined();
      expect(lane?.onRampAddress).toBe("0xOnRamp1");
      expect(lane?.rateLimitCapacity).toBe(500);

      // Non-existent lane returns undefined
      expect(
        harness.getLane("invalid-source", "invalid-dest"),
      ).toBeUndefined();
    });
  });

  describe("Fee Estimation", () => {
    it("calculates fee based on data payload bytes and token amounts", async () => {
      harness = new CcipTestHarness({ logLevel: "SILENT" });
      await harness.start();

      const smallMsgFee = harness.estimateFee(
        CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
        {
          receiver: "0x1111111111111111111111111111111111111111",
          data: "0x12",
        },
      );

      const largeMsgFee = harness.estimateFee(
        CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
        {
          receiver: "0x1111111111111111111111111111111111111111",
          data: "0x" + "aa".repeat(100),
          tokenAmounts: [
            {
              token: CCIP_DEFAULT_BNM_TOKEN_ADDRESS,
              amount: "1000000000000000000",
            },
          ],
        },
      );

      expect(BigInt(largeMsgFee)).toBeGreaterThan(BigInt(smallMsgFee));
    });
  });

  describe("Message Dispatching & Round-Trip Verification", () => {
    it("dispatches message with autoRelay: true and verifies round-trip", async () => {
      harness = new CcipTestHarness({
        autoRelay: true,
        logLevel: "SILENT",
      });
      await harness.start();

      const receiver = "0x2222222222222222222222222222222222222222";
      const payload = "0xdeadbeefc0ffee";

      const sent = await harness.sendMessage({
        destinationChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
        message: {
          receiver,
          data: payload,
          tokenAmounts: [
            {
              token: CCIP_DEFAULT_BNM_TOKEN_ADDRESS,
              amount: "500000000000000000",
            },
          ],
        },
      });

      expect(sent.messageId).toMatch(/^0x[a-f0-9]{64}$/);
      expect(sent.status).toBe("DELIVERED");
      expect(sent.sequenceNumber).toBe(1);

      // Verify delivered messages list
      const deliveredList = harness.getDeliveredMessages();
      expect(deliveredList).toHaveLength(1);
      expect(deliveredList[0].messageId).toBe(sent.messageId);
      expect(deliveredList[0].receiver).toBe(receiver);
      expect(deliveredList[0].data).toBe(payload);
      expect(deliveredList[0].success).toBe(true);

      // Verify round-trip helper
      expect(harness.verifyRoundTrip(sent.messageId)).toBe(true);
      expect(harness.verifyRoundTrip("0xnonexistent")).toBe(false);
    });

    it("queues messages with autoRelay: false and supports relayNextMessage and relayAllMessages", async () => {
      harness = new CcipTestHarness({
        autoRelay: false,
        logLevel: "SILENT",
      });
      await harness.start();

      const sent1 = await harness.sendMessage({
        destinationChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
        message: {
          receiver: "0x3333333333333333333333333333333333333333",
          data: "0x01",
        },
      });

      const sent2 = await harness.sendMessage({
        destinationChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
        message: {
          receiver: "0x4444444444444444444444444444444444444444",
          data: "0x02",
        },
      });

      expect(sent1.status).toBe("IN_FLIGHT");
      expect(sent2.status).toBe("IN_FLIGHT");
      expect(harness.getPendingMessages()).toHaveLength(2);
      expect(harness.getDeliveredMessages()).toHaveLength(0);
      expect(harness.verifyRoundTrip(sent1.messageId)).toBe(false);

      // Relay first message
      const relayed1 = await harness.relayNextMessage();
      expect(relayed1).toBeDefined();
      expect(relayed1?.messageId).toBe(sent1.messageId);
      expect(harness.getPendingMessages()).toHaveLength(1);
      expect(harness.verifyRoundTrip(sent1.messageId)).toBe(true);
      expect(harness.verifyRoundTrip(sent2.messageId)).toBe(false);

      // Relay remaining messages
      const relayedRemaining = await harness.relayAllMessages();
      expect(relayedRemaining).toHaveLength(1);
      expect(relayedRemaining[0].messageId).toBe(sent2.messageId);
      expect(harness.getPendingMessages()).toHaveLength(0);
      expect(harness.verifyRoundTrip(sent2.messageId)).toBe(true);
    });

    it("fails when sending to an unsupported destination chain selector", async () => {
      harness = new CcipTestHarness({ logLevel: "SILENT" });
      await harness.start();

      await expect(
        harness.sendMessage({
          destinationChainSelector: "9999999999999999999",
          message: {
            receiver: "0x5555555555555555555555555555555555555555",
            data: "0x",
          },
        }),
      ).rejects.toThrow(/Unsupported cross-chain lane/);
    });

    it("fails when sending a message while harness is not started", async () => {
      harness = new CcipTestHarness({ logLevel: "SILENT" });
      await expect(
        harness.sendMessage({
          destinationChainSelector:
            CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
          message: {
            receiver: "0x5555555555555555555555555555555555555555",
            data: "0x",
          },
        }),
      ).rejects.toThrow(/harness is not running/);
    });
  });
});
