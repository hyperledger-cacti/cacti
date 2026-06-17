/*
 * Verifier integration test for the Anchor ABI layer.
 *
 * Stands up a cmd-api-server hosting the Solana connector, then drives the
 * connector's self-contained `cacti-test-program` through the generic Verifier
 * abstraction (validator type SOLANA_2X) using the ABI-aware operations:
 *   - invokeInstruction (server-side signing)
 *   - buildInstruction + sendTransaction(NONE)  (client-side / local signing)
 *   - decodeAccount
 *   - decodeEvents
 *
 * The program artifacts are the connector's committed test resources — no
 * dependency on any external application program. Runs on its own throwaway
 * `solana-test-validator` container (SolanaTestLedger), deploying the program at
 * runtime.
 */
import "jest-extended";
import * as fs from "fs";
import * as path from "path";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ICactusPlugin } from "@hyperledger/cactus-core-api";
import { SolanaTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  PluginLedgerConnectorSolana,
  SolanaApiClient,
  SolanaAbiKind,
  SolanaSigningCredentialType,
} from "@hyperledger/cacti-plugin-ledger-connector-solana";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { Verifier, VerifierFactory } from "@hyperledger/cactus-verifier-client";

const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier-anchor.test",
  level: "warn",
});

const RESOURCES =
  process.env.CACTI_TEST_PROGRAM_DIR ??
  path.resolve(
    process.cwd(),
    "packages/cacti-plugin-ledger-connector-solana/src/test/resources/cacti-test-program",
  );
const PROGRAM_SO = path.join(RESOURCES, "cacti_test_program.so");
const PROGRAM_KEYPAIR = path.join(RESOURCES, "cacti_test_program-keypair.json");
const IDL_PATH = path.join(RESOURCES, "cacti_test_program.json");

const ARTIFACTS_PRESENT =
  fs.existsSync(PROGRAM_SO) &&
  fs.existsSync(PROGRAM_KEYPAIR) &&
  fs.existsSync(IDL_PATH);

if (!ARTIFACTS_PRESENT) {
  // eslint-disable-next-line no-console
  console.warn(
    `[verifier-anchor] SKIPPING: test program artifacts not found under ${RESOURCES}`,
  );
}

interface SendSyncResult<T> {
  readonly status: number;
  readonly data: T;
}

const describeFn = ARTIFACTS_PRESENT ? describe : describe.skip;

describeFn("Verifier integration with Solana connector – Anchor ABI", () => {
  let ledger: SolanaTestLedger;
  let apiServer: ApiServer;
  let connector: PluginLedgerConnectorSolana;
  let verifierFactory: VerifierFactory;

  const solanaValidatorId = "testSolanaAnchorId";
  const admin = Keypair.generate();
  const adminPriv = bs58.encode(admin.secretKey);

  let idl: Record<string, unknown>;
  let programId: PublicKey;
  let abiSpec: { kind: SolanaAbiKind; idl: Record<string, unknown> };

  const counterPda = () =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), admin.publicKey.toBuffer()],
      programId,
    )[0];

  beforeAll(async () => {
    idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
    programId = new PublicKey((idl as { address: string }).address);
    abiSpec = { kind: SolanaAbiKind.Anchor, idl };

    ledger = new SolanaTestLedger({
      logLevel: "warn",
      emitContainerLogs: false,
    });
    await ledger.start();
    const rpcUrl = await ledger.getRpcApiHttpHost();

    connector = new PluginLedgerConnectorSolana({
      instanceId: uuidv4(),
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "warn",
    });

    const plugins: ICactusPlugin[] = [connector];
    const pluginRegistry = new PluginRegistry({ plugins });

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
    const addr = httpServer?.address() as AddressInfo;
    const apiHost = `http://${addr.address}:${addr.port}`;
    log.info(`ApiServer at ${apiHost}`);

    verifierFactory = new VerifierFactory(
      [
        {
          validatorID: solanaValidatorId,
          validatorType: "SOLANA_2X",
          basePath: apiHost,
          logLevel: "warn",
        },
      ],
      "warn",
    );

    await connector.requestAirdrop({
      publicKey: admin.publicKey.toBase58(),
      lamports: 10 * LAMPORTS_PER_SOL,
    });

    // The container runs a bare validator (no --bpf-program preload), so deploy
    // the test program at runtime under its own keypair — fixing the program id
    // to the IDL's declare_id! so Anchor's self-id check passes.
    const programKeypairBase58 = bs58.encode(
      Uint8Array.from(JSON.parse(fs.readFileSync(PROGRAM_KEYPAIR, "utf8"))),
    );
    await connector.deployProgram({
      programBinaryBase64: fs.readFileSync(PROGRAM_SO).toString("base64"),
      programKeypairBase58,
      payerSigningCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
    });
  }, 300_000);

  afterAll(async () => {
    if (apiServer) await apiServer.shutdown();
    if (connector) await connector.shutdown();
    if (ledger) {
      await ledger.stop();
      await ledger.destroy();
    }
  });

  test("invokeInstruction(initialize) via Verifier.sendSyncRequest", async () => {
    const verifier: Verifier<SolanaApiClient> =
      await verifierFactory.getVerifier(solanaValidatorId, "SOLANA_2X");

    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "invokeInstruction" },
      {
        args: {
          abi: abiSpec,
          invocation: {
            instruction: "initialize",
            args: ["100", admin.publicKey.toBase58()],
            accounts: {
              authority: admin.publicKey.toBase58(),
              counter: counterPda().toBase58(),
              systemProgram: SystemProgram.programId.toBase58(),
            },
          },
          signingCredential: {
            type: SolanaSigningCredentialType.PrivateKeyBase58,
            privateKeyBase58: adminPriv,
          },
        },
      },
    )) as SendSyncResult<{ signature: string }>;

    expect(result.status).toEqual(200);
    expect(typeof result.data.signature).toEqual("string");
  });

  test("decodeAccount(counter) via Verifier returns the decoded Counter", async () => {
    const verifier = await verifierFactory.getVerifier(solanaValidatorId);
    const result = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "decodeAccount" },
      {
        args: {
          abi: abiSpec,
          accountName: "counter",
          publicKey: counterPda().toBase58(),
        },
      },
    )) as SendSyncResult<{
      exists: boolean;
      account: { authority: string; value: string };
    }>;

    expect(result.status).toEqual(200);
    expect(result.data.exists).toBeTrue();
    expect(
      new PublicKey(result.data.account.authority).equals(admin.publicKey),
    ).toBe(true);
  });

  test("buildInstruction(increment) via Verifier + local sign + sendTransaction(NONE)", async () => {
    const verifier = await verifierFactory.getVerifier(solanaValidatorId);

    const built = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "buildInstruction" },
      {
        args: {
          abi: abiSpec,
          feePayer: admin.publicKey.toBase58(),
          invocation: {
            instruction: "increment",
            args: ["9"],
            accounts: {
              authority: admin.publicKey.toBase58(),
              counter: counterPda().toBase58(),
            },
          },
        },
      },
    )) as SendSyncResult<{ serializedTransaction: string }>;
    expect(built.status).toEqual(200);

    const tx = Transaction.from(
      Buffer.from(built.data.serializedTransaction, "base64"),
    );
    tx.sign(admin);
    const sent = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "sendTransaction" },
      {
        args: {
          serializedTransaction: tx.serialize().toString("base64"),
          signingCredential: { type: SolanaSigningCredentialType.None },
        },
      },
    )) as SendSyncResult<{ signature: string }>;
    expect(sent.status).toEqual(200);
    expect(typeof sent.data.signature).toEqual("string");
  });

  test("decodeEvents via Verifier decodes Incremented from a tx", async () => {
    const verifier = await verifierFactory.getVerifier(solanaValidatorId);

    const invoked = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "invokeInstruction" },
      {
        args: {
          abi: abiSpec,
          invocation: {
            instruction: "increment",
            args: ["4"],
            accounts: {
              authority: admin.publicKey.toBase58(),
              counter: counterPda().toBase58(),
            },
          },
          signingCredential: {
            type: SolanaSigningCredentialType.PrivateKeyBase58,
            privateKeyBase58: adminPriv,
          },
        },
      },
    )) as SendSyncResult<{ signature: string }>;
    expect(invoked.status).toEqual(200);

    const decoded = (await verifier.sendSyncRequest(
      {},
      { type: "solanaApi", command: "decodeEvents" },
      { args: { abi: abiSpec, signature: invoked.data.signature } },
    )) as SendSyncResult<{
      events: Array<{ name: string; data: { amount: string } }>;
    }>;
    expect(decoded.status).toEqual(200);
    expect(decoded.data.events.some((e) => /incremented/i.test(e.name))).toBe(
      true,
    );
  });
});
