import { createHash, randomUUID } from "crypto";
import { Container } from "dockerode";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";
import { ITestLedger } from "../i-test-ledger";

/**
 * Standard Chainlink CCIP Chain Selectors for public testnets and local test environments.
 */
export const CCIP_CHAIN_SELECTORS = Object.freeze({
  ETHEREUM_SEPOLIA: "16015286601757825753",
  OPTIMISM_SEPOLIA: "5224473277236331295",
  ARBITRUM_SEPOLIA: "3478487238524512106",
  BASE_SEPOLIA: "10344971235874465080",
  POLYGON_AMOY: "16281711391670634445",
  LOCAL_SIMULATED_CHAIN_A: "14767482510784806043",
  LOCAL_SIMULATED_CHAIN_B: "5009297550715157269",
});

export const CCIP_DEFAULT_ROUTER_ADDRESS =
  "0x514910771AF9Ca656af840dff83E8264EcF986CA";
export const CCIP_DEFAULT_LINK_TOKEN_ADDRESS =
  "0x779877A7B0D9E8603169DdbD7836e478b4624789";
export const CCIP_DEFAULT_BNM_TOKEN_ADDRESS =
  "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05";
export const CCIP_DEFAULT_LNM_TOKEN_ADDRESS =
  "0x466D489b6d66EBDe140742307635679754388a41";

export interface ICcipTokenAmount {
  readonly token: string;
  readonly amount: string;
}

export interface ICcipMessage {
  readonly receiver: string;
  readonly data: string;
  readonly tokenAmounts?: ICcipTokenAmount[];
  readonly feeToken?: string;
  readonly extraArgs?: string;
}

export interface ICcipSendMessageRequest {
  readonly destinationChainSelector: string;
  readonly message: ICcipMessage;
  readonly sourceChainSelector?: string;
  readonly sender?: string;
  readonly feePaymentMode?: "LINK" | "NATIVE";
}

export interface ICcipSendMessageResponse {
  readonly messageId: string;
  readonly sourceChainSelector: string;
  readonly destinationChainSelector: string;
  readonly sender: string;
  readonly receiver: string;
  readonly sequenceNumber: number;
  readonly feeAmount: string;
  readonly feeToken: string;
  readonly timestamp: number;
  readonly status: "SENT" | "IN_FLIGHT" | "DELIVERED" | "FAILED";
  readonly data: string;
  readonly tokenAmounts: ICcipTokenAmount[];
}

export interface ICcipDeliveredMessage {
  readonly messageId: string;
  readonly sourceChainSelector: string;
  readonly destinationChainSelector: string;
  readonly sourceSender: string;
  readonly receiver: string;
  readonly data: string;
  readonly tokenAmounts: ICcipTokenAmount[];
  readonly sequenceNumber: number;
  readonly deliveredAt: number;
  readonly success: boolean;
}

export interface ICcipLaneConfig {
  readonly sourceChainSelector: string;
  readonly destinationChainSelector: string;
  readonly routerAddress?: string;
  readonly onRampAddress?: string;
  readonly offRampAddress?: string;
  readonly linkTokenAddress?: string;
  readonly ccipBnmAddress?: string;
  readonly rateLimitCapacity?: number;
  readonly rateLimitRate?: number;
}

export interface ICcipTestHarnessOptions {
  readonly logLevel?: LogLevelDesc;
  readonly sourceChainSelector?: string;
  readonly destinationChainSelector?: string;
  readonly routerAddress?: string;
  readonly linkTokenAddress?: string;
  readonly ccipBnmTokenAddress?: string;
  readonly ccipLnmTokenAddress?: string;
  readonly autoRelay?: boolean;
  readonly lanes?: ICcipLaneConfig[];
  readonly rpcApiHttpHost?: string;
}

export interface ICcipTestHarnessConnectionInfo {
  readonly routerAddress: string;
  readonly linkTokenAddress: string;
  readonly ccipBnmTokenAddress: string;
  readonly ccipLnmTokenAddress: string;
  readonly sourceChainSelector: string;
  readonly destinationChainSelector: string;
  readonly supportedLanes: ICcipLaneConfig[];
  readonly autoRelay: boolean;
  readonly isRunning: boolean;
  readonly rpcApiHttpHost?: string;
}

export const CCIP_TEST_HARNESS_DEFAULT_OPTIONS: Required<
  Omit<ICcipTestHarnessOptions, "lanes" | "rpcApiHttpHost">
> = Object.freeze({
  logLevel: "INFO",
  sourceChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_A,
  destinationChainSelector: CCIP_CHAIN_SELECTORS.LOCAL_SIMULATED_CHAIN_B,
  routerAddress: CCIP_DEFAULT_ROUTER_ADDRESS,
  linkTokenAddress: CCIP_DEFAULT_LINK_TOKEN_ADDRESS,
  ccipBnmTokenAddress: CCIP_DEFAULT_BNM_TOKEN_ADDRESS,
  ccipLnmTokenAddress: CCIP_DEFAULT_LNM_TOKEN_ADDRESS,
  autoRelay: true,
});

/**
 * CcipTestHarness manages simulated Chainlink CCIP infrastructure for local cross-chain testing.
 * Provides lane management, router simulation, fee estimation, message queuing, and round-trip verification.
 */
export class CcipTestHarness implements ITestLedger {
  public static readonly CLASS_NAME = "CcipTestHarness";
  private readonly log: Logger;
  private readonly options: Required<
    Omit<ICcipTestHarnessOptions, "lanes" | "rpcApiHttpHost">
  > & {
    lanes?: ICcipLaneConfig[];
    rpcApiHttpHost?: string;
  };

  private readonly lanes: Map<string, ICcipLaneConfig> = new Map();
  private readonly sentMessages: ICcipSendMessageResponse[] = [];
  private readonly deliveredMessages: ICcipDeliveredMessage[] = [];
  private readonly pendingQueue: ICcipSendMessageResponse[] = [];

  private running = false;
  private sequenceCounter = 0;
  private mockContainer: Container | undefined;

  public constructor(options?: ICcipTestHarnessOptions) {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#constructor()`;
    this.options = {
      ...CCIP_TEST_HARNESS_DEFAULT_OPTIONS,
      ...options,
    };

    this.log = LoggerProvider.getOrCreate({
      label: CcipTestHarness.CLASS_NAME,
      level: this.options.logLevel,
    });

    Checks.truthy(this.options, `${fnTag} options`);
    Checks.nonBlankString(
      this.options.sourceChainSelector,
      `${fnTag} sourceChainSelector`,
    );
    Checks.nonBlankString(
      this.options.destinationChainSelector,
      `${fnTag} destinationChainSelector`,
    );

    // Initialize default bidirectional lane between source and destination
    this.registerLane({
      sourceChainSelector: this.options.sourceChainSelector,
      destinationChainSelector: this.options.destinationChainSelector,
      routerAddress: this.options.routerAddress,
      linkTokenAddress: this.options.linkTokenAddress,
      ccipBnmAddress: this.options.ccipBnmTokenAddress,
    });

    this.registerLane({
      sourceChainSelector: this.options.destinationChainSelector,
      destinationChainSelector: this.options.sourceChainSelector,
      routerAddress: this.options.routerAddress,
      linkTokenAddress: this.options.linkTokenAddress,
      ccipBnmAddress: this.options.ccipBnmTokenAddress,
    });

    if (options?.lanes) {
      for (const lane of options.lanes) {
        this.registerLane(lane);
      }
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Starts the CCIP test harness, activating routing lanes and message processing queues.
   */
  public async start(): Promise<Container> {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#start()`;
    this.log.info(`${fnTag} Starting CCIP test harness...`);

    if (this.running) {
      this.log.warn(`${fnTag} CCIP test harness already running.`);
      return this.mockContainer as Container;
    }

    this.running = true;

    // Construct a synthetic Container handle satisfying ITestLedger contract
    const instanceId = randomUUID();
    this.mockContainer = {
      id: `ccip-simulated-harness-${instanceId}`,
      inspect: async () => ({
        Id: `ccip-simulated-harness-${instanceId}`,
        State: { Running: true, Status: "running" },
        Config: { Image: "cactus-ccip-test-harness:simulated" },
      }),
      stop: async () => this.stop(),
      remove: async () => this.destroy(),
    } as unknown as Container;

    this.log.info(
      `${fnTag} CCIP test harness started with ${this.lanes.size} active lane(s).`,
    );
    return this.mockContainer;
  }

  /**
   * Stops the harness, pausing queue processing and message routing.
   */
  public async stop(): Promise<unknown> {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#stop()`;
    this.log.info(`${fnTag} Stopping CCIP test harness...`);
    this.running = false;
    return Promise.resolve();
  }

  /**
   * Destroys the harness, clearing all message queues, registered lanes, and state.
   */
  public async destroy(): Promise<unknown> {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#destroy()`;
    this.log.info(`${fnTag} Destroying CCIP test harness...`);
    this.running = false;
    this.pendingQueue.length = 0;
    this.mockContainer = undefined;
    return Promise.resolve();
  }

  /**
   * Retrieves connection and configuration details for the active harness.
   */
  public async getConnectionInfo(): Promise<ICcipTestHarnessConnectionInfo> {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#getConnectionInfo()`;
    if (!this.running) {
      throw new Error(
        `${fnTag} Harness is not running. Call start() before querying connection info.`,
      );
    }

    return {
      routerAddress: this.options.routerAddress,
      linkTokenAddress: this.options.linkTokenAddress,
      ccipBnmTokenAddress: this.options.ccipBnmTokenAddress,
      ccipLnmTokenAddress: this.options.ccipLnmTokenAddress,
      sourceChainSelector: this.options.sourceChainSelector,
      destinationChainSelector: this.options.destinationChainSelector,
      supportedLanes: Array.from(this.lanes.values()),
      autoRelay: this.options.autoRelay,
      isRunning: this.running,
      rpcApiHttpHost: this.options.rpcApiHttpHost,
    };
  }

  /**
   * Registers a supported cross-chain lane in the routing table.
   */
  public registerLane(lane: ICcipLaneConfig): void {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#registerLane()`;
    Checks.truthy(lane, `${fnTag} lane`);
    Checks.nonBlankString(
      lane.sourceChainSelector,
      `${fnTag} sourceChainSelector`,
    );
    Checks.nonBlankString(
      lane.destinationChainSelector,
      `${fnTag} destinationChainSelector`,
    );

    const laneKey = this.getLaneKey(
      lane.sourceChainSelector,
      lane.destinationChainSelector,
    );
    this.lanes.set(laneKey, {
      routerAddress: this.options.routerAddress,
      linkTokenAddress: this.options.linkTokenAddress,
      ccipBnmAddress: this.options.ccipBnmTokenAddress,
      rateLimitCapacity: 1000,
      rateLimitRate: 100,
      ...lane,
    });
    this.log.debug(`${fnTag} Registered CCIP lane: ${laneKey}`);
  }

  /**
   * Queries configuration of a registered lane.
   */
  public getLane(
    sourceChainSelector: string,
    destinationChainSelector: string,
  ): ICcipLaneConfig | undefined {
    return this.lanes.get(
      this.getLaneKey(sourceChainSelector, destinationChainSelector),
    );
  }

  /**
   * Dispatches a cross-chain message via the CCIP router.
   */
  public async sendMessage(
    request: ICcipSendMessageRequest,
  ): Promise<ICcipSendMessageResponse> {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#sendMessage()`;
    if (!this.running) {
      throw new Error(
        `${fnTag} Cannot send message: harness is not running. Call start() first.`,
      );
    }

    Checks.truthy(request, `${fnTag} request`);
    Checks.truthy(request.message, `${fnTag} request.message`);
    Checks.nonBlankString(
      request.destinationChainSelector,
      `${fnTag} destinationChainSelector`,
    );
    Checks.nonBlankString(
      request.message.receiver,
      `${fnTag} message.receiver`,
    );

    const sourceSelector =
      request.sourceChainSelector ?? this.options.sourceChainSelector;
    const laneKey = this.getLaneKey(
      sourceSelector,
      request.destinationChainSelector,
    );

    if (!this.lanes.has(laneKey)) {
      throw new Error(
        `${fnTag} Unsupported cross-chain lane from ${sourceSelector} to ${request.destinationChainSelector}. Register lane first.`,
      );
    }

    this.sequenceCounter += 1;
    const sender =
      request.sender ?? "0x0000000000000000000000000000000000000001";
    const feeAmount = this.estimateFee(
      request.destinationChainSelector,
      request.message,
      request.message.feeToken,
    );
    const feeToken =
      request.message.feeToken ??
      (request.feePaymentMode === "NATIVE"
        ? "0x0000000000000000000000000000000000000000"
        : this.options.linkTokenAddress);

    const messageId = this.computeMessageId(
      sourceSelector,
      request.destinationChainSelector,
      sender,
      request.message.receiver,
      this.sequenceCounter,
      request.message.data,
    );

    const sentRecord: ICcipSendMessageResponse = {
      messageId,
      sourceChainSelector: sourceSelector,
      destinationChainSelector: request.destinationChainSelector,
      sender,
      receiver: request.message.receiver,
      sequenceNumber: this.sequenceCounter,
      feeAmount,
      feeToken,
      timestamp: Date.now(),
      status: this.options.autoRelay ? "DELIVERED" : "IN_FLIGHT",
      data: request.message.data,
      tokenAmounts: request.message.tokenAmounts ?? [],
    };

    this.sentMessages.push(sentRecord);

    if (this.options.autoRelay) {
      const delivered: ICcipDeliveredMessage = {
        messageId,
        sourceChainSelector: sourceSelector,
        destinationChainSelector: request.destinationChainSelector,
        sourceSender: sender,
        receiver: request.message.receiver,
        data: request.message.data,
        tokenAmounts: request.message.tokenAmounts ?? [],
        sequenceNumber: this.sequenceCounter,
        deliveredAt: Date.now(),
        success: true,
      };
      this.deliveredMessages.push(delivered);
      this.log.info(
        `${fnTag} Auto-relayed CCIP message ${messageId} to ${request.message.receiver} on ${request.destinationChainSelector}`,
      );
    } else {
      this.pendingQueue.push(sentRecord);
      this.log.info(
        `${fnTag} Queued CCIP message ${messageId} in-flight for relay`,
      );
    }

    return sentRecord;
  }

  /**
   * Relays the next pending in-flight cross-chain message to the destination receiver.
   */
  public async relayNextMessage(): Promise<ICcipDeliveredMessage | undefined> {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#relayNextMessage()`;
    if (this.pendingQueue.length === 0) {
      return undefined;
    }

    const message = this.pendingQueue.shift()!;
    const delivered: ICcipDeliveredMessage = {
      messageId: message.messageId,
      sourceChainSelector: message.sourceChainSelector,
      destinationChainSelector: message.destinationChainSelector,
      sourceSender: message.sender,
      receiver: message.receiver,
      data: message.data,
      tokenAmounts: message.tokenAmounts,
      sequenceNumber: message.sequenceNumber,
      deliveredAt: Date.now(),
      success: true,
    };

    this.deliveredMessages.push(delivered);
    this.log.info(
      `${fnTag} Relayed message ${message.messageId} to destination receiver ${message.receiver}`,
    );
    return delivered;
  }

  /**
   * Relays all pending in-flight messages in sequence.
   */
  public async relayAllMessages(): Promise<ICcipDeliveredMessage[]> {
    const delivered: ICcipDeliveredMessage[] = [];
    while (this.pendingQueue.length > 0) {
      const msg = await this.relayNextMessage();
      if (msg) {
        delivered.push(msg);
      }
    }
    return delivered;
  }

  /**
   * Estimates fees for a cross-chain message payload.
   */
  public estimateFee(
    destinationChainSelector: string,
    message: ICcipMessage,
    feeToken?: string,
  ): string {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#estimateFee()`;
    Checks.nonBlankString(
      destinationChainSelector,
      `${fnTag} destinationChainSelector`,
    );
    Checks.truthy(message, `${fnTag} message`);

    // Base fee + payload byte cost + token transfer cost
    const baseFee = 1000000000000000n; // 0.001 ether/link base
    const dataBytes = BigInt(Math.max(0, (message.data.length - 2) / 2));
    const dataFee = dataBytes * 160000000000n;
    const tokenFee = BigInt((message.tokenAmounts?.length ?? 0) * 500000000000000);

    const totalFee = baseFee + dataFee + tokenFee;
    return totalFee.toString();
  }

  /**
   * Verifies whether a given messageId completed round-trip delivery successfully.
   */
  public verifyRoundTrip(messageId: string): boolean {
    const fnTag = `${CcipTestHarness.CLASS_NAME}#verifyRoundTrip()`;
    Checks.nonBlankString(messageId, `${fnTag} messageId`);
    return this.deliveredMessages.some(
      (m) => m.messageId === messageId && m.success,
    );
  }

  public getSentMessages(): ICcipSendMessageResponse[] {
    return [...this.sentMessages];
  }

  public getDeliveredMessages(): ICcipDeliveredMessage[] {
    return [...this.deliveredMessages];
  }

  public getPendingMessages(): ICcipSendMessageResponse[] {
    return [...this.pendingQueue];
  }

  private getLaneKey(source: string, destination: string): string {
    return `${source}->${destination}`;
  }

  private computeMessageId(
    sourceSelector: string,
    destinationSelector: string,
    sender: string,
    receiver: string,
    sequence: number,
    data: string,
  ): string {
    const hash = createHash("sha256");
    hash.update(sourceSelector);
    hash.update(destinationSelector);
    hash.update(sender.toLowerCase());
    hash.update(receiver.toLowerCase());
    hash.update(sequence.toString());
    hash.update(data);
    return `0x${hash.digest("hex")}`;
  }
}
