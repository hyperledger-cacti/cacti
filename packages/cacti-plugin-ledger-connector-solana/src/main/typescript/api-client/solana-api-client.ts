import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client-fixed-types";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
} from "@hyperledger/cactus-common";
import { Constants, ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  GetAccountInfoV1Request,
  GetAccountInfoV1Response,
  GetBalanceV1Request,
  GetBalanceV1Response,
  GetTransactionV1Request,
  GetTransactionV1Response,
  DeployProgramV1Request,
  DeployProgramV1Response,
  RequestAirdropV1Request,
  RequestAirdropV1Response,
  SendTransactionV1Request,
  SendTransactionV1Response,
  TransferSolV1Request,
  TransferSolV1Response,
  InvokeInstructionV1Request,
  InvokeInstructionV1Response,
  BuildInstructionV1Request,
  BuildInstructionV1Response,
  DecodeAccountV1Request,
  DecodeAccountV1Response,
  InvokeRpcV1Request,
  InvokeRpcV1Response,
  GetFeeForTransactionV1Request,
  GetFeeForTransactionV1Response,
  DecodeEventsV1Request,
  DecodeEventsV1Response,
  WatchBlocksV1,
  WatchBlocksV1Progress,
  WatchLogsV1,
  WatchLogsV1Options,
  WatchLogsV1Progress,
} from "../generated/openapi/typescript-axios";

const BASE =
  "/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana";

export interface SolanaApiClientOptions {
  /** Base URL of the API server hosting the Solana connector, e.g. http://127.0.0.1:4000 */
  basePath: string;
  logLevel?: LogLevelDesc;
  axiosConfig?: AxiosRequestConfig;
}

/**
 * The set of connector operations that can be invoked through the generic
 * `Verifier` abstraction via {@link SolanaApiClient.sendSyncRequest}.
 */
export type SolanaApiCommand =
  | "getBalance"
  | "getAccountInfo"
  | "transferSol"
  | "requestAirdrop"
  | "sendTransaction"
  | "getTransaction"
  | "deployProgram"
  | "invokeInstruction"
  | "buildInstruction"
  | "decodeAccount"
  | "invokeRpc"
  | "getFeeForTransaction"
  | "decodeEvents"
  | "getPrometheusMetrics";

/** `method` input accepted by {@link SolanaApiClient.sendSyncRequest}. */
export type SolanaRequestInputMethod = {
  type: "solanaApi";
  command: SolanaApiCommand;
};

/** `contract` input accepted by sendSyncRequest (unused for Solana; kept for Verifier API parity). */
export type SolanaRequestInputContract = Record<string, unknown>;

/** `args` input accepted by sendSyncRequest; `args` carries the REST request body. */
export type SolanaRequestInputArgs = {
  args?: Record<string, unknown>;
};

/**
 * HTTP client for the Solana ledger connector REST API.
 *
 * Implements {@link ISocketApiClient} so the connector can be driven through
 * the generic `Verifier` / `VerifierFactory` abstraction in
 * `@hyperledger/cactus-verifier-client`. Only the request/response surface
 * (`sendSyncRequest` / `sendAsyncRequest`) is implemented: Solana has no
 * socket.io block-monitoring endpoint, so `watchBlocksV1` is intentionally
 * omitted (the `Verifier` reports "not supported" if monitoring is attempted).
 */
export class SolanaApiClient
  implements ISocketApiClient<WatchBlocksV1Progress>
{
  public static readonly CLASS_NAME = "SolanaApiClient";

  private readonly http: AxiosInstance;
  private readonly log: Logger;

  public get className(): string {
    return SolanaApiClient.CLASS_NAME;
  }

  constructor(public readonly options: SolanaApiClientOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.nonBlankString(options.basePath, `${fnTag} options.basePath`);

    this.log = LoggerProvider.getOrCreate({
      level: options.logLevel ?? "INFO",
      label: this.className,
    });

    this.http = axios.create({
      baseURL: options.basePath,
      ...options.axiosConfig,
    });
  }

  async sendTransactionV1(
    req: SendTransactionV1Request,
  ): Promise<{ data: SendTransactionV1Response; status: number }> {
    const res = await this.http.post<SendTransactionV1Response>(
      `${BASE}/send-transaction`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async getBalanceV1(
    req: GetBalanceV1Request,
  ): Promise<{ data: GetBalanceV1Response; status: number }> {
    const res = await this.http.post<GetBalanceV1Response>(
      `${BASE}/get-balance`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async getAccountInfoV1(
    req: GetAccountInfoV1Request,
  ): Promise<{ data: GetAccountInfoV1Response; status: number }> {
    const res = await this.http.post<GetAccountInfoV1Response>(
      `${BASE}/get-account-info`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async transferSolV1(
    req: TransferSolV1Request,
  ): Promise<{ data: TransferSolV1Response; status: number }> {
    const res = await this.http.post<TransferSolV1Response>(
      `${BASE}/transfer-sol`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async requestAirdropV1(
    req: RequestAirdropV1Request,
  ): Promise<{ data: RequestAirdropV1Response; status: number }> {
    const res = await this.http.post<RequestAirdropV1Response>(
      `${BASE}/request-airdrop`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async deployProgramV1(
    req: DeployProgramV1Request,
  ): Promise<{ data: DeployProgramV1Response; status: number }> {
    const res = await this.http.post<DeployProgramV1Response>(
      `${BASE}/deploy-program`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async getTransactionV1(
    req: GetTransactionV1Request,
  ): Promise<{ data: GetTransactionV1Response; status: number }> {
    const res = await this.http.post<GetTransactionV1Response>(
      `${BASE}/get-transaction`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async invokeInstructionV1(
    req: InvokeInstructionV1Request,
  ): Promise<{ data: InvokeInstructionV1Response; status: number }> {
    const res = await this.http.post<InvokeInstructionV1Response>(
      `${BASE}/invoke-instruction`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async buildInstructionV1(
    req: BuildInstructionV1Request,
  ): Promise<{ data: BuildInstructionV1Response; status: number }> {
    const res = await this.http.post<BuildInstructionV1Response>(
      `${BASE}/build-instruction`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async decodeAccountV1(
    req: DecodeAccountV1Request,
  ): Promise<{ data: DecodeAccountV1Response; status: number }> {
    const res = await this.http.post<DecodeAccountV1Response>(
      `${BASE}/decode-account`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async invokeRpcV1(
    req: InvokeRpcV1Request,
  ): Promise<{ data: InvokeRpcV1Response; status: number }> {
    const res = await this.http.post<InvokeRpcV1Response>(
      `${BASE}/invoke-rpc`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async getFeeForTransactionV1(
    req: GetFeeForTransactionV1Request,
  ): Promise<{ data: GetFeeForTransactionV1Response; status: number }> {
    const res = await this.http.post<GetFeeForTransactionV1Response>(
      `${BASE}/get-fee-for-transaction`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async decodeEventsV1(
    req: DecodeEventsV1Request,
  ): Promise<{ data: DecodeEventsV1Response; status: number }> {
    const res = await this.http.post<DecodeEventsV1Response>(
      `${BASE}/decode-events`,
      req,
    );
    return { data: res.data, status: res.status };
  }

  async getPrometheusExporterMetricsV1(): Promise<{
    data: string;
    status: number;
  }> {
    const res = await this.http.get<string>(
      `${BASE}/get-prometheus-exporter-metrics`,
    );
    return { data: res.data, status: res.status };
  }

  /**
   * Stream new Solana slots over socket.io. Returns an Observable that emits a
   * {@link WatchBlocksV1Progress} per slot. This is what the generic `Verifier`
   * uses for `startMonitor`. Unsubscribing closes the socket.
   */
  public watchBlocksV1(): Observable<WatchBlocksV1Progress> {
    const socket = io(this.options.basePath, {
      path: Constants.SocketIoConnectionPathV1,
    });
    const subject = new ReplaySubject<WatchBlocksV1Progress>(0);

    socket.on(WatchBlocksV1.Next, (data: WatchBlocksV1Progress) => {
      subject.next(data);
    });
    socket.on(WatchBlocksV1.Error, (ex: string) => {
      this.log.warn("watchBlocksV1 error:", ex);
      subject.error(ex);
    });
    socket.on("connect", () => {
      this.log.debug("watchBlocksV1 connected; subscribing...");
      socket.emit(WatchBlocksV1.Subscribe);
    });
    socket.connect();

    return subject.pipe(
      finalize(() => {
        socket.emit(WatchBlocksV1.Unsubscribe);
        socket.close();
      }),
    );
  }

  /**
   * Stream transaction logs over socket.io, backed by the node's `logsSubscribe`
   * (a push subscription, not polling). Pass `{ programId }` to receive only
   * logs of transactions mentioning that program; omit it for all logs. The
   * emitted `logs` can be fed straight into {@link decodeEventsV1}.
   */
  public watchLogsV1(
    options?: WatchLogsV1Options,
  ): Observable<WatchLogsV1Progress> {
    const socket = io(this.options.basePath, {
      path: Constants.SocketIoConnectionPathV1,
    });
    const subject = new ReplaySubject<WatchLogsV1Progress>(0);

    socket.on(WatchLogsV1.Next, (data: WatchLogsV1Progress) => {
      subject.next(data);
    });
    socket.on(WatchLogsV1.Error, (ex: string) => {
      this.log.warn("watchLogsV1 error:", ex);
      subject.error(ex);
    });
    socket.on("connect", () => {
      this.log.debug("watchLogsV1 connected; subscribing...");
      socket.emit(WatchLogsV1.Subscribe, options);
    });
    socket.connect();

    return subject.pipe(
      finalize(() => {
        socket.emit(WatchLogsV1.Unsubscribe);
        socket.close();
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // ISocketApiClient – generic Verifier interface
  // ---------------------------------------------------------------------------

  /**
   * Dispatch a synchronous request to one of the connector's REST operations.
   * Used by the `Verifier` abstraction. `args.args` carries the REST request body.
   *
   * @returns `{ status, data }` from the underlying REST call.
   */
  public async sendSyncRequest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _contract: SolanaRequestInputContract = {},
    method: SolanaRequestInputMethod = {
      type: "solanaApi",
      command: "getBalance",
    },
    args: SolanaRequestInputArgs = {},
  ): Promise<unknown> {
    const fnTag = `${this.className}#sendSyncRequest()`;
    Checks.truthy(method, `${fnTag} method`);
    Checks.truthy(method.command, `${fnTag} method.command`);
    const body = (args?.args ?? {}) as never;

    switch (method.command) {
      case "getBalance":
        return this.getBalanceV1(body as GetBalanceV1Request);
      case "getAccountInfo":
        return this.getAccountInfoV1(body as GetAccountInfoV1Request);
      case "transferSol":
        return this.transferSolV1(body as TransferSolV1Request);
      case "requestAirdrop":
        return this.requestAirdropV1(body as RequestAirdropV1Request);
      case "sendTransaction":
        return this.sendTransactionV1(body as SendTransactionV1Request);
      case "getTransaction":
        return this.getTransactionV1(body as GetTransactionV1Request);
      case "deployProgram":
        return this.deployProgramV1(body as DeployProgramV1Request);
      case "invokeInstruction":
        return this.invokeInstructionV1(body as InvokeInstructionV1Request);
      case "buildInstruction":
        return this.buildInstructionV1(body as BuildInstructionV1Request);
      case "decodeAccount":
        return this.decodeAccountV1(body as DecodeAccountV1Request);
      case "invokeRpc":
        return this.invokeRpcV1(body as InvokeRpcV1Request);
      case "getFeeForTransaction":
        return this.getFeeForTransactionV1(
          body as GetFeeForTransactionV1Request,
        );
      case "decodeEvents":
        return this.decodeEventsV1(body as DecodeEventsV1Request);
      case "getPrometheusMetrics":
        return this.getPrometheusExporterMetricsV1();
      default: {
        // Exhaustiveness: every SolanaApiCommand must be handled above.
        const unknownCommand: never = method.command;
        throw new Error(
          `${fnTag} Unsupported Solana command: ${JSON.stringify(unknownCommand)}`,
        );
      }
    }
  }

  /**
   * Fire-and-forget variant of {@link sendSyncRequest}. Mirrors the Ethereum
   * connector: it is a thin wrapper that logs the eventual result or error.
   */
  public sendAsyncRequest(
    contract: SolanaRequestInputContract = {},
    method: SolanaRequestInputMethod = {
      type: "solanaApi",
      command: "getBalance",
    },
    args: SolanaRequestInputArgs = {},
  ): void {
    const fnTag = `${this.className}#sendAsyncRequest()`;
    this.sendSyncRequest(contract, method, args)
      .then((value) => {
        this.log.debug(`${fnTag} resolved (${method.command})`, value);
      })
      .catch((err) => {
        this.log.warn(`${fnTag} failed (${method.command}). Error:`, err);
      });
  }
}
