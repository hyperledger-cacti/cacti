import { v4 as uuidV4 } from "uuid";
import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { AuthorizationProtocol } from "@hyperledger/cactus-cmd-api-server";
import { IAuthorizationConfig } from "@hyperledger/cactus-cmd-api-server";
import { ConfigService } from "@hyperledger/cactus-cmd-api-server";

import * as publicApi from "../../../main/typescript/public-api";
import { ISupplyChainAppOptions } from "../../../main/typescript/public-api";
import { SupplyChainApp } from "../../../main/typescript/public-api";
import { Shipment } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

const testCase =
  "can launch via CLI with generated API server .config.json file";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

// FIXME: https://github.com/hyperledger/cactus/issues/1521
// Skipping until test can be stabilized.
test("Supply chain backend API calls can be executed", async (t: Test) => {
  t.ok(publicApi, "Public API of the package imported OK");

  const configService = new ConfigService();
  t.ok(configService, "Instantiated ConfigService truthy OK");

  const exampleConfig = await configService.newExampleConfig();
  t.ok(exampleConfig, "configService.newExampleConfig() truthy OK");

  // TODO: Investigate the explanation for this when we have more time, for
  // now I just hacked it so that it does not look for a .config file on the FS.
  // @see: https://github.com/hyperledger/cactus/issues/1516
  // FIXME: This was not necessary prior the Jest migration but now it is.
  // Investigate the explanation for this when we have more time, for now I just
  // overrode it so that it does not look for a .config file on the local FS.
  exampleConfig.configFile = "";

  // FIXME - this hack should not be necessary, we need to re-think how we
  // do configuration parsing. The convict library may not be the path forward.
  exampleConfig.authorizationConfigJson = JSON.stringify(
    exampleConfig.authorizationConfigJson,
  ) as unknown as IAuthorizationConfig;
  exampleConfig.authorizationProtocol = AuthorizationProtocol.NONE;

  const convictConfig =
    await configService.newExampleConfigConvict(exampleConfig);
  t.ok(convictConfig, "configService.newExampleConfigConvict() truthy OK");

  const env = await configService.newExampleConfigEnv(
    convictConfig.getProperties(),
  );

  const config = await configService.getOrCreate({ env });
  const apiSrvOpts = config.getProperties();
  const { logLevel } = apiSrvOpts;

  const appOptions: ISupplyChainAppOptions = {
    logLevel,
    disableSignalHandlers: true,
  };
  const app = new SupplyChainApp(appOptions);
  test.onFinish(async () => {
    await app.stop();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  // Node A => Besu
  // Node B => Xdai Besu
  // Node C => Fabric v2.5.6
  const startResult = await app.start();
  const { apiServerA, apiServerB, apiServerC } = startResult;
  t.ok(apiServerA, "ApiServerA truthy OK");
  t.ok(apiServerB, "ApiServerB truthy OK");
  t.ok(apiServerC, "ApiServerC truthy OK");

  const httpSrvApiA = apiServerA.getHttpServerApi();
  t.ok(httpSrvApiA, "httpSrvApiA truthy OK");
  const httpSrvApiB = apiServerB.getHttpServerApi();
  t.ok(httpSrvApiB, "httpSrvApiB truthy OK");
  const httpSrvApiC = apiServerC.getHttpServerApi();
  t.ok(httpSrvApiC, "httpSrvApiC truthy OK");

  t.true(httpSrvApiA.listening, "httpSrvApiA.listening true OK");
  t.true(httpSrvApiB.listening, "httpSrvApiB.listening true OK");
  t.true(httpSrvApiC.listening, "httpSrvApiC.listening true OK");

  const { besuApiClient, fabricApiClient, xdaiApiClient } = startResult;

  const metricsResB = await besuApiClient.getPrometheusMetricsV1();
  t.ok(metricsResB, "besu metrics res truthy OK");
  t.true(metricsResB.status > 199, "metricsResB.status > 199 true OK");
  t.true(metricsResB.status < 300, "metricsResB.status < 300 true OK");

  const metricsResF = await fabricApiClient.getPrometheusMetricsV1();
  t.ok(metricsResF, "fabric metrics res truthy OK");
  t.true(metricsResF.status > 199, "metricsResF.status > 199 true OK");
  t.true(metricsResF.status < 300, "metricsResF.status < 300 true OK");

  const metricsResQ = await xdaiApiClient.getPrometheusMetricsV1();
  t.ok(metricsResQ, "xdai besu metrics res truthy OK");
  t.true(metricsResQ.status > 199, "metricsResQ.status > 199 true OK");
  t.true(metricsResQ.status < 300, "metricsResQ.status < 300 true OK");

  const {
    supplyChainApiClientA,
    supplyChainApiClientB,
    supplyChainApiClientC,
  } = startResult;

  const listBambooHarvestRes =
    await supplyChainApiClientA.listBambooHarvestV1();
  t.ok(listBambooHarvestRes, "listBambooHarvestRes truthy OK");
  t.true(
    listBambooHarvestRes.status > 199,
    "listBambooHarvestRes status > 199 truthy OK",
  );
  t.true(
    listBambooHarvestRes.status < 300,
    "listBambooHarvestRes status < 300 truthy OK",
  );

  const listBookshelfRes = await supplyChainApiClientB.listBookshelfV1();
  t.ok(listBookshelfRes, "listBookshelfRes truthy OK");
  t.true(
    listBookshelfRes.status > 199,
    "listBookshelfRes status > 199 truthy OK",
  );
  t.true(
    listBookshelfRes.status < 300,
    "listBookshelfRes status < 300 truthy OK",
  );

  const listShipmentRes = await supplyChainApiClientC.listShipmentV1();
  t.ok(listShipmentRes, "listShipmentRes truthy OK");
  t.true(
    listShipmentRes.status > 199,
    "listShipmentRes status > 199 truthy OK",
  );
  t.true(
    listShipmentRes.status < 300,
    "listShipmentRes status < 300 truthy OK",
  );

  const shipment: Shipment = {
    bookshelfId: "some-id-of-a-bookshelf-" + uuidV4(),
    id: "some-id-of-a-shipment-" + uuidV4(),
  };

  const insertShipmentRes = await supplyChainApiClientC.insertShipmentV1({
    shipment,
  });
  t.ok(insertShipmentRes, "insertShipmentRes truthy OK");
  t.true(
    insertShipmentRes.status > 199,
    "insertShipmentRes status > 199 truthy OK",
  );
  t.true(
    insertShipmentRes.status < 300,
    "insertShipmentRes status < 300 truthy OK",
  );

  const listShipmentRes2 = await supplyChainApiClientC.listShipmentV1();
  t.ok(listShipmentRes2, "listShipmentRes2 truthy OK");
  t.true(
    listShipmentRes2.status > 199,
    "listShipmentRes2 status > 199 truthy OK",
  );
  t.true(
    listShipmentRes2.status < 300,
    "listShipmentRes2 status < 300 truthy OK",
  );

  const shipments = listShipmentRes2.data.data;
  const [firstShipment] = shipments;
  t.equal(shipment.id, firstShipment.id, "Inserted shipment matches IDs OK");

  t.end();
});
