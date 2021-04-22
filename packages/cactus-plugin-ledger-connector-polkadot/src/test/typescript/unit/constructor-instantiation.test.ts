import { PrometheusExporter } from "../../../main/typescript/prometheus-exporter/prometheus-exporter";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SubstrateTestLedger } from "../../../../../cactus-test-tooling/src/main/typescript/substrate-test-ledger/substrate-test-ledger";

import test, { Test } from "tape-promise/tape";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";

import {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
} from "../../../main/typescript";

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
  await plugin.getOrCreateWebServices();

  t.end();
});
