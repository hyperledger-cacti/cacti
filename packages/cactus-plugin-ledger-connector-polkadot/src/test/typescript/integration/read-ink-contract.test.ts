/*
import { PrometheusExporter } from "../../../main/typescript/prometheus-exporter/prometheus-exporter";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import { SubstrateTestLedger } from "../../../../../cactus-test-tooling/src/main/typescript/substrate-test-ledger/substrate-test-ledger";
import {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  DefaultApi as PolkadotApi,
  DeployContractInkBytecodeRequest,
  TransactionInfoRequest,
  TransactionInfoResponse,
  WriteStorageRequest,
  ReadStorageRequest,
} from "../../../main/typescript/public-api";

import { createTestKeyring } from "@polkadot/keyring/testing";
import type { SignerOptions } from "@polkadot/api/submittable/types";
import { ContractPromise } from "@polkadot/api-contract";
import type {
  CodecHash,
  ExtrinsicEra,
  Index,
} from "@polkadot/types/interfaces";

import { AddressInfo } from "net";
import http from "http";
import express from "express";

// TODO automatically generate smart contract assets
// import * as abi from "../../rust/fixtures/ink!/publicBulletin/target/ink/metadata.json";
import * as fs from "fs";

import test, { Test } from "tape-promise/tape";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";

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


test.skip(testCase, async (t: Test) => {
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
  if (plugin.api) {
    const keyring = createTestKeyring();
    const CONTRACT_ADDR = "5CwXEMtqyWBNwwPyACF9t9YB3A3HRcKHEYEZhLHKN9i3a5Cz";

    const aliceAccountAddress = keyring.addFromUri("//Alice");
    const bobAccountAddress = keyring.addFromUri("//Bob");

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

    const rawWasm = fs.readFileSync(
      "packages/cactus-plugin-ledger-connector-polkadot/src/test/rust/fixtures/ink!/publicBulletin/target/ink/public_bulletin.wasm",
    );

    const deploy = await plugin.deployContract({
      wasm: rawWasm,
      abi: abi,
      endowment: 10,
      gasLimit: 100,
      params: [0],
    } as DeployContractInkBytecodeRequest);

    t.ok(deploy);
    t.ok(deploy.success);

    const contractAbi = deploy.contractAbi;
    const writeParams = [0, "test-view", Array(32).fill(0)];
    const contract = new ContractPromise(
      plugin.api,
      contractAbi,
      CONTRACT_ADDR,
    );

    const infoForSigningWriteTransaction = await apiClient.getTransactionInfo({
      accountAddress: aliceAccountAddress,
      transactionExpiration: 50,
    } as TransactionInfoRequest);
    t.equal(infoForSigningWriteTransaction.status, 200);
    const txWriteResponse: TransactionInfoResponse =
      infoForSigningWriteTransaction.data;
    t.ok(txWriteResponse);
    const txWriteNonce = txWriteResponse.responseContainer.response_data
      .nonce as Index;
    t.ok(txWriteNonce);
    const txWriteBlockHash = txWriteResponse.responseContainer.response_data
      .blockHash as CodecHash;
    t.ok(txWriteBlockHash);
    const txWriteEra = txWriteResponse.responseContainer.response_data
      .era as ExtrinsicEra;
    t.ok(txWriteEra);

    const signingOptions: SignerOptions = {
      nonce: txWriteNonce,
      blockHash: txWriteBlockHash,
      era: txWriteEra,
    };

    const writeTransaction =
      contractAbi && contract
        ? contract.tx["publishView"](
            {
              gasLimit: 100,
              value: 0,
            },
            ...writeParams,
          )
        : null;

    const writeSignedTransaction = await writeTransaction?.signAsync(
      aliceAccountAddress,
      signingOptions,
    );

    t.comment(`Signed transaction is: ${writeSignedTransaction}`);

    t.ok(writeSignedTransaction);
    const writeSignature = writeSignedTransaction?.signature.toHex();

    if (writeSignature) {
      t.assert(plugin.isHex(writeSignature));
    }

    const write = await plugin.writeStorage({
      transferSubmittable: writeSignedTransaction,
    } as WriteStorageRequest);

    t.ok(write);
    t.ok(write.success);
    t.ok(write.hash);

    const infoForSigningReadTransaction = await apiClient.getTransactionInfo({
      accountAddress: bobAccountAddress,
      transactionExpiration: 50,
    } as TransactionInfoRequest);
    t.equal(infoForSigningReadTransaction.status, 200);
    const txReadResponse: TransactionInfoResponse =
      infoForSigningReadTransaction.data;
    t.ok(txReadResponse);
    const txReadNonce = txReadResponse.responseContainer.response_data
      .nonce as Index;
    t.ok(txReadNonce);
    const txReadBlockHash = txReadResponse.responseContainer.response_data
      .blockHash as CodecHash;
    t.ok(txReadBlockHash);
    const txReadEra = txReadResponse.responseContainer.response_data
      .era as ExtrinsicEra;
    t.ok(txReadEra);

    const readSigningOptions: SignerOptions = {
      nonce: txReadNonce,
      blockHash: txReadBlockHash,
      era: txReadEra,
    };

    const readParams = [0];

    const readTransaction =
      contractAbi && contract
        ? contract.tx["getCommitment"](
            {
              gasLimit: 100,
              value: 0,
            },
            ...readParams,
          )
        : null;

    t.ok(readTransaction?.toHuman);

    const readSignedTransaction = await readTransaction?.signAsync(
      bobAccountAddress,
      readSigningOptions,
    );

    t.comment(`Signed transaction is: ${readSignedTransaction}`);

    t.ok(readSignedTransaction);
    const readSignature = readSignedTransaction?.signature.toHex();

    if (readSignature) {
      t.assert(plugin.isHex(readSignature));
    }

    const result = await plugin.readStorage({
      transferSubmittable: readSignedTransaction,
    } as ReadStorageRequest);

    t.ok(result);
    t.ok(result.success);
    t.ok(result.hash);

    t.end();
  }
  
});
*/
