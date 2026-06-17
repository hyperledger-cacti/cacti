import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";
import { Express } from "express";
import axios from "axios";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  VersionedTransaction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import { RuntimeError } from "run-time-error-cjs";

import {
  DeployProgramV1Request,
  DeployProgramV1Response,
  GetAccountInfoV1Request,
  GetAccountInfoV1Response,
  GetBalanceV1Request,
  GetBalanceV1Response,
  GetTransactionV1Request,
  GetTransactionV1Response,
  RequestAirdropV1Request,
  RequestAirdropV1Response,
  SendTransactionV1Request,
  SendTransactionV1Response,
  SolanaSigningCredential,
  SolanaSigningCredentialCactiKeychainRef,
  SolanaSigningCredentialPrivateKeyBase58,
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
} from "./generated/openapi/typescript-axios";

import {
  isSolanaSigningCredentialCactiKeychainRef,
  isSolanaSigningCredentialNone,
  isSolanaSigningCredentialPrivateKeyBase58,
} from "./types/model-type-guards";

import { createSolanaAbi } from "./abi";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { SendTransactionEndpoint } from "./web-services/send-transaction-v1-endpoint";
import { GetBalanceEndpoint } from "./web-services/get-balance-v1-endpoint";
import { GetAccountInfoEndpoint } from "./web-services/get-account-info-v1-endpoint";
import { TransferSolEndpoint } from "./web-services/transfer-sol-v1-endpoint";
import { RequestAirdropEndpoint } from "./web-services/request-airdrop-v1-endpoint";
import { DeployProgramEndpoint } from "./web-services/deploy-program-v1-endpoint";
import { GetTransactionEndpoint } from "./web-services/get-transaction-v1-endpoint";
import { InvokeInstructionEndpoint } from "./web-services/invoke-instruction-v1-endpoint";
import { BuildInstructionEndpoint } from "./web-services/build-instruction-v1-endpoint";
import { DecodeAccountEndpoint } from "./web-services/decode-account-v1-endpoint";
import { InvokeRpcEndpoint } from "./web-services/invoke-rpc-v1-endpoint";
import { GetFeeForTransactionEndpoint } from "./web-services/get-fee-for-transaction-v1-endpoint";
import { DecodeEventsEndpoint } from "./web-services/decode-events-v1-endpoint";
import { GetPrometheusExporterMetricsEndpointV1 } from "./web-services/get-prometheus-exporter-metrics-v1-endpoint";

export { OAS };

// ---------------------------------------------------------------------------
// Upgradeable BPF loader (program deployment)
// ---------------------------------------------------------------------------

/** The on-chain upgradeable BPF loader — the one `solana program deploy` uses. */
const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);
/** `UpgradeableLoaderState::Buffer` metadata: enum tag(4) + Option<Pubkey>(1+32). */
const UPGRADEABLE_BUFFER_METADATA_SIZE = 37;
/** `UpgradeableLoaderState::Program` size: enum tag(4) + Pubkey(32). */
const UPGRADEABLE_PROGRAM_SIZE = 36;
/** Program-data bytes per `Write` tx — kept well under the 1232-byte tx limit. */
const DEPLOY_CHUNK_SIZE = 1011;
/** How many `Write` transactions to send/confirm concurrently. */
const DEPLOY_WRITE_CONCURRENCY = 8;

/** Variant indices of `UpgradeableLoaderInstruction` (bincode: u32 LE tag). */
const UpgradeableLoaderIx = {
  InitializeBuffer: 0,
  Write: 1,
  DeployWithMaxDataLen: 2,
} as const;

/** Bincode-encode a u32 (little-endian). */
const encodeU32LE = (value: number): Buffer => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
};
/** Bincode-encode a u64 (little-endian). */
const encodeU64LE = (value: number): Buffer => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value), 0);
  return buf;
};

export interface IPluginLedgerConnectorSolanaOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  logLevel?: LogLevelDesc;
  prometheusExporter?: PrometheusExporter;
  pluginRegistry: PluginRegistry;
  /** Commitment level to use for confirmations (default: "confirmed"). */
  commitment?: "processed" | "confirmed" | "finalized";
}

export class PluginLedgerConnectorSolana
  implements
  IPluginLedgerConnector<
    DeployProgramV1Request,
    DeployProgramV1Response,
    SendTransactionV1Request,
    SendTransactionV1Response
  >,
  ICactusPlugin,
  IPluginWebService {
  public static readonly CLASS_NAME = "PluginLedgerConnectorSolana";

  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly connection: Connection;
  private readonly pluginRegistry: PluginRegistry;
  private readonly commitment: "processed" | "confirmed" | "finalized";
  /**
   * The configured commitment clamped to a transaction "finality" level
   * ("confirmed" | "finalized"), as required by the historical-read RPCs
   * (`getTransaction`) which reject "processed".
   */
  private readonly finality: "confirmed" | "finalized";

  public prometheusExporter: PrometheusExporter;

  private endpoints: IWebServiceEndpoint[] | undefined;
  /**
   * Per-socket list of unsubscribe closures for live web3.js subscriptions
   * (slot / logs) backing the socket.io watch streams.
   */
  private readonly watchSubscriptions: Map<string, Array<() => Promise<void>>> =
    new Map();
  /** In-flight subscription removals; shutdown awaits these before closing the WS. */
  private readonly inFlightRemovals: Set<Promise<unknown>> = new Set();

  public get className(): string {
    return PluginLedgerConnectorSolana.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorSolanaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    this.instanceId = options.instanceId;
    this.commitment = options.commitment ?? "confirmed";
    this.finality = this.commitment === "finalized" ? "finalized" : "confirmed";

    const level = options.logLevel ?? "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.connection = new Connection(options.rpcApiHttpHost, this.commitment);
    this.pluginRegistry = options.pluginRegistry;

    this.prometheusExporter =
      options.prometheusExporter ??
      new PrometheusExporter({ pollingIntervalInMin: 1 });

    this.prometheusExporter.startMetricsCollection();
  }

  // ---------------------------------------------------------------------------
  // ICactusPlugin
  // ---------------------------------------------------------------------------

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cacti-plugin-ledger-connector-solana";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  // ---------------------------------------------------------------------------
  // IPluginLedgerConnector
  // ---------------------------------------------------------------------------

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Stake;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    return consensusHasTransactionFinality(
      await this.getConsensusAlgorithmFamily(),
    );
  }

  /** IPluginLedgerConnector: deploy a Solana program. */
  public async deployContract(
    req: DeployProgramV1Request,
  ): Promise<DeployProgramV1Response> {
    return this.deployProgram(req);
  }

  /** IPluginLedgerConnector: send a Solana transaction. */
  public async transact(
    req: SendTransactionV1Request,
  ): Promise<SendTransactionV1Response> {
    return this.sendTransaction(req);
  }

  // ---------------------------------------------------------------------------
  // IPluginWebService
  // ---------------------------------------------------------------------------

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async registerWebServices(
    app: Express,
    wsApi?: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    if (wsApi) {
      wsApi.on("connection", (socket: SocketIoSocket) => {
        this.log.debug(`New watch socket connection id=${socket.id}`);

        // --- WatchBlocks: stream new slots via the onSlotChange subscription ---
        socket.on(WatchBlocksV1.Subscribe, () => {
          try {
            const subId = this.connection.onSlotChange((slotInfo) => {
              const next: WatchBlocksV1Progress = {
                slot: slotInfo.slot,
                parent: slotInfo.parent,
                root: slotInfo.root,
              };
              socket.emit(WatchBlocksV1.Next, next);
            });
            this.trackWatchSub(socket.id, () =>
              this.connection.removeSlotChangeListener(subId),
            );
            this.log.debug(`WatchBlocks subscribed socket=${socket.id}`);
          } catch (ex) {
            this.log.error(
              `WatchBlocks subscribe failed socket=${socket.id}`,
              ex,
            );
            socket.emit(WatchBlocksV1.Error, safeStringifyException(ex));
          }
        });

        // --- WatchLogs: stream a program's tx logs via the onLogs subscription ---
        socket.on(WatchLogsV1.Subscribe, (options?: WatchLogsV1Options) => {
          try {
            const filter = options?.programId
              ? new PublicKey(options.programId)
              : "all";
            const subId = this.connection.onLogs(
              filter,
              (logs, ctx) => {
                const next: WatchLogsV1Progress = {
                  signature: logs.signature,
                  err: logs.err ?? null,
                  logs: logs.logs,
                  slot: ctx.slot,
                };
                socket.emit(WatchLogsV1.Next, next);
              },
              this.commitment,
            );
            this.trackWatchSub(socket.id, () =>
              this.connection.removeOnLogsListener(subId),
            );
            this.log.debug(`WatchLogs subscribed socket=${socket.id}`);
          } catch (ex) {
            this.log.error(
              `WatchLogs subscribe failed socket=${socket.id}`,
              ex,
            );
            socket.emit(WatchLogsV1.Error, safeStringifyException(ex));
          }
        });

        const cleanup = (): void => this.removeWatchSubsForSocket(socket.id);
        socket.on(WatchBlocksV1.Unsubscribe, cleanup);
        socket.on(WatchLogsV1.Unsubscribe, cleanup);
        socket.on("disconnect", cleanup);
      });
    }

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const { logLevel } = this.options;
    const opts = { connector: this, logLevel };
    this.endpoints = [
      new SendTransactionEndpoint(opts),
      new GetBalanceEndpoint(opts),
      new GetAccountInfoEndpoint(opts),
      new TransferSolEndpoint(opts),
      new RequestAirdropEndpoint(opts),
      new DeployProgramEndpoint(opts),
      new GetTransactionEndpoint(opts),
      new InvokeInstructionEndpoint(opts),
      new BuildInstructionEndpoint(opts),
      new DecodeAccountEndpoint(opts),
      new InvokeRpcEndpoint(opts),
      new GetFeeForTransactionEndpoint(opts),
      new DecodeEventsEndpoint(opts),
      new GetPrometheusExporterMetricsEndpointV1(opts),
    ];
    return this.endpoints;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
    // Remove every live web3.js subscription (slot/logs) and WAIT for the
    // unsubscribes to complete *while the websocket is still open*. Closing the
    // socket with active subscriptions makes web3.js retry the unsubscribe
    // forever (a fatal OOM loop), so ordering here matters.
    for (const socketId of [...this.watchSubscriptions.keys()]) {
      this.removeWatchSubsForSocket(socketId);
    }
    await Promise.allSettled([...this.inFlightRemovals]);
    this.closeRpcWebSocket();
  }

  /** Register a live subscription's unsubscribe closure against a socket. */
  private trackWatchSub(
    socketId: string,
    unsubscribe: () => Promise<void>,
  ): void {
    const list = this.watchSubscriptions.get(socketId) ?? [];
    list.push(unsubscribe);
    this.watchSubscriptions.set(socketId, list);
  }

  /**
   * Remove all subscriptions for a socket. Fires each unsubscribe and records
   * the in-flight promise so {@link shutdown} can wait for it before closing
   * the websocket.
   */
  private removeWatchSubsForSocket(socketId: string): void {
    const list = this.watchSubscriptions.get(socketId);
    if (!list) {
      return;
    }
    this.watchSubscriptions.delete(socketId);
    for (const unsubscribe of list) {
      const removal = Promise.resolve()
        .then(unsubscribe)
        .catch((ex) => this.log.debug(`watch unsubscribe ignored:`, ex));
      this.inFlightRemovals.add(removal);
      void removal.finally(() => this.inFlightRemovals.delete(removal));
    }
  }

  /**
   * Close the PubSub websocket that `@solana/web3.js` opens lazily for
   * signature-confirmation subscriptions.
   *
   * web3.js keeps that socket alive and `rpc-websockets` auto-reconnects it
   * forever (`max_reconnects: Infinity`). Once the ledger is gone this leaks an
   * open handle (so the host process / jest never exits) and floods stderr with
   * `ws error: connect ECONNREFUSED`. There is no public API to close it on the
   * `Connection`, so we reach into the (well-guarded) internal client: disable
   * auto-reconnect, cancel any pending reconnect timer, and close cleanly
   * (code 1000, so web3.js does not re-arm subscriptions).
   */
  private closeRpcWebSocket(): void {
    const rpcWebSocket = (
      this.connection as unknown as {
        _rpcWebSocket?: {
          setAutoReconnect?: (reconnect: boolean) => void;
          close?: (code?: number) => void;
          reconnect_timer_id?: ReturnType<typeof setTimeout>;
        };
      }
    )._rpcWebSocket;
    if (!rpcWebSocket) {
      return;
    }
    try {
      rpcWebSocket.setAutoReconnect?.(false);
      if (rpcWebSocket.reconnect_timer_id) {
        clearTimeout(rpcWebSocket.reconnect_timer_id);
      }
      rpcWebSocket.close?.(1000);
    } catch (ex) {
      this.log.debug(
        `${this.className}#shutdown() ignoring ws close error:`,
        ex,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Prometheus
  // ---------------------------------------------------------------------------

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    return this.prometheusExporter.getPrometheusMetrics();
  }

  // ---------------------------------------------------------------------------
  // Public API methods
  // ---------------------------------------------------------------------------

  /**
   * Send a serialized (optionally pre-signed) Solana transaction.
   * If a signing credential with a private key is provided the fee-payer
   * field of the transaction will be signed before submission.
   */
  public async sendTransaction(
    req: SendTransactionV1Request,
  ): Promise<SendTransactionV1Response> {
    const fnTag = `${this.className}#sendTransaction()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(
      req.serializedTransaction,
      `${fnTag} req.serializedTransaction`,
    );

    const rawBytes = Buffer.from(req.serializedTransaction, "base64");

    // Detect the wire format first: deserialising as a VersionedTransaction is
    // the only step that may legitimately fail and fall back to legacy. Once the
    // format is chosen, sign + send happen OUTSIDE this try so a genuine send /
    // confirm error is propagated instead of being masked by a fallback legacy
    // deserialization attempt.
    let versionedTx: VersionedTransaction | undefined;
    try {
      versionedTx = VersionedTransaction.deserialize(rawBytes);
    } catch {
      versionedTx = undefined;
    }

    let sig: string;
    if (versionedTx) {
      if (!isSolanaSigningCredentialNone(req.signingCredential)) {
        const signer = await this.resolveKeypair(req.signingCredential);
        versionedTx.sign([signer]);
      }
      sig = await this.connection.sendTransaction(versionedTx, {
        skipPreflight: req.skipPreflight ?? false,
      });
    } else {
      const tx = Transaction.from(rawBytes);
      if (!isSolanaSigningCredentialNone(req.signingCredential)) {
        const signer = await this.resolveKeypair(req.signingCredential);
        const { blockhash } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = signer.publicKey;
        tx.sign(signer);
      }
      sig = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: req.skipPreflight ?? false,
      });
    }

    const confirmation = await this.confirmSignature(sig);
    if (confirmation.value.err) {
      throw new RuntimeError(
        `${fnTag} Transaction ${sig} confirmed with error: ` +
        JSON.stringify(confirmation.value.err),
      );
    }

    this.prometheusExporter.recordTransaction();
    this.log.debug(`sendTransaction OK sig=${sig}`);
    return { signature: sig };
  }

  /** Get the SOL balance of an account in lamports. */
  public async getBalance(
    req: GetBalanceV1Request,
  ): Promise<GetBalanceV1Response> {
    const fnTag = `${this.className}#getBalance()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(req.publicKey, `${fnTag} req.publicKey`);

    const pk = new PublicKey(req.publicKey);
    const lamports = await this.connection.getBalance(pk, this.commitment);
    return { lamports };
  }

  /** Fetch on-chain account data for a public key. */
  public async getAccountInfo(
    req: GetAccountInfoV1Request,
  ): Promise<GetAccountInfoV1Response> {
    const fnTag = `${this.className}#getAccountInfo()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(req.publicKey, `${fnTag} req.publicKey`);

    const pk = new PublicKey(req.publicKey);
    const info = await this.connection.getAccountInfo(pk, this.commitment);
    if (!info) {
      return { exists: false };
    }
    return {
      exists: true,
      lamports: info.lamports,
      owner: info.owner.toBase58(),
      executable: info.executable,
      rentEpoch: info.rentEpoch,
      data: Buffer.from(info.data).toString("base64"),
    };
  }

  /** Transfer SOL from one account to another, signing with the provided credential. */
  public async transferSol(
    req: TransferSolV1Request,
  ): Promise<TransferSolV1Response> {
    const fnTag = `${this.className}#transferSol()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.truthy(req.signingCredential, `${fnTag} req.signingCredential`);
    Checks.truthy(req.recipientPublicKey, `${fnTag} req.recipientPublicKey`);
    Checks.truthy(req.lamports > 0, `${fnTag} req.lamports must be > 0`);

    const signer = await this.resolveKeypair(req.signingCredential);
    const recipient = new PublicKey(req.recipientPublicKey);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: recipient,
        lamports: req.lamports,
      }),
    );

    const sig = await sendAndConfirmTransaction(this.connection, tx, [signer], {
      commitment: this.commitment,
    });

    this.prometheusExporter.recordTransaction();
    this.log.debug(`transferSol OK sig=${sig}`);
    return { signature: sig };
  }

  /** Request a SOL airdrop (localnet / devnet / testnet only). */
  public async requestAirdrop(
    req: RequestAirdropV1Request,
  ): Promise<RequestAirdropV1Response> {
    const fnTag = `${this.className}#requestAirdrop()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(req.publicKey, `${fnTag} req.publicKey`);
    Checks.truthy(req.lamports > 0, `${fnTag} req.lamports must be > 0`);

    const pk = new PublicKey(req.publicKey);
    const sig = await this.connection.requestAirdrop(pk, req.lamports);
    const confirmation = await this.confirmSignature(sig);
    if (confirmation.value.err) {
      throw new RuntimeError(
        `${fnTag} Airdrop ${sig} confirmed with error: ` +
        JSON.stringify(confirmation.value.err),
      );
    }
    this.log.debug(`requestAirdrop OK sig=${sig}`);
    return { signature: sig };
  }

  /**
   * Deploy a compiled Solana program (`.so`) via the **upgradeable BPF loader**
   * (`BPFLoaderUpgradeab1e…`) — the same mechanism `solana program deploy` uses
   * and the only one that yields a usable, upgradeable program on a modern
   * cluster. The deprecated non-upgradeable `BpfLoader` is intentionally avoided.
   *
   * The flow mirrors the CLI:
   *  1. create + `InitializeBuffer` a buffer account owned by the loader,
   *  2. `Write` the program bytes into the buffer in ≤1011-byte chunks, then
   *  3. `DeployWithMaxDataLen` — create the program + programdata accounts and
   *     move the buffer's contents into the programdata account.
   *
   * The payer (resolved from `payerSigningCredential`) funds every account and
   * becomes the program's upgrade authority — matching the CLI default. A `NONE`
   * credential is rejected: deployment signs many transactions server-side and
   * cannot be pre-signed by the client.
   */
  public async deployProgram(
    req: DeployProgramV1Request,
  ): Promise<DeployProgramV1Response> {
    const fnTag = `${this.className}#deployProgram()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(
      req.programBinaryBase64,
      `${fnTag} req.programBinaryBase64`,
    );

    const payer = await this.resolveKeypair(req.payerSigningCredential);
    const authority = payer; // upgrade authority defaults to the payer (CLI default).
    const programData = Buffer.from(req.programBinaryBase64, "base64");
    Checks.truthy(programData.length > 0, `${fnTag} empty program binary`);

    const programKeypair = req.programKeypairBase58
      ? Keypair.fromSecretKey(bs58.decode(req.programKeypairBase58))
      : Keypair.generate();
    const bufferKeypair = Keypair.generate();
    const programId = programKeypair.publicKey;
    const loader = BPF_LOADER_UPGRADEABLE_PROGRAM_ID;
    const deploySignatures: string[] = [];

    this.log.info(
      `${fnTag} Deploying ${programData.length}-byte program to ` +
      `${programId.toBase58()} via the upgradeable loader`,
    );

    // 1) Create the buffer account and initialize it under the loader.
    const bufferSpace = UPGRADEABLE_BUFFER_METADATA_SIZE + programData.length;
    const bufferLamports =
      await this.connection.getMinimumBalanceForRentExemption(bufferSpace);
    const initTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: bufferKeypair.publicKey,
        lamports: bufferLamports,
        space: bufferSpace,
        programId: loader,
      }),
      new TransactionInstruction({
        programId: loader,
        keys: [
          {
            pubkey: bufferKeypair.publicKey,
            isSigner: false,
            isWritable: true,
          },
          { pubkey: authority.publicKey, isSigner: false, isWritable: false },
        ],
        data: encodeU32LE(UpgradeableLoaderIx.InitializeBuffer),
      }),
    );
    deploySignatures.push(
      await sendAndConfirmTransaction(
        this.connection,
        initTx,
        [payer, bufferKeypair],
        { commitment: this.commitment },
      ),
    );

    // 2) Write the program bytes into the buffer in chunks (batched concurrency).
    const chunks: Array<{ offset: number; bytes: Buffer }> = [];
    for (let o = 0; o < programData.length; o += DEPLOY_CHUNK_SIZE) {
      chunks.push({
        offset: o,
        bytes: programData.subarray(o, o + DEPLOY_CHUNK_SIZE),
      });
    }
    this.log.debug(`${fnTag} writing ${chunks.length} chunks`);
    for (let i = 0; i < chunks.length; i += DEPLOY_WRITE_CONCURRENCY) {
      const batch = chunks.slice(i, i + DEPLOY_WRITE_CONCURRENCY);
      await Promise.all(
        batch.map(({ offset, bytes }) => {
          const tx = new Transaction().add(
            new TransactionInstruction({
              programId: loader,
              keys: [
                {
                  pubkey: bufferKeypair.publicKey,
                  isSigner: false,
                  isWritable: true,
                },
                {
                  pubkey: authority.publicKey,
                  isSigner: true,
                  isWritable: false,
                },
              ],
              data: Buffer.concat([
                encodeU32LE(UpgradeableLoaderIx.Write),
                encodeU32LE(offset),
                encodeU64LE(bytes.length),
                bytes,
              ]),
            }),
          );
          return sendAndConfirmTransaction(this.connection, tx, [authority], {
            commitment: this.commitment,
          });
        }),
      );
    }

    // 3) Create the program account and deploy from the buffer.
    const [programDataAddress] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      loader,
    );
    const programLamports =
      await this.connection.getMinimumBalanceForRentExemption(
        UPGRADEABLE_PROGRAM_SIZE,
      );
    const deployTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: programId,
        lamports: programLamports,
        space: UPGRADEABLE_PROGRAM_SIZE,
        programId: loader,
      }),
      new TransactionInstruction({
        programId: loader,
        keys: [
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: programDataAddress, isSigner: false, isWritable: true },
          { pubkey: programId, isSigner: false, isWritable: true },
          {
            pubkey: bufferKeypair.publicKey,
            isSigner: false,
            isWritable: true,
          },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.concat([
          encodeU32LE(UpgradeableLoaderIx.DeployWithMaxDataLen),
          encodeU64LE(programData.length),
        ]),
      }),
    );
    deploySignatures.push(
      await sendAndConfirmTransaction(
        this.connection,
        deployTx,
        [payer, programKeypair],
        { commitment: this.commitment },
      ),
    );

    // Upgradeable programs have "delayed visibility": they cannot be invoked in
    // the same slot they were deployed. Wait for the slot to advance so the
    // returned program is immediately usable by the caller. This is best-effort:
    // the deploy has already landed on-chain, so a transient RPC hiccup here
    // must NOT surface as a deployment failure (a retry would then collide with
    // the now-existing program account).
    try {
      const deployedAtSlot = await this.connection.getSlot(this.commitment);
      const visibleDeadline = Date.now() + 30_000;
      while (Date.now() < visibleDeadline) {
        if ((await this.connection.getSlot(this.commitment)) > deployedAtSlot) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (ex) {
      this.log.debug(
        `${fnTag} visibility wait skipped (deploy already landed):`,
        ex,
      );
    }

    this.prometheusExporter.recordTransaction();
    this.log.info(`${fnTag} Program deployed: ${programId.toBase58()}`);
    return { programId: programId.toBase58(), deploySignatures };
  }

  /** Fetch a confirmed transaction by its base-58 signature. */
  public async getTransaction(
    req: GetTransactionV1Request,
  ): Promise<GetTransactionV1Response> {
    const fnTag = `${this.className}#getTransaction()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(req.signature, `${fnTag} req.signature`);

    const tx = await this.connection.getTransaction(req.signature, {
      commitment: this.finality,
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new RuntimeError(
        `${fnTag} Transaction not found: ${req.signature}`,
      );
    }

    return {
      signature: req.signature,
      slot: tx.slot,
      blockTime: tx.blockTime,
      fee: tx.meta?.fee,
      err: tx.meta?.err,
      logMessages: tx.meta?.logMessages,
      preBalances: tx.meta?.preBalances,
      postBalances: tx.meta?.postBalances,
    };
  }

  // ---------------------------------------------------------------------------
  // ABI-aware instruction encoding (Anchor)
  // ---------------------------------------------------------------------------

  /**
   * Encode a program instruction via the selected ABI (e.g. Anchor), sign it
   * with the supplied credential, submit, and confirm. Convenience path for
   * single-signer instructions.
   *
   * For local signing (keys never leave the client) or multi-signer
   * transactions, use {@link buildInstruction} to get an unsigned transaction,
   * sign it locally, and submit it via {@link sendTransaction} with a `NONE`
   * credential instead.
   */
  public async invokeInstruction(
    req: InvokeInstructionV1Request,
  ): Promise<InvokeInstructionV1Response> {
    const fnTag = `${this.className}#invokeInstruction()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.truthy(req.abi, `${fnTag} req.abi`);
    Checks.truthy(req.invocation, `${fnTag} req.invocation`);
    Checks.truthy(req.signingCredential, `${fnTag} req.signingCredential`);
    if (isSolanaSigningCredentialNone(req.signingCredential)) {
      throw new RuntimeError(
        `${fnTag} signingCredential NONE is not valid here: invokeInstruction ` +
        `must sign the instruction it builds. Use buildInstruction + ` +
        `sendTransaction(NONE) for client-side signing.`,
      );
    }

    const abi = createSolanaAbi(req.abi, this.connection);
    const instructions = await abi.buildInstructions(req.invocation);

    const signer = await this.resolveKeypair(req.signingCredential);
    const { blockhash } = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: blockhash,
    });
    tx.add(...instructions);
    tx.sign(signer);

    const sig = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: req.skipPreflight ?? false,
    });
    const confirmation = await this.confirmSignature(sig);
    if (confirmation.value.err) {
      throw new RuntimeError(
        `${fnTag} Transaction ${sig} confirmed with error: ` +
        JSON.stringify(confirmation.value.err),
      );
    }
    this.prometheusExporter.recordTransaction();
    this.log.debug(`invokeInstruction OK sig=${sig}`);
    return { signature: sig };
  }

  /**
   * Encode a program instruction via the selected ABI and return an UNSIGNED,
   * serialized transaction. No keys are involved. The caller signs it locally
   * (with any number of signers) and submits it via {@link sendTransaction}
   * with a `NONE` credential — so private keys never travel over the wire.
   */
  public async buildInstruction(
    req: BuildInstructionV1Request,
  ): Promise<BuildInstructionV1Response> {
    const fnTag = `${this.className}#buildInstruction()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.truthy(req.abi, `${fnTag} req.abi`);
    Checks.truthy(req.invocation, `${fnTag} req.invocation`);
    Checks.nonBlankString(req.feePayer, `${fnTag} req.feePayer`);

    const abi = createSolanaAbi(req.abi, this.connection);
    const instructions = await abi.buildInstructions(req.invocation);

    const { blockhash } = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: new PublicKey(req.feePayer),
      recentBlockhash: blockhash,
    });
    tx.add(...instructions);

    const serializedTransaction = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");
    return { serializedTransaction };
  }

  /**
   * Decode on-chain account data using the selected ABI's account schema.
   * Supply either the account's public key (the connector reads it) or the raw
   * account data (base64). No keys are involved.
   */
  public async decodeAccount(
    req: DecodeAccountV1Request,
  ): Promise<DecodeAccountV1Response> {
    const fnTag = `${this.className}#decodeAccount()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.truthy(req.abi, `${fnTag} req.abi`);
    Checks.nonBlankString(req.accountName, `${fnTag} req.accountName`);

    const abi = createSolanaAbi(req.abi, this.connection);

    let data: Buffer;
    if (req.data) {
      data = Buffer.from(req.data, "base64");
    } else if (req.publicKey) {
      const info = await this.connection.getAccountInfo(
        new PublicKey(req.publicKey),
        this.commitment,
      );
      if (!info) {
        return { exists: false };
      }
      data = Buffer.from(info.data);
    } else {
      throw new RuntimeError(
        `${fnTag} provide either req.publicKey or req.data`,
      );
    }

    const account = abi.decodeAccount(req.accountName, data) as Record<
      string,
      unknown
    >;
    return { exists: true, account };
  }

  /**
   * Decode Anchor program events from transaction log lines (or from a tx the
   * connector fetches by signature). No keys involved.
   */
  public async decodeEvents(
    req: DecodeEventsV1Request,
  ): Promise<DecodeEventsV1Response> {
    const fnTag = `${this.className}#decodeEvents()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.truthy(req.abi, `${fnTag} req.abi`);

    let logs = req.logs;
    if (!logs && req.signature) {
      const tx = await this.connection.getTransaction(req.signature, {
        commitment: this.finality,
        maxSupportedTransactionVersion: 0,
      });
      logs = tx?.meta?.logMessages ?? [];
    }
    if (!logs) {
      throw new RuntimeError(
        `${fnTag} provide either req.logs or req.signature`,
      );
    }

    const abi = createSolanaAbi(req.abi, this.connection);
    return { events: abi.decodeEvents(logs) };
  }

  // ---------------------------------------------------------------------------
  // Generic RPC + fees
  // ---------------------------------------------------------------------------

  /**
   * Generic JSON-RPC passthrough: forwards an arbitrary Solana RPC method to the
   * node and returns its raw `result`. The escape hatch for any read the typed
   * endpoints don't cover (getProgramAccounts, getSignaturesForAddress, …).
   */
  public async invokeRpc(
    req: InvokeRpcV1Request,
  ): Promise<InvokeRpcV1Response> {
    const fnTag = `${this.className}#invokeRpc()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(req.method, `${fnTag} req.method`);

    const res = await axios.post(
      this.options.rpcApiHttpHost,
      {
        jsonrpc: "2.0",
        id: 1,
        method: req.method,
        params: req.params ?? [],
      },
      // Bound the wait: a generic passthrough must not hang the handler forever
      // if the node is slow or unresponsive.
      { timeout: 60_000 },
    );
    if (res.data?.error) {
      throw new RuntimeError(
        `${fnTag} RPC error for "${req.method}": ${JSON.stringify(res.data.error)}`,
      );
    }
    return { result: res.data?.result };
  }

  /** Estimate the fee (lamports) for a built transaction's message. */
  public async getFeeForTransaction(
    req: GetFeeForTransactionV1Request,
  ): Promise<GetFeeForTransactionV1Response> {
    const fnTag = `${this.className}#getFeeForTransaction()`;
    Checks.truthy(req, `${fnTag} req`);
    Checks.nonBlankString(
      req.serializedTransaction,
      `${fnTag} req.serializedTransaction`,
    );

    const tx = Transaction.from(
      Buffer.from(req.serializedTransaction, "base64"),
    );
    const message = tx.compileMessage();
    const { value } = await this.connection.getFeeForMessage(
      message,
      this.commitment,
    );
    return { lamports: value };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Expose the underlying Connection for advanced use. */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Confirm a transaction signature using the blockhash-based confirmation
   * strategy. The deprecated signature-only form of confirmTransaction relies
   * solely on a websocket signatureSubscribe notification and hangs forever if
   * the transaction confirms before the subscription registers (a common race
   * on a fast localnet). The blockhash strategy also polls block height, which
   * guarantees the call terminates.
   */
  private async confirmSignature(
    signature: string,
  ): Promise<Awaited<ReturnType<Connection["confirmTransaction"]>>> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    return this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      this.commitment,
    );
  }

  /**
   * Resolve a signing credential to a Keypair.
   * Supports: raw base-58 private key or Cacti keychain reference.
   */
  public async resolveKeypair(
    credential: SolanaSigningCredential,
  ): Promise<Keypair> {
    const fnTag = `${this.className}#resolveKeypair()`;

    if (isSolanaSigningCredentialPrivateKeyBase58(credential)) {
      const { privateKeyBase58 } =
        credential as SolanaSigningCredentialPrivateKeyBase58;
      const secretKey = bs58.decode(privateKeyBase58);
      return Keypair.fromSecretKey(secretKey);
    }

    if (isSolanaSigningCredentialCactiKeychainRef(credential)) {
      const { keychainId, keychainEntryKey } =
        credential as SolanaSigningCredentialCactiKeychainRef;
      const keychainPlugin =
        this.pluginRegistry.findOneByKeychainId(keychainId);
      Checks.truthy(
        keychainPlugin,
        `${fnTag} keychain plugin for ID "${keychainId}"`,
      );
      const privateKeyBase58 = await keychainPlugin.get(keychainEntryKey);
      Checks.nonBlankString(
        privateKeyBase58,
        `${fnTag} keychain entry "${keychainEntryKey}"`,
      );
      return Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
    }

    throw new Error(
      `${fnTag} Cannot resolve keypair from credential type: ` +
      `${(credential as SolanaSigningCredential).type}. ` +
      `Supply PRIVATE_KEY_BASE58 or CACTI_KEYCHAIN_REF.`,
    );
  }

  /** Convenience: generate a new random Keypair and return its base-58 encoded secret key. */
  public static generateKeypairBase58(): {
    publicKey: string;
    privateKeyBase58: string;
  } {
    const kp = Keypair.generate();
    return {
      publicKey: kp.publicKey.toBase58(),
      privateKeyBase58: bs58.encode(kp.secretKey),
    };
  }

  /** Convenience: how many lamports per SOL (re-export for callers). */
  public static get LAMPORTS_PER_SOL(): number {
    return LAMPORTS_PER_SOL;
  }
}
