import { PrometheusExporter } from "../../../main/typescript/prometheus-exporter/prometheus-exporter";
import { AddressInfo } from "net";

import type { SignerOptions } from "@polkadot/api/submittable/types";
import type {
  CodecHash,
  ExtrinsicEra,
  Index,
} from "@polkadot/types/interfaces";
import { createTestKeyring } from "@polkadot/keyring/testing";
import { Configuration } from "@hyperledger/cactus-core-api";
//import { ApiPromise, Keyring } from "@polkadot/api";

import http from "http";
import express from "express";
import test, { Test } from "tape-promise/tape";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { SubstrateTestLedger } from "../../../../../cactus-test-tooling/src/main/typescript/substrate-test-ledger/substrate-test-ledger";

import {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  TransactionInfoRequest,
  TransactionInfoResponse,
  RunTransactionRequest,
  DefaultApi as PolkadotApi,
} from "../../../main/typescript/public-api";

const testCase = "Instantiate plugin";
const logLevel: LogLevelDesc = "TRACE";
const pluginRegistry = undefined;
const DEFAULT_WSPROVIDER = "ws://127.0.0.1:9944";
const instanceId = "test-polkadot-connector";
const prometheus: PrometheusExporter = new PrometheusExporter({
  pollingIntervalInMin: 1,
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const connectorOptions: IPluginLedgerConnectorPolkadotOptions = {
    logLevel: logLevel,
    prometheusExporter: prometheus,
    pluginRegistry: pluginRegistry,
    wsProviderUrl: DEFAULT_WSPROVIDER,
    instanceId: instanceId,
  };

  const ledgerOptions = {
    publishAllPorts: false,
    logLevel: logLevel,
    emitContainerLogs: true,
    envVars: new Map([
      ["WORKING_DIR", "/var/www/node-template"],
      ["CONTAINER_NAME", "contracts-node-template-cactus"],
      ["PORT", "9944"],
      ["DOCKER_PORT", "9944"],
      ["CARGO_HOME", "/var/www/node-template/.cargo"],
    ]),
  };

  const tearDown = async () => {
    await ledger.stop();
    await plugin.shutdownConnectionToSubstrate();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  const ledger = new SubstrateTestLedger(ledgerOptions);
  await ledger.start();
  t.ok(ledger);

  const plugin = new PluginLedgerConnectorPolkadot(connectorOptions);
  await plugin.createAPI();

  const keyring = createTestKeyring();
  const CHARLIE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
  const EVE = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
  const charlieAccountAddress = keyring.getPair(CHARLIE);

  const expressApp = express();

  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: false }));

  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));

  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new PolkadotApi(apiConfig);

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  const infoForSigningTransaction = await apiClient.getTransactionInfo({
    accountAddress: charlieAccountAddress,
    transactionExpiration: 50,
  } as TransactionInfoRequest);
  t.equal(infoForSigningTransaction.status, 200);
  const response: TransactionInfoResponse = infoForSigningTransaction.data;
  t.ok(response);
  const nonce = response.responseContainer.response_data.nonce as Index;
  t.ok(nonce);
  const blockHash = response.responseContainer.response_data
    .blockHash as CodecHash;
  t.ok(blockHash);
  const era = response.responseContainer.response_data.era as ExtrinsicEra;
  t.ok(era);

  const signingOptions: SignerOptions = {
    nonce: nonce,
    blockHash: blockHash,
    era: era,
  };

  const transaction = plugin.api?.tx["balances"]["transfer"](EVE, 1);
  const signedTransaction = await transaction?.signAsync(
    charlieAccountAddress,
    signingOptions,
  );
  t.comment(`Signed transaction is: ${signedTransaction}`);

  t.ok(signedTransaction);
  const signature = signedTransaction?.signature.toHex();

  if (signature) {
    t.assert(plugin.isHex(signature));
  }

  const result = await plugin.transact({
    transferSubmittable: signedTransaction,
  } as RunTransactionRequest);

  t.ok(result);
  t.ok(result.success);
  t.ok(result.hash);
});
