import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import {
  PluginLedgerConnectorSolana,
  SolanaSigningCredentialType,
  SolanaAbiKind,
  PluginFactoryLedgerConnector,
  PrometheusExporter,
  createPluginFactory,
} from "../../../main/typescript/public-api";

import testProgramIdl from "../../resources/cacti-test-program/cacti_test_program.json";

describe("PluginLedgerConnectorSolana – API surface", () => {
  const RPC = "http://127.0.0.1:8899";
  let connector: PluginLedgerConnectorSolana;

  beforeAll(() => {
    connector = new PluginLedgerConnectorSolana({
      instanceId: "test-instance-id",
      rpcApiHttpHost: RPC,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "silent",
    });
  });

  test("class name is stable", () => {
    expect(PluginLedgerConnectorSolana.CLASS_NAME).toBe(
      "PluginLedgerConnectorSolana",
    );
  });

  test("getInstanceId returns the supplied ID", () => {
    expect(connector.getInstanceId()).toBe("test-instance-id");
  });

  test("getPackageName returns the npm package name", () => {
    expect(connector.getPackageName()).toBe(
      "@hyperledger/cacti-plugin-ledger-connector-solana",
    );
  });

  test("getConsensusAlgorithmFamily resolves to Stake", async () => {
    const family = await connector.getConsensusAlgorithmFamily();
    expect(family).toBeTruthy();
  });

  test("hasTransactionFinality resolves to a boolean", async () => {
    const fin = await connector.hasTransactionFinality();
    expect(typeof fin).toBe("boolean");
  });

  test("getOpenApiSpec returns an object with paths", () => {
    const spec = connector.getOpenApiSpec() as { paths: unknown };
    expect(spec).toBeTruthy();
    expect(spec.paths).toBeTruthy();
  });

  test("getOrCreateWebServices returns 14 endpoints", async () => {
    const endpoints = await connector.getOrCreateWebServices();
    expect(endpoints).toHaveLength(14);
    // Calling again must return the same array (cached).
    const again = await connector.getOrCreateWebServices();
    expect(again).toBe(endpoints);
  });

  test("generateKeypairBase58 produces a valid public/private key pair", () => {
    const { publicKey, privateKeyBase58 } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    expect(typeof publicKey).toBe("string");
    expect(publicKey.length).toBeGreaterThanOrEqual(32);
    expect(typeof privateKeyBase58).toBe("string");
    expect(privateKeyBase58.length).toBeGreaterThan(0);
  });

  test("LAMPORTS_PER_SOL is 1_000_000_000", () => {
    expect(PluginLedgerConnectorSolana.LAMPORTS_PER_SOL).toBe(1_000_000_000);
  });

  test("SolanaSigningCredentialType enum values are stable", () => {
    expect(SolanaSigningCredentialType.PrivateKeyBase58).toBe(
      "PRIVATE_KEY_BASE58",
    );
    expect(SolanaSigningCredentialType.CactiKeychainRef).toBe(
      "CACTI_KEYCHAIN_REF",
    );
    expect(SolanaSigningCredentialType.None).toBe("NONE");
  });

  test("PluginFactoryLedgerConnector.create returns a connector instance", async () => {
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });
    const c = await factory.create({
      instanceId: "factory-test",
      rpcApiHttpHost: RPC,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "silent",
    });
    expect(c).toBeInstanceOf(PluginLedgerConnectorSolana);
  });

  test("onPluginInit resolves without throwing", async () => {
    await expect(connector.onPluginInit()).resolves.not.toThrow();
  });

  test("shutdown resolves without throwing", async () => {
    await expect(connector.shutdown()).resolves.not.toThrow();
  });
});

describe("PluginLedgerConnectorSolana – offline branches (no validator)", () => {
  const RPC = "http://127.0.0.1:8899";
  const abi = {
    kind: SolanaAbiKind.Anchor,
    idl: testProgramIdl as Record<string, unknown>,
  };

  const newConnector = (
    extra: Partial<
      ConstructorParameters<typeof PluginLedgerConnectorSolana>[0]
    > = {},
  ): PluginLedgerConnectorSolana =>
    new PluginLedgerConnectorSolana({
      instanceId: "offline-instance",
      rpcApiHttpHost: RPC,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "silent",
      ...extra,
    });

  test("createPluginFactory returns a PluginFactoryLedgerConnector", async () => {
    const factory = await createPluginFactory({
      pluginImportType: PluginImportType.Local,
    });
    expect(factory).toBeInstanceOf(PluginFactoryLedgerConnector);
  });

  test("constructor honors a custom commitment and prometheusExporter", () => {
    const exporter = new PrometheusExporter({ pollingIntervalInMin: 1 });
    const connector = newConnector({
      commitment: "finalized",
      prometheusExporter: exporter,
    });
    expect(connector.getConnection().commitment).toBe("finalized");
    expect(connector.getPrometheusExporter()).toBe(exporter);
  });

  test("resolveKeypair rejects an unsupported credential type", async () => {
    const connector = newConnector();
    await expect(
      connector.resolveKeypair({ type: "NOT_A_REAL_TYPE" } as never),
    ).rejects.toThrow(/Cannot resolve keypair from credential type/);
  });

  test("decodeAccount throws when neither publicKey nor data is supplied", async () => {
    const connector = newConnector();
    await expect(
      connector.decodeAccount({ abi, accountName: "counter" }),
    ).rejects.toThrow(/provide either/);
  });

  test("decodeEvents throws when neither logs nor signature is supplied", async () => {
    const connector = newConnector();
    await expect(connector.decodeEvents({ abi })).rejects.toThrow(
      /provide either/,
    );
  });

  test("deployContract delegates to deployProgram", async () => {
    const connector = newConnector();
    const spy = jest
      .spyOn(connector, "deployProgram")
      .mockResolvedValue({ programId: "X", deploySignatures: [] } as never);
    const req = {
      programBinaryBase64: "AA==",
      payerSigningCredential: { type: SolanaSigningCredentialType.None },
    } as never;
    await connector.deployContract(req);
    expect(spy).toHaveBeenCalledWith(req);
  });

  test("transact delegates to sendTransaction", async () => {
    const connector = newConnector();
    const spy = jest
      .spyOn(connector, "sendTransaction")
      .mockResolvedValue({ signature: "sig" } as never);
    const req = {
      serializedTransaction: "AA==",
      signingCredential: { type: SolanaSigningCredentialType.None },
    } as never;
    await connector.transact(req);
    expect(spy).toHaveBeenCalledWith(req);
  });
});
