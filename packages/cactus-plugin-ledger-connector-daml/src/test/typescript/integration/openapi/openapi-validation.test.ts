import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import { DamlTestLedger } from "@hyperledger/cactus-test-tooling";

import { PluginLedgerConnectorDAML } from "../../../../main/typescript/plugin-ledger-connector-daml";

import { DefaultApi } from "../../../../main/typescript/generated/openapi/typescript-axios/index";

import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Servers,
} from "@hyperledger/cactus-common";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
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

describe("OpenApi Validation Test", () => {
  const damlTestLedger = new DamlTestLedger({
    imageVersion: "2024-09-08T07-40-07-dev-2cc217b7a",
    imageName: "ghcr.io/hyperledger/cacti-daml-all-in-one",
    rpcApiHttpPort: 7575,
  });
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

  describe("OpenApi Validation Tests", () => {
    const cOk = "without bad request error";
    const testCase = "deploys DAML contracts from typescript source";
    const nullToken = "sending with empty token";
    const invalidParams = "sending invalid parameters";

    test(`${testCase} - getPartiesInvolved - ${cOk}`, async () => {
      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();

      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      expect(getPartiesInvolved).toBeTruthy();
      // expect(getPartiesInvolved.data).toBeTruthy();
      expect(getPartiesInvolved.status).toBe(200);
    });

    test(`${testCase} - getPartiesInvolved - ${nullToken}`, async () => {
      // negative testing for getpartiesInvolved
      //create a test scenario that will throw an error if there is an empty token
      const participantListBody = {
        participantToken: "",
      };
      await expect(
        apiClient.getPartiesInvolved(participantListBody),
      ).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    test(`${testCase} - queryRawContract - ${cOk}`, async () => {
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
      // create a function for jwt generator
      const getAliceToken: string =
        damlTestLedger.generateJwtToken(getTokenForAlice);

      const rawContractIOUBody = {
        participantToken: getAliceToken,
      };

      //get the sample IOU contract using Alice
      const queryRawIou = await apiClient.queryRawContract(rawContractIOUBody);
      expect(queryRawIou.status).toBe(200);
    });

    test(`${testCase} - queryRawContract - ${nullToken}`, async () => {
      // negative testing for queryRawContract
      const rawContractIOUBody = {
        participantToken: "",
      };

      await expect(
        apiClient.queryRawContract(rawContractIOUBody),
      ).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    test(`${testCase} - createIou - ${cOk}`, async () => {
      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
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
      expect(createIou.status).toBe(200);
    });

    test(`${testCase} - createIou - ${invalidParams}`, async () => {
      // negative testing for createIou

      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
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

      const iouBody = {
        wrongParticipantTokenParam: getAliceToken,
        templateId: `${getIouTemplate}`,
        payload: {
          issuer: `${getTokenForAlice}`,
          owner: `${getTokenForAlice}`,
          currency: "USD",
          amount: "999.99",
          wrongObserversParam: [],
        },
      };

      await expect(apiClient.createIou(iouBody)).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    test(`${testCase} - queryContract - ${cOk}`, async () => {
      // /*==================
      //   PREREQUISITES
      // ===================*/

      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
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
      expect(createIou.status).toBe(200);

      const stringifyIOUPayload = JSON.stringify(createIou.data);
      const responseForIOUResult = JSON.parse(stringifyIOUPayload);

      const ioutemplateid = responseForIOUResult.result.templateId;

      const queryIouAsBobBody = {
        templateIds: [`${ioutemplateid}`],
        query: { amount: 999.99 },
        readers: [`${getTokenForAlice}`],
        participantToken: getAliceToken,
      };

      const queryIou = await apiClient.queryContract(queryIouAsBobBody);
      expect(queryIou.status).toBe(200);
    });

    test(`${testCase} - queryContract - ${invalidParams}`, async () => {
      // negative testing for queryContract
      // /*==================
      //   PREREQUISITES
      // ===================*/

      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
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
      expect(createIou.status).toBe(200);

      const stringifyIOUPayload = JSON.stringify(createIou.data);
      const responseForIOUResult = JSON.parse(stringifyIOUPayload);

      const ioutemplateid = responseForIOUResult.result.templateId;

      const queryIouAsBobBody = {
        wrongTemplateIds: [`${ioutemplateid}`],
        query: { amount: 999.99 },
        readers: [`${getTokenForAlice}`],
        participantToken: getAliceToken,
      };

      await expect(
        apiClient.queryContract(queryIouAsBobBody),
      ).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    test(`${testCase} - exerciseChoice - ${cOk}`, async () => {
      // /*==================
      //   PREREQUISITES
      // ===================*/

      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
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

      const stringifyIOUPayload = JSON.stringify(createIou.data);
      const responseForIOUResult = JSON.parse(stringifyIOUPayload);

      const ioutemplateid = responseForIOUResult.result.templateId;
      const ioucontractId = responseForIOUResult.result.contractId;

      // /*==================
      //   STEP 2. Transfer IOU to BOB
      // ===================*/

      const getHashForBob: string = damlTestLedger.getIdentifierByDisplayName(
        parsePartyInvolved.result,
        "Bob",
      );

      const transferToBobBody = {
        participantToken: `${getAliceToken}`,
        templateId: `${ioutemplateid}`,
        contractId: `${ioucontractId}`,
        choice: `Iou_Transfer`,
        argument: {
          newOwner: `${getHashForBob}`,
        },
      };
      const exerciseIou = await apiClient.exerciseChoice(transferToBobBody);
      expect(exerciseIou.status).toBe(200);
    });

    test(`${testCase} - exerciseChoice - ${invalidParams}`, async () => {
      // negative testing for exerciseChoice
      // /*==================
      //   PREREQUISITES
      // ===================*/

      // this will create the initial token generated from the daml jwt from container
      const getDamlAuthorizationTokenVar =
        await damlTestLedger.getDamlAuthorizationToken();
      const participantListBody = {
        participantToken: getDamlAuthorizationTokenVar,
      };
      const getPartiesInvolved =
        await apiClient.getPartiesInvolved(participantListBody);
      const getPartiesInvolvedVar = JSON.stringify(getPartiesInvolved.data);
      const parsePartyInvolved = JSON.parse(getPartiesInvolvedVar);

      const getTokenForAlice: string =
        damlTestLedger.getIdentifierByDisplayName(
          parsePartyInvolved.result,
          "Alice",
        );
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

      const stringifyIOUPayload = JSON.stringify(createIou.data);
      const responseForIOUResult = JSON.parse(stringifyIOUPayload);

      const ioutemplateid = responseForIOUResult.result.templateId;
      const ioucontractId = responseForIOUResult.result.contractId;

      // /*==================
      //   STEP 2. Transfer IOU to BOB
      // ===================*/

      const getHashForBob: string = damlTestLedger.getIdentifierByDisplayName(
        parsePartyInvolved.result,
        "Bob",
      );

      const transferToBobBody = {
        participantToken: `${getAliceToken}`,
        wrongTemplateIdParam: `${ioutemplateid}`,
        wrongContractIdParam: `${ioucontractId}`,
        choice: `Iou_Transfer`,
        argument: {
          newOwner: `${getHashForBob}`,
        },
      };

      await expect(
        apiClient.exerciseChoice(transferToBobBody),
      ).rejects.toMatchObject({
        response: { status: 500 },
      });
    });
  });
});
