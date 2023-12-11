import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client-fixed-types";
import { ProofState } from "@aries-framework/core";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { Constants } from "@hyperledger/cactus-core-api";

import {
  AgentConnectionRecordV1,
  AriesProofExchangeRecordV1,
  CactiProofRequestAttributeV1,
  DefaultApi,
  WatchConnectionStateOptionsV1,
  WatchConnectionStateProgressV1,
  WatchConnectionStateV1,
  WatchProofStateOptionsV1,
  WatchProofStateProgressV1,
  WatchProofStateV1,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

export class AriesApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

/**
 * Default timeout when waiting for certain operations (accepting proof, establishing connection, etc...)
 */
const DEFAULT_ARIES_OPERATION_TIMEOUT = 60 * 1000;

/**
 * How often to poll endpoints when waiting for operation to finish.
 */
const WAIT_FOR_CONNECTION_READY_POLL_INTERVAL = 500;

export class AriesApiClient extends DefaultApi {
  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

  public get className(): string {
    return "AriesApiClient";
  }

  constructor(public readonly options: AriesApiClientOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.wsApiHost = options.wsApiHost || options.basePath || location.host;
    this.wsApiPath = options.wsApiPath || Constants.SocketIoConnectionPathV1;
    this.log.debug(`Created ${this.className} OK.`);
    this.log.debug(`wsApiHost=${this.wsApiHost}`);
    this.log.debug(`wsApiPath=${this.wsApiPath}`);
    this.log.debug(`basePath=${this.options.basePath}`);
  }

  /**
   * Watch for connection state changes on given agent.
   * Example: New connection request, connection accepted.
   *
   * @param options Monitor options
   * @returns rxjs `Observable`
   */
  public watchConnectionStateV1(
    options: WatchConnectionStateOptionsV1,
  ): Observable<WatchConnectionStateProgressV1> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchConnectionStateProgressV1>(0);

    socket.on(
      WatchConnectionStateV1.Next,
      (data: WatchConnectionStateProgressV1) => {
        this.log.debug("Received WatchConnectionStateV1.Next");
        subject.next(data);
      },
    );

    socket.on(WatchConnectionStateV1.Error, (ex: string) => {
      this.log.warn("Received WatchConnectionStateV1.Error:", ex);
      subject.error(ex);
    });

    socket.on(WatchConnectionStateV1.Complete, () => {
      this.log.debug("Received WatchConnectionStateV1.Complete");
      subject.complete();
    });

    socket.on("connect", () => {
      this.log.info(
        "Connected OK, sending WatchConnectionStateV1.Subscribe request...",
      );
      socket.emit(WatchConnectionStateV1.Subscribe, options);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        this.log.info("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchConnectionStateV1.Unsubscribe);
        socket.close();
      }),
    );
  }

  /**
   * Watch for proof state changes on given agent.
   * Example: Proof request received, proof request was accepted by peer
   *
   * @param options Monitor options
   * @returns rxjs `Observable`
   */
  public watchProofStateV1(
    options: WatchProofStateOptionsV1,
  ): Observable<WatchProofStateProgressV1> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchProofStateProgressV1>(0);

    socket.on(WatchProofStateV1.Next, (data: WatchProofStateProgressV1) => {
      this.log.debug("Received WatchProofStateV1.Next");
      subject.next(data);
    });

    socket.on(WatchProofStateV1.Error, (ex: string) => {
      this.log.warn("Received WatchProofStateV1.Error:", ex);
      subject.error(ex);
    });

    socket.on(WatchProofStateV1.Complete, () => {
      this.log.debug("Received WatchProofStateV1.Complete");
      subject.complete();
    });

    socket.on("connect", () => {
      this.log.info(
        "Connected OK, sending WatchProofStateV1.Subscribe request...",
      );
      socket.emit(WatchProofStateV1.Subscribe, options);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        this.log.info("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchProofStateV1.Unsubscribe);
        socket.close();
      }),
    );
  }

  /**
   * Helper method to wait for connection record to be created.
   * This does not mean that connection is ready though, just that it was accepted by the peer.
   * Will block until operation is completed.
   *
   * @param agentName agent that requested the connection.
   * @param outOfBandId new connection outOfBandId
   * @param timeout how much time to wait before giving up.
   */
  private async waitForConnectionRecordV1(
    agentName: string,
    outOfBandId: string,
    timeout = DEFAULT_ARIES_OPERATION_TIMEOUT,
  ): Promise<void> {
    Checks.truthy(agentName, "waitForConnectionRecordV1 arg agentName");
    Checks.truthy(outOfBandId, "waitForConnectionRecordV1 arg outOfBandId");
    this.log.debug(
      "waitForConnectionRecordV1 for agent",
      agentName,
      "outOfBandId",
      outOfBandId,
    );

    return new Promise<void>(async (resolve, reject) => {
      // Common cleanup method for leaving the method
      const cleanup = () => {
        if (conStateSubscription) {
          conStateSubscription.unsubscribe();
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      // Handle timeouts
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "waitForConnectionRecordV1() timeout - no connection found",
          ),
        );
      }, timeout);

      // Listen for connection establishment event
      const conStateObservable = this.watchConnectionStateV1({
        agentName,
      });
      const conStateSubscription = conStateObservable.subscribe((e) => {
        if (
          e.connectionRecord.outOfBandId !== outOfBandId ||
          e.connectionRecord.state !== "completed"
        ) {
          return;
        }
        this.log.debug(
          "waitForConnectionRecordV1() - received ConnectionStateChanged event for given outOfBandId",
        );
        cleanup();
        resolve();
      });

      // Also retrieve the connection record by invitation if the event has already fired
      const connectionsResponse = await this.getConnectionsV1({
        agentName,
        filter: {
          outOfBandId,
        },
      });
      const connection = connectionsResponse.data.pop();
      if (connection) {
        this.log.debug(
          "waitForConnectionRecordV1() - connection record already present",
        );
        cleanup();
        resolve();
      }
    });
  }

  /**
   * Wait (block execution) until connection with specified `outOfBandId` is ready (connected).
   *
   * @param agentName agent with specific connection
   * @param outOfBandId connection outOfBandId
   * @param timeout how much time to wait before giving up. Must be at least 1 second.
   */
  public async waitForConnectionReadyV1(
    agentName: string,
    outOfBandId: string,
    timeout = DEFAULT_ARIES_OPERATION_TIMEOUT,
  ): Promise<void> {
    Checks.truthy(agentName, "waitForConnectionReadyV1 arg agentName");
    Checks.truthy(outOfBandId, "waitForConnectionReadyV1 arg outOfBandId");
    Checks.truthy(
      timeout > 2 * WAIT_FOR_CONNECTION_READY_POLL_INTERVAL,
      "waitForConnectionReadyV1 arg timeout to small",
    );
    let connection: AgentConnectionRecordV1 | undefined;
    let counter = Math.ceil(timeout / WAIT_FOR_CONNECTION_READY_POLL_INTERVAL);
    this.log.debug(
      `waitForConnectionReadyV1() timeout ${timeout}, retry ${counter} times...`,
    );

    do {
      try {
        counter--;
        await new Promise((resolve) =>
          setTimeout(resolve, WAIT_FOR_CONNECTION_READY_POLL_INTERVAL),
        );

        const connections = await this.getConnectionsV1({
          agentName,
          filter: {
            outOfBandId,
          },
        });
        connection = connections.data.pop();
      } catch (error) {
        this.log.error("waitForConnectionReadyV1() error:", error);
      }
    } while (counter > 0 && (!connection || !connection.isReady));

    if (counter <= 0) {
      throw new Error(
        `waitForConnectionReadyV1() agent ${agentName} oobId ${outOfBandId} timeout reached!`,
      );
    }

    this.log.info(
      `waitForConnectionReadyV1() agent ${agentName} oobId ${outOfBandId} OK!`,
    );
  }

  /**
   * Wait until invitation URL is accepted by remote client and connection is established.
   * Will block until operation is completed.
   *
   * @param agentName agent that requested the connection (sent the invitation)
   * @param outOfBandId new connection outOfBandId
   * @param timeout how much time to wait before giving up.
   */
  public async waitForInvitedPeerConnectionV1(
    agentName: string,
    outOfBandId: string,
    timeout = DEFAULT_ARIES_OPERATION_TIMEOUT,
  ): Promise<void> {
    Checks.truthy(agentName, "waitForInvitedPeerConnectionV1 arg agentName");
    Checks.truthy(
      outOfBandId,
      "waitForInvitedPeerConnectionV1 arg outOfBandId",
    );
    Checks.truthy(
      timeout > 2 * WAIT_FOR_CONNECTION_READY_POLL_INTERVAL,
      "waitForInvitedPeerConnectionV1 arg timeout to small",
    );

    await this.waitForConnectionRecordV1(agentName, outOfBandId, timeout);
    this.log.info("waitForInvitedPeerConnectionV1() - connection record found");

    await this.waitForConnectionReadyV1(agentName, outOfBandId, timeout);
  }

  /**
   * Wait until proof with specified ID was either accepted or denied.
   * Will block until operation is completed.
   *
   * @param agentName agent that requested the proof.
   * @param proofId id of the proof request.
   * @param timeout how much time to wait before giving up.
   */
  public async waitForProofCompletionV1(
    agentName: string,
    proofId: string,
    timeout = DEFAULT_ARIES_OPERATION_TIMEOUT,
  ): Promise<AriesProofExchangeRecordV1> {
    Checks.truthy(agentName, "waitForProofCompletionV1 arg agentName");
    Checks.truthy(proofId, "waitForProofCompletionV1 arg proofId");

    return new Promise<AriesProofExchangeRecordV1>((resolve, reject) => {
      // Common cleanup method for leaving the method
      const cleanup = () => {
        if (proofStateSubscription) {
          proofStateSubscription.unsubscribe();
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "Timeout reached - could not receive proof confirmation from peer",
          ),
        );
      }, timeout);

      // Listener for proof state changes
      const proofStateObservable = this.watchProofStateV1({
        agentName,
      });
      const proofStateSubscription = proofStateObservable.subscribe((e) => {
        const { id, state } = e.proofRecord;
        if (id === proofId) {
          this.log.debug(
            "Found proof state change with a matching ID",
            e.proofRecord.id,
            e.proofRecord.state,
          );

          if (state === ProofState.Abandoned || state === ProofState.Declined) {
            cleanup();
            reject(
              new Error(
                `Proof ${id} was rejected! ${JSON.stringify(e.proofRecord)}`,
              ),
            );
          }

          if (state === ProofState.Done) {
            cleanup();
            this.log.info(`Proof ${id} was accepted by the peer`);
            resolve(e.proofRecord);
          }
        }
      });
    });
  }

  /**
   * Send proof request and wait for response (accepted / denied by a peer)
   * Will block until operation is completed.
   *
   * @param agentName agent that will request the proof.
   * @param connectionId peer connection id that should provide the proof.
   * @param proofAttributes proof attributes to validate.
   * @param timeout how much time to wait before giving up.
   */
  public async requestProofAndWaitV1(
    agentName: string,
    connectionId: string,
    proofAttributes: CactiProofRequestAttributeV1[],
    timeout = DEFAULT_ARIES_OPERATION_TIMEOUT,
  ): Promise<AriesProofExchangeRecordV1> {
    Checks.truthy(agentName, "requestProofAndWaitV1 arg agentName");
    Checks.truthy(connectionId, "requestProofAndWaitV1 arg connectionId");
    Checks.truthy(proofAttributes, "requestProofAndWaitV1 arg proofAttributes");

    const proof = await this.requestProofV1({
      agentName,
      connectionId,
      proofAttributes,
    });
    const proofId = proof.data.id;
    this.log.info("Sent proof request with id", proofId);

    return this.waitForProofCompletionV1(agentName, proofId, timeout);
  }
}
