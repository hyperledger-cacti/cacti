import {
  CcipTestHarness,
  CCIP_CHAIN_SELECTORS,
  ICcipTestHarnessConnectionInfo,
} from "../../../../main/typescript/public-api";

const TEST_TIMEOUT = 30000;

describe("CcipTestHarness Integration", () => {
  const harness = new CcipTestHarness({
    sourceChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_A,
    destinationChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
    autoRelay: true,
    logLevel: "INFO",
  });

  let connectionInfo: ICcipTestHarnessConnectionInfo;

  beforeAll(async () => {
    await harness.start();
    connectionInfo = await harness.getConnectionInfo();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await harness.stop();
    await harness.destroy();
  }, TEST_TIMEOUT);

  it("initializes active CCIP lanes and connection endpoints", () => {
    expect(connectionInfo.isRunning).toBe(true);
    expect(connectionInfo.routerAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(connectionInfo.linkTokenAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(connectionInfo.ccipBnmTokenAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(connectionInfo.supportedLanes.length).toBeGreaterThanOrEqual(2);
  });

  it("executes a complete CCIP message round-trip across simulated lanes", async () => {
    const receiver = "0x9876543210987654321098765432109876543210";
    const payload = "0x534154502d4865726d65732d43434950"; // SATP-Hermes-CCIP

    const sent = await harness.sendMessage({
      destinationChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
      message: {
        receiver,
        data: payload,
        tokenAmounts: [
          {
            token: connectionInfo.ccipBnmTokenAddress,
            amount: "1000000000000000000",
          },
        ],
      },
    });

    expect(sent.messageId).toBeDefined();
    expect(sent.status).toBe("DELIVERED");

    // Verify round-trip delivery
    const isVerified = harness.verifyRoundTrip(sent.messageId);
    expect(isVerified).toBe(true);

    const deliveredList = harness.getDeliveredMessages();
    const delivered = deliveredList.find((m) => m.messageId === sent.messageId);
    expect(delivered).toBeDefined();
    expect(delivered?.receiver).toBe(receiver);
    expect(delivered?.data).toBe(payload);
    expect(delivered?.tokenAmounts).toHaveLength(1);
    expect(delivered?.tokenAmounts[0].amount).toBe("1000000000000000000");
  });
});
