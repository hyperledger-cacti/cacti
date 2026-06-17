/*
 * Verifier integration tests for the Solana ledger connector.
 *
 * Stands up a full cmd-api-server with the Solana connector registered, then
 * drives the connector through the generic Verifier / VerifierFactory
 * abstraction (validator type SOLANA_2X) over HTTP.
 *
 * Runs against a throwaway containerized localnet via SolanaTestLedger (Docker).
 */
import "jest-extended";
import * as fs from "fs";
import * as path from "path";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  IVerifierEventListener,
  LedgerEvent,
} from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  PluginLedgerConnectorSolana,
  SolanaApiClient,
  SolanaSigningCredentialType,
} from "@hyperledger/cacti-plugin-ledger-connector-solana";
import type {
  WatchBlocksV1Progress,
  WatchLogsV1Progress,
} from "@hyperledger/cacti-plugin-ledger-connector-solana";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { Verifier, VerifierFactory } from "@hyperledger/cactus-verifier-client";

import {
  startTestValidator,
  stopTestValidator,
  airdropSol,
} from "../solana-test-validator";

const testLogLevel = "info";
const sutLogLevel = "warn";

const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier-integration-with-solana-connector.test",
  level: testLogLevel,
});

// A "send" to a brand-new account must transfer at least the rent-exempt
// minimum (~890,880 lamports for a 0-data account) or the runtime rejects it.
const RENT_EXEMPT_SAFE = 2_000_000;

// Committed test-program binary, used to exercise deployProgram through the
// Verifier. Deploy only needs the bytes (deployed under a fresh keypair); the
// invoke path is covered by verifier-anchor.test.ts.
const PROGRAM_SO = path.join(
  process.env.CACTI_TEST_PROGRAM_DIR ??
    path.resolve(
      process.cwd(),
      "packages/cacti-plugin-ledger-connector-solana/src/test/resources/cacti-test-program",
    ),
  "cacti_test_program.so",
);
const SO_PRESENT = fs.existsSync(PROGRAM_SO);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SendSyncResult<T> {
  readonly status: number;
  readonly data: T;
}

describe("Verifier integration with Solana connector tests", () => {
  let apiServer: ApiServer;
  let connector: PluginLedgerConnectorSolana;
  let keychainPlugin: PluginKeychainMemory;
  let globalVerifierFactory: VerifierFactory;

  const solanaValidatorId = "testSolanaId";
  const keychainEntryKey = "alice-solana-privkey";
  const keychainId = uuidv4();

  const { publicKey: alicePub, privateKeyBase58: alicePriv } =
    PluginLedgerConnectorSolana.generateKeypairBase58();

  beforeAll(async () => {
    log.info("Starting containerized Solana localnet (SolanaTestLedger)...");
    const rpcUrl = await startTestValidator();

    // Keychain holding Alice's key for the CACTI_KEYCHAIN_REF credential test.
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      backend: new Map([[keychainEntryKey, alicePriv]]),
      logLevel: sutLogLevel,
    });

    log.info("Create PluginLedgerConnectorSolana...");
    connector = new PluginLedgerConnectorSolana({
      instanceId: uuidv4(),
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      logLevel: sutLogLevel,
    });

    const plugins: ICactusPlugin[] = [keychainPlugin, connector];
    const pluginRegistry = new PluginRegistry({ plugins });

    log.info("Create and start ApiServer...");
    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiTlsEnabled = false;
    apiServerOptions.apiPort = 0;
    apiServerOptions.crpcPort = 0;
    apiServerOptions.grpcPort = 0;
    const config =
      await configService.newExampleConfigConvict(apiServerOptions);

    apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });
    await apiServer.start();

    const httpServer = apiServer.getHttpServerApi();
    const addressInfo = httpServer?.address() as AddressInfo;
    const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;
    log.info(`ApiServer listening at ${apiHost}`);

    log.info("Create VerifierFactory with Solana validator...");
    globalVerifierFactory = new VerifierFactory(
      [
        {
          validatorID: solanaValidatorId,
          validatorType: "SOLANA_2X",
          basePath: apiHost,
          logLevel: sutLogLevel,
        },
      ],
      sutLogLevel,
    );

    // Fund Alice so she can pay for transfers / rent.
    await airdropSol(connector.getConnection(), alicePub, 5);
  }, 300_000);

  afterAll(async () => {
    log.info("Shutdown the API server...");
    if (apiServer) {
      await apiServer.shutdown();
    }
    await stopTestValidator();
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test("Verifier of SolanaApiClient is created by VerifierFactory", async () => {
    const sut = await globalVerifierFactory.getVerifier(solanaValidatorId);
    expect(sut.ledgerApi.className).toEqual("SolanaApiClient");
  });

  test("getBalance via Verifier.sendSyncRequest returns funded balance", async () => {
    const verifier: Verifier<SolanaApiClient> =
      await globalVerifierFactory.getVerifier(solanaValidatorId, "SOLANA_2X");

    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" },
      { args: { publicKey: alicePub } },
    )) as SendSyncResult<{ lamports: number }>;

    expect(result.status).toEqual(200);
    expect(result.data.lamports).toEqual(5 * LAMPORTS_PER_SOL);
  });

  test("getAccountInfo via Verifier.sendSyncRequest returns account details", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);

    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getAccountInfo" },
      { args: { publicKey: alicePub } },
    )) as SendSyncResult<{ exists: boolean; lamports: number }>;

    expect(result.status).toEqual(200);
    expect(result.data.exists).toBeTrue();
    expect(result.data.lamports).toBeGreaterThan(0);
  });

  test("requestAirdrop via Verifier.sendSyncRequest funds a fresh account", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const { publicKey: carol } =
      PluginLedgerConnectorSolana.generateKeypairBase58();

    const airdropResult = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "requestAirdrop" },
      { args: { publicKey: carol, lamports: LAMPORTS_PER_SOL } },
    )) as SendSyncResult<{ signature: string }>;
    expect(airdropResult.status).toEqual(200);
    expect(typeof airdropResult.data.signature).toEqual("string");

    const balanceResult = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" },
      { args: { publicKey: carol } },
    )) as SendSyncResult<{ lamports: number }>;
    expect(balanceResult.data.lamports).toEqual(LAMPORTS_PER_SOL);
  });

  test("transferSol via Verifier.sendSyncRequest (PRIVATE_KEY_BASE58) moves lamports", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const { publicKey: dest } =
      PluginLedgerConnectorSolana.generateKeypairBase58();

    const transferResult = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "transferSol" },
      {
        args: {
          signingCredential: {
            type: SolanaSigningCredentialType.PrivateKeyBase58,
            privateKeyBase58: alicePriv,
          },
          recipientPublicKey: dest,
          lamports: RENT_EXEMPT_SAFE,
        },
      },
    )) as SendSyncResult<{ signature: string }>;
    expect(transferResult.status).toEqual(200);
    expect(typeof transferResult.data.signature).toEqual("string");

    const destBalance = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" },
      { args: { publicKey: dest } },
    )) as SendSyncResult<{ lamports: number }>;
    expect(destBalance.data.lamports).toEqual(RENT_EXEMPT_SAFE);
  });

  test("transferSol via Verifier.sendSyncRequest (CACTI_KEYCHAIN_REF) moves lamports", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const { publicKey: dest } =
      PluginLedgerConnectorSolana.generateKeypairBase58();

    const transferResult = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "transferSol" },
      {
        args: {
          signingCredential: {
            type: SolanaSigningCredentialType.CactiKeychainRef,
            keychainId,
            keychainEntryKey,
          },
          recipientPublicKey: dest,
          lamports: RENT_EXEMPT_SAFE,
        },
      },
    )) as SendSyncResult<{ signature: string }>;
    expect(transferResult.status).toEqual(200);

    const destBalance = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" },
      { args: { publicKey: dest } },
    )) as SendSyncResult<{ lamports: number }>;
    expect(destBalance.data.lamports).toEqual(RENT_EXEMPT_SAFE);
  });

  test("sendTransaction via Verifier.sendSyncRequest submits a raw transfer", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const conn: Connection = connector.getConnection();

    const senderKp = Keypair.fromSecretKey(bs58.decode(alicePriv));
    const recipientKp = Keypair.generate();
    const lamports = RENT_EXEMPT_SAFE;

    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKp.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderKp.publicKey,
        toPubkey: recipientKp.publicKey,
        lamports,
      }),
    );
    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    const sendResult = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "sendTransaction" },
      {
        args: {
          serializedTransaction: serialized,
          signingCredential: {
            type: SolanaSigningCredentialType.PrivateKeyBase58,
            privateKeyBase58: alicePriv,
          },
        },
      },
    )) as SendSyncResult<{ signature: string }>;
    expect(sendResult.status).toEqual(200);
    expect(typeof sendResult.data.signature).toEqual("string");

    const recipientBalance = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" },
      { args: { publicKey: recipientKp.publicKey.toBase58() } },
    )) as SendSyncResult<{ lamports: number }>;
    expect(recipientBalance.data.lamports).toEqual(lamports);
  });

  test("sendAsyncRequest transfers SOL (fire-and-forget) and is observable via getBalance", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const { publicKey: dest } =
      PluginLedgerConnectorSolana.generateKeypairBase58();

    verifier.sendAsyncRequest(
      {},
      { type: "solanaApi", command: "transferSol" },
      {
        args: {
          signingCredential: {
            type: SolanaSigningCredentialType.PrivateKeyBase58,
            privateKeyBase58: alicePriv,
          },
          recipientPublicKey: dest,
          lamports: RENT_EXEMPT_SAFE,
        },
      },
    );

    // Poll until the async transfer lands (sendAsyncRequest does not await).
    let lamports = 0;
    for (let i = 0; i < 30 && lamports === 0; i++) {
      const balanceResult = (await verifier.sendSyncRequest(
        {},
        { type: "solanaApi", command: "getBalance" },
        { args: { publicKey: dest } },
      )) as SendSyncResult<{ lamports: number }>;
      lamports = balanceResult.data.lamports;
      if (lamports === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    expect(lamports).toEqual(RENT_EXEMPT_SAFE);
  });

  test("Invalid publicKey is rejected by SolanaApiClient (REST 500)", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);

    await expect(
      verifier.sendSyncRequest(
        {},
        { type: "solanaApi", command: "getBalance" },
        { args: { publicKey: "not-a-valid-key" } },
      ),
    ).rejects.toThrow();
  });

  test("Unknown Solana command is rejected by SolanaApiClient", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);

    await expect(
      verifier.sendSyncRequest(
        {},
        { type: "solanaApi", command: "thisCommandDoesNotExist" } as never,
        {},
      ),
    ).rejects.toThrow();
  });

  test("invokeRpc via Verifier.sendSyncRequest forwards getSlot", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "invokeRpc" },
      { args: { method: "getSlot" } },
    )) as SendSyncResult<{ result: number }>;
    expect(result.status).toEqual(200);
    expect(typeof result.data.result).toEqual("number");
  });

  test("getFeeForTransaction via Verifier.sendSyncRequest returns a fee", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const conn = connector.getConnection();
    const payer = Keypair.generate().publicKey;
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1000,
      }),
    );
    const serializedTransaction = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");

    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getFeeForTransaction" },
      { args: { serializedTransaction } },
    )) as SendSyncResult<{ lamports: number }>;
    expect(result.status).toEqual(200);
    expect(typeof result.data.lamports).toEqual("number");
  });

  test("Verifier.startMonitor streams new slots and stopMonitor stops it", async () => {
    const verifier: Verifier<SolanaApiClient> =
      await globalVerifierFactory.getVerifier(solanaValidatorId, "SOLANA_2X");
    const appId = "solana-slot-monitor";

    const event = await new Promise<LedgerEvent<WatchBlocksV1Progress>>(
      (resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("no slot event within 20s")),
          20_000,
        );
        const listener: IVerifierEventListener<WatchBlocksV1Progress> = {
          onEvent(ledgerEvent) {
            clearTimeout(timer);
            verifier.stopMonitor(appId);
            resolve(ledgerEvent);
          },
          onError(err) {
            clearTimeout(timer);
            reject(err);
          },
        };
        verifier.startMonitor(appId, {}, listener);
      },
    );

    expect(event.data).toBeTruthy();
    expect(typeof event.data?.slot).toEqual("number");
  }, 30_000);

  test("getTransaction via Verifier.sendSyncRequest returns tx metadata", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const { publicKey: dest } =
      PluginLedgerConnectorSolana.generateKeypairBase58();

    const transfer = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "transferSol" },
      {
        args: {
          signingCredential: {
            type: SolanaSigningCredentialType.PrivateKeyBase58,
            privateKeyBase58: alicePriv,
          },
          recipientPublicKey: dest,
          lamports: RENT_EXEMPT_SAFE,
        },
      },
    )) as SendSyncResult<{ signature: string }>;
    expect(transfer.status).toEqual(200);

    // getTransaction can briefly lag the confirmation; retry a few times.
    let txResult:
      | SendSyncResult<{
          signature: string;
          slot: number;
          logMessages?: string[];
        }>
      | undefined;
    for (let i = 0; i < 10 && !txResult; i++) {
      try {
        txResult = (await verifier.sendSyncRequest(
          {},
          { type: "solanaApi", command: "getTransaction" },
          { args: { signature: transfer.data.signature } },
        )) as SendSyncResult<{
          signature: string;
          slot: number;
          logMessages?: string[];
        }>;
      } catch {
        await sleep(1000);
      }
    }
    expect(txResult).toBeDefined();
    expect(txResult!.status).toEqual(200);
    expect(txResult!.data.signature).toEqual(transfer.data.signature);
    expect(typeof txResult!.data.slot).toEqual("number");
  }, 30_000);

  test("getPrometheusMetrics via Verifier.sendSyncRequest returns metrics text", async () => {
    const verifier = await globalVerifierFactory.getVerifier(solanaValidatorId);
    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "getPrometheusMetrics" },
      {},
    )) as SendSyncResult<string>;

    expect(result.status).toEqual(200);
    expect(typeof result.data).toEqual("string");
    expect(result.data).toContain("cacti_solana_total_tx_count");
  });

  const deployTest = SO_PRESENT ? test : test.skip;
  deployTest(
    "deployProgram via Verifier deploys a program",
    async () => {
      const verifier =
        await globalVerifierFactory.getVerifier(solanaValidatorId);

      // Dedicated funded deployer so this does not perturb Alice's balance.
      const deployer = PluginLedgerConnectorSolana.generateKeypairBase58();
      await airdropSol(connector.getConnection(), deployer.publicKey, 5);
      const programBinaryBase64 = fs
        .readFileSync(PROGRAM_SO)
        .toString("base64");

      const result = (await verifier.sendSyncRequest(
        {},
        { type: "solanaApi", command: "deployProgram" },
        {
          args: {
            programBinaryBase64,
            payerSigningCredential: {
              type: SolanaSigningCredentialType.PrivateKeyBase58,
              privateKeyBase58: deployer.privateKeyBase58,
            },
          },
        },
      )) as SendSyncResult<{ programId: string; deploySignatures: string[] }>;

      expect(result.status).toEqual(200);
      expect(typeof result.data.programId).toEqual("string");
      expect(result.data.deploySignatures.length).toBeGreaterThanOrEqual(2);

      // The deployed program account exists on-chain (queried via the client).
      const info = (await verifier.sendSyncRequest(
        {},
        { type: "solanaApi", command: "getAccountInfo" },
        { args: { publicKey: result.data.programId } },
      )) as SendSyncResult<{ exists: boolean; executable?: boolean }>;
      expect(info.data.exists).toBeTrue();
    },
    120_000,
  );

  test("watchLogsV1 streams logs over the cmd-api-server socket", async () => {
    const verifier: Verifier<SolanaApiClient> =
      await globalVerifierFactory.getVerifier(solanaValidatorId, "SOLANA_2X");
    const apiClient = verifier.ledgerApi;

    let trigger: ReturnType<typeof setInterval>;
    const progress = await new Promise<WatchLogsV1Progress>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          clearInterval(trigger);
          reject(new Error("no log event within 25s"));
        }, 25_000);

        const sub = apiClient.watchLogsV1().subscribe({
          next: (p) => {
            clearTimeout(timer);
            clearInterval(trigger);
            sub.unsubscribe();
            resolve(p);
          },
          error: (err) => {
            clearTimeout(timer);
            clearInterval(trigger);
            reject(err);
          },
        });

        // Drive transfers until a log event arrives.
        trigger = setInterval(() => {
          const { publicKey: dest } =
            PluginLedgerConnectorSolana.generateKeypairBase58();
          verifier.sendAsyncRequest(
            {},
            { type: "solanaApi", command: "transferSol" },
            {
              args: {
                signingCredential: {
                  type: SolanaSigningCredentialType.PrivateKeyBase58,
                  privateKeyBase58: alicePriv,
                },
                recipientPublicKey: dest,
                lamports: RENT_EXEMPT_SAFE,
              },
            },
          );
        }, 1500);
      },
    );

    expect(typeof progress.signature).toEqual("string");
    expect(Array.isArray(progress.logs)).toBeTrue();
  }, 35_000);
});
