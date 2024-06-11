import { PrometheusExporter } from "../../../main/typescript/prometheus-exporter/prometheus-exporter";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SubstrateTestLedger } from "../../../../../cactus-test-tooling/src/main/typescript/substrate-test-ledger/substrate-test-ledger";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  PluginFactoryLedgerConnector,
} from "../../../main/typescript";
import { PluginRegistry } from "@hyperledger/cactus-core";
import "jest-extended";
import { PluginImportType } from "@hyperledger/cactus-core-api";

const testCase = "Instantiate plugin";
const logLevel: LogLevelDesc = "TRACE";
const DEFAULT_WSPROVIDER = "ws://127.0.0.1:9944";
const instanceId = "test-polkadot-connector";
const prometheus: PrometheusExporter = new PrometheusExporter({
  pollingIntervalInMin: 1,
});

describe(testCase, () => {
  let plugin: PluginLedgerConnectorPolkadot;
  const connectorOptions: IPluginLedgerConnectorPolkadotOptions = {
    logLevel: logLevel,
    prometheusExporter: prometheus,
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    wsProviderUrl: DEFAULT_WSPROVIDER,
    instanceId: instanceId,
  };
  const ledgerOptions = {
    publishAllPorts: false,
    logLevel: logLevel,
    emitContainerLogs: true,
  };
  const ledger = new SubstrateTestLedger(ledgerOptions);
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).toResolve();
  });
  afterAll(async () => {
    await ledger.stop();
    await plugin.shutdownConnectionToSubstrate();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
  test(testCase, async () => {
    await ledger.start();
    expect(ledger).toBeTruthy();
    plugin = await factory.create(connectorOptions);
    await plugin.onPluginInit();
    await plugin.getOrCreateWebServices();
  });
});
