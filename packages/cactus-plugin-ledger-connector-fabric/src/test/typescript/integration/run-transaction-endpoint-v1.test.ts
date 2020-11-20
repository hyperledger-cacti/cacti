import http from "http";
import { AddressInfo } from "net";

import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";

import bodyParser from "body-parser";
import express from "express";

import { FabricTestLedgerV1 } from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core-api";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  RunTransactionRequest,
  FabricContractInvocationType,
  DefaultEventHandlerStrategy,
} from "../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../main/typescript/plugin-ledger-connector-fabric";
import { DiscoveryOptions } from "fabric-network";

/**
 * Use this to debug issues with the fabric node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */

test("deploys contract from go source", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";

  const ledger = new FabricTestLedgerV1({
    publishAllPorts: true,
    logLevel,
  });

  await ledger.start();

  const tearDownLedger = async () => {
    await ledger.stop();
    await ledger.destroy();
  };
  test.onFinish(tearDownLedger);

  const [_, adminWallet] = await ledger.enrollAdmin();
  const [userIdentity] = await ledger.enrollUser(adminWallet);

  const connectionProfile = await ledger.getConnectionProfileOrg1();

  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user1";
  const keychainEntryValue = JSON.stringify(userIdentity);

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: keychainInstanceId,
    keychainId,
    logLevel,
    backend: new Map([
      [keychainEntryKey, keychainEntryValue],
      ["some-other-entry-key", "some-other-entry-value"],
    ]),
  });

  const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

  const discoveryOptions: DiscoveryOptions = {
    enabled: true,
    asLocalhost: true,
  };

  const pluginOptions: IPluginLedgerConnectorFabricOptions = {
    instanceId: uuidv4(),
    pluginRegistry,
    sshConfig,
    logLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NETWORKSCOPEALLFORTX,
    },
  };
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;
  const apiClient = new FabricApi({ basePath: apiHost });

  await plugin.installWebServices(expressApp);

  const carId = "CAR277";
  const carOwner = uuidv4();

  {
    const res = await apiClient.runTransactionV1({
      keychainId,
      keychainRef: keychainEntryKey,
      channelName: "mychannel",
      chainCodeId: "fabcar",
      invocationType: FabricContractInvocationType.CALL,
      functionName: "queryAllCars",
      functionArgs: [],
    } as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    const cars = JSON.parse(res.data.functionOutput);
  }

  {
    const req: RunTransactionRequest = {
      keychainId,
      keychainRef: keychainEntryKey,
      channelName: "mychannel",
      invocationType: FabricContractInvocationType.SEND,
      chainCodeId: "fabcar",
      functionName: "createCar",
      functionArgs: [carId, "Trabant", "601", "Blue", carOwner],
    };

    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
  }

  {
    const res = await apiClient.runTransactionV1({
      keychainId,
      keychainRef: keychainEntryKey,
      channelName: "mychannel",
      chainCodeId: "fabcar",
      invocationType: FabricContractInvocationType.CALL,
      functionName: "queryAllCars",
      functionArgs: [],
    } as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    const cars = JSON.parse(res.data.functionOutput);
    const car277 = cars.find((c: any) => c.Key === carId);
    t.ok(car277, "Located Car record by its ID OK");
    t.ok(car277.Record, `Car object has "Record" property OK`);
    t.ok(car277.Record.owner, `Car object has "Record"."owner" property OK`);
    t.equal(car277.Record.owner, carOwner, `Car has expected owner OK`);
  }

  t.end();
});
