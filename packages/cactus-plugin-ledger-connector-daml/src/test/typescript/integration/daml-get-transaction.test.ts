import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import { DamlTestLedger } from "@hyperledger/cactus-test-tooling";

import { PluginLedgerConnectorDAML } from "../../../main/typescript/plugin-ledger-connector-daml";

import { DefaultApi } from "../../../main/typescript/generated/openapi/typescript-axios/index";

import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Servers,
} from "@hyperledger/cactus-common";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling"
import { Configuration } from "@hyperledger/cactus-core-api";
import http from "http";
import { AddressInfo } from "net";
import bodyParser from "body-parser";

import express from "express";
const logLevel: LogLevelDesc = "TRACE";
const testLogLevel: LogLevelDesc = "info";
// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "daml-get-transaction.test",
  level: testLogLevel,
});

describe("PluginLedgerConnectorDAML", () => {
  const damlTestLedger = new DamlTestLedger({
    imageVersion: "2024-09-08T07-40-07-dev-2cc217b7a",
    imageName: "ghcr.io/hyperledger/cacti-daml-all-in-one",
    rpcApiHttpPort: 7575,
  });1
  let apiClient: DefaultApi;
  const expressApp = express();
  const server = http.createServer(expressApp);

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    await damlTestLedger.start();
    expressApp.use(bodyParser.json({ limit: "250mb" }));

    const plugin = new PluginLedgerConnectorDAML({
      instanceId: uuidv4(),
      logLevel,
      apiUrl: "http://localhost:7575/v1",
    });

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    const config = new Configuration({ basePath: apiHost });

    await plugin.registerWebServices(expressApp);

    apiClient = new DefaultApi(config);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");
    if (damlTestLedger) {
      log.info("Stop the DAML ledger...");
      await damlTestLedger.stop();
      await damlTestLedger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  describe("DAML Simple IOU Transaction", () => {
    it("DAML Simple IOU Transaction", async () => {
      // /*==================
      //   PREREQUISITES
      // ===================*/

      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved = await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(parsePartyInvolved.result, "Alice");
      // create a function for jwt generator
      const getAliceToken: string =
        damlTestLedger.generateJwtToken(getTokenForAlice);

      const rawContractIOUBody = {
        participantToken: getAliceToken,
      };

      //get the sample IOU contract using Alice
      const queryRawIou = await apiClient.queryRawContract(rawContractIOUBody);
      const rawStringifyIOUPayload = JSON.stringify(queryRawIou.data);
      const rawResponseForIOUResult = JSON.parse(rawStringifyIOUPayload);

      const getIouTemplate = rawResponseForIOUResult.result[0].templateId;

      /*==================
      STEP 1. Create IOU
    ===================*/
      const iouBody = {
        participantToken: getAliceToken,
        templateId: `${getIouTemplate}`,
        payload: {
          issuer: `${getTokenForAlice}`,
          owner: `${getTokenForAlice}`,
          currency: "USD",
          amount: "999.99",
          observers: [],
        },
      };
      const createIou = await apiClient.createIou(iouBody);

      log.info("STEP 1. Create IOU as Alice result:");
      log.info(createIou);

      let stringifyIOUPayload = JSON.stringify(createIou.data);
      let responseForIOUResult = JSON.parse(stringifyIOUPayload);

      let ioutemplateid = responseForIOUResult.result.templateId;
      let ioucontractId = responseForIOUResult.result.contractId;

      // /*==================
      //   STEP 2. Transfer IOU to BOB
      // ===================*/

      const getHashForBob: string = damlTestLedger.getIdentifierByDisplayName(
        parsePartyInvolved.result,
        "Bob",
      );
      const getBobToken: string =
        damlTestLedger.generateJwtToken(getHashForBob);

      const transferToBobBody = {
        participantToken: `${getAliceToken}`,
        templateId: `${ioutemplateid}`,
        contractId: `${ioucontractId}`,
        choice: `Iou_Transfer`,
        argument: {
          newOwner: `${getHashForBob}`,
        },
      };

      let exerciseIou = await apiClient.exerciseChoice(transferToBobBody);

      log.info("STEP 2. Transfer IOU to BOB result:");
      log.info(exerciseIou);

      stringifyIOUPayload = JSON.stringify(exerciseIou.data);
      responseForIOUResult = JSON.parse(stringifyIOUPayload);
      let payloadResult = responseForIOUResult.result.events[1].created;

      ioutemplateid = payloadResult.templateId;
      ioucontractId = payloadResult.contractId;

      // /*==================
      //   STEP 3. Accept Transfer of IOU as BOB
      // ===================*/

      const acceptBody = {
        participantToken: `${getBobToken}`,
        templateId: `${ioutemplateid}`,
        contractId: `${ioucontractId}`,
        choice: `IouTransfer_Accept`,
        argument: {
          newOwner: `${getBobToken}`,
        },
      };
      exerciseIou = await apiClient.exerciseChoice(acceptBody);

      stringifyIOUPayload = JSON.stringify(exerciseIou.data);
      responseForIOUResult = JSON.parse(stringifyIOUPayload);

      log.info("STEP 3. Accept Transfer of IOU as BOB result:");
      log.info(responseForIOUResult);

      payloadResult = responseForIOUResult.result.events[1].created;

      ioutemplateid = payloadResult.templateId;
      ioucontractId = payloadResult.contractId;
      // /*==================
      //   STEP 4. Check if transfer is successful by querying as BOB
      // ===================*/

      const queryIouAsBobBody = {
        templateIds: [`${ioutemplateid}`],
        query: { amount: 999.99 },
        readers: [`${getHashForBob}`],
        participantToken: getBobToken,
      };

      const queryIou = await apiClient.queryContract(queryIouAsBobBody);
      stringifyIOUPayload = JSON.stringify(queryIou.data);
      responseForIOUResult = JSON.parse(stringifyIOUPayload);

      log.info(
        "STEP 4. For final check, query as BOB to check if IOU has been transferred succesfully",
      );
      log.info(responseForIOUResult);
    });
  });
});
