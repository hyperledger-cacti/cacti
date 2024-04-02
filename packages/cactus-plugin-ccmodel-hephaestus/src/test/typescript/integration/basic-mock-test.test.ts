import "jest-extended";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { IPluginCcModelHephaestusOptions } from "../../../main/typescript";
import { CcModelHephaestus } from "../../../main/typescript/plugin-ccmodel-hephaestus";
import { v4 as uuidv4 } from "uuid";
import {
  FabricContractInvocationType,
  RunTxReqWithTxId,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { ReplaySubject } from "rxjs";

const testCase = "simulate basic transaction without connectors";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "Hephaestus",
});

let fabricReplaySubject: ReplaySubject<RunTxReqWithTxId>;
let hephaestusOptions: IPluginCcModelHephaestusOptions;
let hephaestus: CcModelHephaestus;

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  fabricReplaySubject = new ReplaySubject();

  hephaestusOptions = {
    instanceId: uuidv4(),
    logLevel: logLevel,
    fabricTxObservable: fabricReplaySubject.asObservable(),
  };

  hephaestus = new CcModelHephaestus(hephaestusOptions);
});

test(testCase, async () => {
  hephaestus.setCaseId("basic-TEST");
  expect(hephaestus).toBeTruthy();
  log.info("hephaestus plugin is ok");

  expect(hephaestus.numberUnprocessedReceipts).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(0);

  const txSim1: RunTxReqWithTxId = {
    request: {
      signingCredential: {
        keychainId: "keychainId",
        keychainRef: "person 1",
      },
      channelName: "channelName",
      contractName: "contractName",
      invocationType: FabricContractInvocationType.Send,
      methodName: "methodName",
      params: ["0", "2"],
    },
    transactionId: "txID1",
    timestamp: new Date(),
  };
  fabricReplaySubject.next(txSim1);
  log.debug(txSim1);

  await new Promise((f) => setTimeout(f, 3000));

  // only monitoring the last 1000 miliseconds
  // txSim1 will not be monitored
  hephaestus.monitorTransactions(1000);

  const txSim2: RunTxReqWithTxId = {
    request: {
      signingCredential: {
        keychainId: "keychainId",
        keychainRef: "person 1",
      },
      channelName: "channelName",
      contractName: "contractName",
      invocationType: FabricContractInvocationType.Send,
      methodName: "methodName2",
      params: ["0", "2"],
    },
    transactionId: "txID1",
    timestamp: new Date(),
  };
  fabricReplaySubject.next(txSim2);
  log.debug(txSim2);

  expect(hephaestus.numberUnprocessedReceipts).toEqual(1);
  expect(hephaestus.numberEventsLog).toEqual(0);

  await hephaestus.txReceiptToCrossChainEventLogEntry();

  expect(hephaestus.numberUnprocessedReceipts).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(1);

  const logNameCsv = await hephaestus.persistCrossChainLogCsv(
    "example-dummy-basic-test",
  );
  expect(logNameCsv).toBeTruthy();

  const logNameJson = await hephaestus.persistCrossChainLogJson(
    "example-dummy-basic-test",
  );
  expect(logNameJson).toBeTruthy();
});

afterAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
